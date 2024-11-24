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
    return this.nodeService.getNode('welcome');
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
      throw new Error('Invalid node');
    }
    logger.info('session before processing user input', {
      sessionId: currentSession.sessionId,
      session: currentSession,
      currentNode: currentNode,
    });
    // Process input through AI service
    const analysis = await AIService.analyzeInput(
      userInput,
      currentSession.conversationHistory,
      currentSession.context,
      currentNode.listOfNextPossibleNodes
    );
    logger.info('Analysis from AI service', { analysis });

    // Update session with new context and node
    const updatedSession = {
      ...currentSession,
      context: { ...currentSession.context, ...analysis.userInputs },
      currentNodeId: analysis.nextNodeId,
      conversationHistory: [
        ...currentSession.conversationHistory,
        `User: ${userInput}`,
        `AI: ${analysis.suggestedResponse ?? ''}`,
      ],
    };
    logger.info('Updated session after processing user input', {
      sessionId: updatedSession.sessionId,
      currentNode: updatedSession.currentNodeId,
      updatedSession,
    });

    let messageToUser = analysis.suggestedResponse;
    const updatedNode = this.nodeService.getNode(updatedSession.currentNodeId);
    // Handle custom node functions if present
    if (updatedNode?.customHandlerFunction) {
      try {
        logger.info('Executing custom node function', {
          functionName: updatedNode.customHandlerFunction.name,
        });
        const result = await updatedNode.customHandlerFunction(
          userInput,
          updatedSession.conversationHistory,
          updatedSession.context,
          updatedSession
        );
        logger.info('Custom node function executed successfully', {
          result,
        });
        if (updatedNode.consumeNodeResponse) {
          messageToUser = result;
        } else {
          messageToUser = analysis.suggestedResponse || result;
        }
      } catch (error) {
        logger.error('Error executing custom node function', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        messageToUser =
          "I'm sorry, I encountered an issue. Could you please try again?";
      }
    }

    return {
      messageToUser,
      updatedSession,
    };
  }

  private async saveCustomerIfComplete(session: Session): Promise<void> {
    const { name, email } = session.context;

    if (name && email) {
      try {
        const customer = await CustomerRepository.saveCustomer({
          sessionId: session.sessionId,
          name,
          email,
          productInterest: session?.context?.productInterest,
        });
        logger.info('Customer information saved', {
          sessionId: session.sessionId,
          customer,
        });
      } catch (error) {
        logger.error('Error saving customer information', {
          sessionId: session.sessionId,
          email,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      }
    } else {
      logger.debug('Skipping customer save - incomplete information', {
        sessionId: session.sessionId,
        hasName: !!name,
        hasEmail: !!email,
      });
    }
  }

  async handleMessage(userInput: string, session: Session) {
    const { messageToUser, updatedSession } = await this.processUserInput(
      userInput,
      session
    );

    Promise.all([
      MessageRepository.createMessage({
        sessionId: updatedSession.sessionId,
        message: userInput,
        type: MessageType.USER,
      }),
      MessageRepository.createMessage({
        sessionId: updatedSession.sessionId,
        message: messageToUser,
        type: MessageType.AI,
      }),
      this.saveCustomerIfComplete(updatedSession),
    ]);

    return {
      response: messageToUser,
      updatedSession: updatedSession,
    };
  }
}
