export interface InputAnalysis {
  nextNodeId: string;
  userInputs: Record<string, any>;
  confidence: number;
  suggestedResponse: string;
}
