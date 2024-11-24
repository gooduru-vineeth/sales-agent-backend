import { Session } from '../../types/customer';
import * as EventRepository from '../../repositories/Event';
import * as CustomerRepository from '../../repositories/Customer';
import config from '../../config/index';
import { logger } from '../../utils/logger';
import { BaseTogetherProvider, ChatOptions } from './base';
import { demo } from '../../prompts';
import { demoToolSchema } from '../../schemas';

export class DemoService extends BaseTogetherProvider {
  async scheduleDemo(
    input: string,
    history: string[],
    context: Record<string, any>,
    session: Session
  ): Promise<string> {
    try {
      const functionCall = await this.functionCall(
        demo.getSystemPrompt(demoToolSchema),
        demo.getUserPrompt(context, history, input),
        {},
        [
          {
            type: 'function',
            function: demoToolSchema,
          },
        ]
      );

      if (!functionCall) {
        throw new Error('No function call response from Together AI');
      }

      const { functionName, arguments: args } =
        this.parseToolResponse(functionCall);

      if (functionName === 'schedule_demo') {
        await this.handleDemoScheduling(args, session);
        return `Demo scheduled successfully for ${args.name} (${args.email}) on ${args.date}`;
      }

      throw new Error('Failed to schedule demo - invalid function call');
    } catch (error) {
      logger.error('Error scheduling demo', { error });
      throw error;
    }
  }

  private async handleDemoScheduling(
    args: any,
    session: Session
  ): Promise<void> {
    await Promise.all([
      EventRepository.createEvent({
        sessionId: session.sessionId,
        name: config.eventTypes.scheduleDemo,
        data: args,
        metadata: {
          history: session.conversationHistory,
          currentNodeId: session.currentNodeId,
        },
      }),
      CustomerRepository.updateCustomer(session.sessionId, args),
    ]);
    logger.info('Demo scheduled successfully', { args });
  }
}
