import { Session } from '../types/customer';
import { NodeService } from './NodeService';
import { logger } from '../utils/logger';
import * as AIService from './AIService';
import * as MessageRepository from '../repositories/Message';
import * as CustomerRepository from '../repositories/Customer';
import { MessageType } from '../types/message';

export class ConversationManager {
  private nodeService: NodeService;

  constructor() {
    this.nodeService = new NodeService();
    logger.info('ConversationManager initialized');
  }

  async getWelcomeNode() {
    logger.debug('Fetching welcome node');
    return this.nodeService.getNode('welcome');
  }

  private async analyzeUserInput(
    userInput: string,
    session: Session,
    currentNode: any
  ) {
    logger.info('Analyzing user input', {
      sessionId: session.sessionId,
      currentNodeId: session.currentNodeId,
    });

    const analysis = await AIService.analyzeInput(
      userInput,
      session.conversationHistory,
      session.context,
      currentNode.listOfNextPossibleNodes
    );

    logger.info('AI analysis complete', {
      sessionId: session.sessionId,
      nextNodeId: analysis.nextNodeId,
    });

    return analysis;
  }

  private updateSessionWithAnalysis(
    session: Session,
    userInput: string,
    analysis: any
  ): Session {
    const updatedSession = {
      ...session,
      context: { ...session.context, ...analysis.userInputs },
      currentNodeId: analysis.nextNodeId,
      conversationHistory: [
        ...session.conversationHistory,
        `User: ${userInput}`,
        `AI: ${analysis.suggestedResponse ?? ''}`,
      ],
    };

    logger.info('Session updated with analysis', {
      sessionId: updatedSession.sessionId,
      currentNodeId: updatedSession.currentNodeId,
    });

    return updatedSession;
  }

  private async executeCustomNodeHandler(
    node: any,
    userInput: string,
    session: Session
  ): Promise<string> {
    if (!node?.customHandlerFunction) {
      return '';
    }

    try {
      logger.info('Executing custom node handler', {
        sessionId: session.sessionId,
        nodeId: node.id,
        handlerName: node.customHandlerFunction.name,
      });

      const result = await node.customHandlerFunction(
        userInput,
        session.conversationHistory,
        session.context,
        session
      );

      logger.info('Custom handler executed successfully', {
        sessionId: session.sessionId,
        nodeId: node.id,
      });

      return result;
    } catch (error) {
      logger.error('Custom handler execution failed', {
        sessionId: session.sessionId,
        nodeId: node.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  private async saveMessages(
    sessionId: string,
    userInput: string,
    aiResponse: string
  ) {
    logger.debug('Saving conversation messages', { sessionId });
    //  not using Promise.all because we want to save the messages in order
    await MessageRepository.createMessage({
      sessionId,
      message: userInput,
      type: MessageType.USER,
    });

    await MessageRepository.createMessage({
      sessionId,
      message: aiResponse,
      type: MessageType.AI,
    });

    logger.debug('Messages saved successfully', { sessionId });
  }

  async processUserInput(
    userInput: string,
    currentSession: Session
  ): Promise<{
    messageToUser: string;
    updatedSession: Session;
  }> {
    const currentNode = this.nodeService.getNode(currentSession.currentNodeId);

    if (!currentNode) {
      logger.error('Invalid node', {
        sessionId: currentSession.sessionId,
        nodeId: currentSession.currentNodeId,
      });
      throw new Error('Invalid node');
    }

    const analysis = await this.analyzeUserInput(
      userInput,
      currentSession,
      currentNode
    );

    const updatedSession = this.updateSessionWithAnalysis(
      currentSession,
      userInput,
      analysis
    );

    const updatedNode = this.nodeService.getNode(updatedSession.currentNodeId);
    let messageToUser = analysis.suggestedResponse;

    try {
      if (updatedNode?.customHandlerFunction) {
        const customResult = await this.executeCustomNodeHandler(
          updatedNode,
          userInput,
          updatedSession
        );

        messageToUser = updatedNode.consumeNodeResponse
          ? customResult
          : analysis.suggestedResponse || customResult;
      }
    } catch (error) {
      messageToUser =
        "I'm sorry, I encountered an issue. Could you please try again?";
    }

    return {
      messageToUser,
      updatedSession,
    };
  }

  private async saveCustomerIfComplete(session: Session): Promise<void> {
    const { name, email, productInterest } = session.context;

    if (!name || !email) {
      logger.debug('Skipping customer save - incomplete information', {
        sessionId: session.sessionId,
        hasName: !!name,
        hasEmail: !!email,
      });
      return;
    }

    try {
      const customer = await CustomerRepository.saveCustomer({
        sessionId: session.sessionId,
        name,
        email,
        productInterest,
      });

      logger.info('Customer information saved successfully', {
        sessionId: session.sessionId,
        customerId: customer?.name,
        email: customer?.email,
        productInterest: customer?.productInterest,
      });
    } catch (error) {
      logger.error('Failed to save customer information', {
        sessionId: session.sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async handleMessage(userInput: string, session: Session) {
    logger.info('Processing new message', {
      sessionId: session.sessionId,
      currentNodeId: session.currentNodeId,
    });

    const { messageToUser, updatedSession } = await this.processUserInput(
      userInput,
      session
    );

    await Promise.all([
      this.saveMessages(session.sessionId, userInput, messageToUser),
      this.saveCustomerIfComplete(updatedSession),
    ]);

    logger.info('Message handling complete', {
      sessionId: session.sessionId,
      currentNodeId: updatedSession.currentNodeId,
    });

    return {
      response: messageToUser,
      updatedSession: updatedSession,
    };
  }
}
