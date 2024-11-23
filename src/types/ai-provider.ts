import { InputAnalysis } from './analysis';
import { Session } from './customer';
export interface AIProvider {
  analyzeInput(
    currentMessage: string,
    history: string[],
    context: Record<string, any>,
    nextPossibleNodes: string[]
  ): Promise<InputAnalysis>;

  getProductDetails(
    question: string,
    history: string[],
    context: Record<string, any>
  ): Promise<string>;

  scheduleDemo(
    input: string,
    history: string[],
    context: Record<string, any>,
    session: Session
  ): Promise<string>;
}
