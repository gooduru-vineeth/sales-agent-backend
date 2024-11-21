import { Session } from '../types/customer';
import { NodeService } from './NodeService';
import { AIService } from './AIService';
import CustomerModel from '../models/Customer';

export class ConversationManager {
  private nodeService: NodeService;
  private aiService: AIService;

  constructor() {
    this.nodeService = new NodeService();
    this.aiService = new AIService();
  }

  async handleMessage(session: Session, message: string): Promise<{
    response: string;
    updatedSession: Session;
  }> {
    const currentNode = this.nodeService.getNode(session.current_node_id);
    
    if (!currentNode) {
      throw new Error('Invalid node');
    }

    const analysis = await this.aiService.analyzeInput(
      message,
      session.conversation_history,
      session.context,
      currentNode.listOfNextPossibleNodes
    );

    // Update session
    const updatedSession: Session = {
      ...session,
      context: { ...session.context, ...analysis.userInputs },
      current_node_id: analysis.nextNodeId,
      conversation_history: [...session.conversation_history, `User: ${message}`, `AI: ${analysis.suggestedResponse}`]
    };

    // Save customer if we have enough information
    await this.saveCustomerIfComplete(updatedSession);

    return {
      response: analysis.suggestedResponse,
      updatedSession
    };
  }

  private async saveCustomerIfComplete(session: Session): Promise<void> {
    const { name, email, product_choice } = session.context;
    
    if (name && email && product_choice) {
      await CustomerModel.findOneAndUpdate(
        { email },
        {
          name,
          email,
          product_choice,
          conversation_history: [{
            timestamp: new Date().toISOString(),
            context: session.context
          }]
        },
        { upsert: true }
      );
    }
  }
} 