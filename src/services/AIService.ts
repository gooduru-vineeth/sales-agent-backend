import { InputAnalysis } from '../types/analysis';
import { AIProvider } from '../types/ai-provider';
import { logger } from '../utils/logger';
import { TogetherAIProvider } from '../providers/together/index';
import { Session } from '../types/customer';

// Private state
let provider: AIProvider | null = null;

// Initialize provider function
export const initializeProvider = (): void => {
  provider = new TogetherAIProvider(process.env.TOGETHER_API_KEY!);
};

// Extract basic user inputs function
export const extractBasicUserInputs = (
  message: string
): Record<string, any> => {
  const inputs: Record<string, any> = {};
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const emailMatch = message.match(emailRegex);

  if (emailMatch) {
    inputs.email = emailMatch[0];
  } else if (message.trim().length > 0) {
    inputs.name = message.trim();
  }

  return inputs;
};

// Main service functions
export const analyzeInput = async (
  currentMessage: string,
  history: string[],
  context: Record<string, any>,
  nextPossibleNodes: string[]
): Promise<InputAnalysis> => {
  logger.info('analyzeInput called with:', {
    currentMessage,
    history,
    context,
    nextPossibleNodes,
  });

  try {
    if (!provider) {
      initializeProvider();
    }
    return await provider!.analyzeInput(
      currentMessage,
      history,
      context,
      nextPossibleNodes
    );
  } catch (error) {
    logger.error('Error analyzing input', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      nextNodeId: nextPossibleNodes[0],
      userInputs: extractBasicUserInputs(currentMessage),
      confidence: 0.5,
      suggestedResponse:
        'I apologize, but I encountered an issue. How can I help you?',
    };
  }
};

export const scheduleDemo = async (
  input: string,
  history: string[],
  context: Record<string, any>,
  session: Session
): Promise<string> => {
  try {
    if (!provider) {
      initializeProvider();
    }
    return await provider!.scheduleDemo(input, history, context, session);
  } catch (error) {
    logger.error('Error scheduling demo', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw new Error(
      'I apologize, but I encountered an issue scheduling the demo.'
    );
  }
};

export const getProductDetails = async (
  question: string,
  history: string[],
  context: Record<string, any>
): Promise<string> => {
  try {
    if (!provider) {
      initializeProvider();
    }
    return await provider!.getProductDetails(question, history, context);
  } catch (error) {
    logger.error('Error getting product details', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw new Error(
      'I apologize, but I encountered an issue retrieving product details.'
    );
  }
};
