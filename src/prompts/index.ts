export interface PromptTemplate {
  systemPrompt: string | ((schema: any) => string);
  userPrompt: string | ((...args: any[]) => string);
}

// Generic prompt templates
export const ANALYSIS_PROMPT: PromptTemplate = {
  systemPrompt:
    'You are a sales assistant. Analyze user input and determine next steps. Only respond in JSON format.',
  userPrompt: (
    currentMessage: string,
    history: string[],
    context: Record<string, any>,
    nodes: any[]
  ): string => `
    Analyze the following user input and determine the next node. if the required fields are not met, add follow up questions to the user.
    user details: ${JSON.stringify(context)}
    
    User Input: ${currentMessage}
    History: ${history.join('\n')}
    Possible next nodes: ${JSON.stringify(nodes)}
  `,
};

export const DEMO_PROMPT: PromptTemplate = {
  systemPrompt: (schema: any): string => `
    You have access to the following function:
    Use the function '${schema.name}' to '${schema.description}':
    ${JSON.stringify(schema)}
    Schedule a demo for tomorrow using the context provided. Format the date as YYYY-MM-DDTHH:MM:SS.
    If you choose to call a function ONLY reply in the following format with no prefix or suffix:
    <function=example_function_name>{"example_name": "example_value"}</function>
  `,
  userPrompt: (context: any, history: string[], input: string): string => `
    Schedule a demo for customer with context: ${JSON.stringify(context)}
    history: ${history.join('\n')}
    user input: ${input}
  `,
};

export const PRODUCT_DETAILS_PROMPT: PromptTemplate = {
  systemPrompt:
    "You are an AWS product expert. Using ONLY the provided AWS product information, answer the customer's question. " +
    "If the information is not in the provided context, acknowledge that you don't have that specific information. " +
    'Keep responses focused and technical.',
  userPrompt: (relevantProductInfo: string, question: string): string => `
    Retrieved AWS Product Information:
    ${relevantProductInfo}
    Customer Question: ${question}
    Provide a clear and technical response based solely on the retrieved product information above.
  `,
};

export class Prompt {
  constructor(private template: PromptTemplate) {}

  getSystemPrompt(schema?: any): string {
    return typeof this.template.systemPrompt === 'function'
      ? this.template.systemPrompt(schema)
      : this.template.systemPrompt;
  }

  getUserPrompt(...args: any[]): string {
    return typeof this.template.userPrompt === 'function'
      ? this.template.userPrompt(...args)
      : this.template.userPrompt;
  }
}

// Example usage:
export const analysis = new Prompt(ANALYSIS_PROMPT);
export const demo = new Prompt(DEMO_PROMPT);
export const productDetails = new Prompt(PRODUCT_DETAILS_PROMPT);
