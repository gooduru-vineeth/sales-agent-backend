import { Session } from "../types/customer";
import { Node, NodeService } from "./NodeService";
import CustomerModel from "../models/Customer";
import { logger } from "../utils/logger";
import * as AIService from "./AIService";
export class ConversationManager {
  private nodeService: NodeService;
  private currentSession!: Session;

  constructor() {
    this.nodeService = new NodeService();
    this.initializeSession();
    logger.info("ConversationManager initialized");
  }

  private initializeSession() {
    this.currentSession = {
      session_id: crypto.randomUUID(),
      context: {},
      current_node_id: "welcome",
      conversation_history: [],
    };
  }
  async getWelcomeNode() {
    return this.nodeService.getNode("welcome");
  }
  async processUserInput(
    userInput: string,
    currentSession: Session
  ): Promise<{
    messageToUser: string;
    updatedSession: Session;
  }> {
    const currentNode = this.nodeService.getNode(
      currentSession.current_node_id
    );

    if (!currentNode) {
      throw new Error("Invalid node");
    }
    logger.info("session before processing user input", {
      sessionId: currentSession.session_id,
      session: currentSession,
      currentNode: currentNode,
    });
    // Process input through AI service
    const analysis = await AIService.analyzeInput(
      userInput,
      currentSession.conversation_history,
      currentSession.context,
      currentNode.listOfNextPossibleNodes
    );
    logger.info("Analysis from AI service", { analysis });

    // Update session with new context and node
    const updatedSession = {
      ...currentSession,
      context: { ...currentSession.context, ...analysis.userInputs },
      current_node_id: analysis.nextNodeId,
      conversation_history: [
        ...currentSession.conversation_history,
        `User: ${userInput}`,
        `AI: ${analysis.suggestedResponse}`,
      ],
    };
    logger.info("Updated session after processing user input", {
      sessionId: updatedSession.session_id,
      currentNode: updatedSession.current_node_id,
      updatedSession,
    });

    let messageToUser = analysis.suggestedResponse;
    const updatedNode = this.nodeService.getNode(
      updatedSession.current_node_id
    );
    // Handle custom node functions if present
    if (updatedNode?.customHandlerFunction) {
      try {
        logger.info("Executing custom node function", {
          functionName: updatedNode.customHandlerFunction.name,
        });
        const result = await updatedNode.customHandlerFunction(
          userInput,
          updatedSession.conversation_history,
          updatedSession.context
        );
        logger.info("Custom node function executed successfully", {
          result,
        });
        messageToUser = analysis.suggestedResponse || result;
      } catch (error) {
        logger.error("Error executing custom node function", {
          error: error instanceof Error ? error.message : "Unknown error",
        });
        messageToUser =
          "I'm sorry, I encountered an issue. Could you please try again?";
      }
    }

    // Try to save customer if we have all required info
    await this.saveCustomerIfComplete(currentSession);

    return {
      messageToUser,
      updatedSession,
    };
  }

  private async saveCustomerIfComplete(session: Session): Promise<void> {
    const { name, email, product_choice } = session.context;

    if (name && email && product_choice) {
      try {
        await CustomerModel.findOneAndUpdate(
          { email },
          {
            name,
            email,
            product_choice,
            conversation_history: [
              {
                timestamp: new Date().toISOString(),
                context: session.context,
              },
            ],
          },
          { upsert: true }
        );
        logger.info("Customer information saved", {
          sessionId: session.session_id,
          email,
        });
      } catch (error) {
        logger.error("Error saving customer information", {
          sessionId: session.session_id,
          email,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        throw error;
      }
    } else {
      logger.debug("Skipping customer save - incomplete information", {
        sessionId: session.session_id,
        hasName: !!name,
        hasEmail: !!email,
        hasProductChoice: !!product_choice,
      });
    }
  }

  async handleMessage(userInput: string, session: Session) {
    const { messageToUser, updatedSession } = await this.processUserInput(
      userInput,
      session
    );

    return {
      response: messageToUser,
      updatedSession: updatedSession,
    };
  }
}
