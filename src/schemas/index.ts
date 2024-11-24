import { z } from 'zod';

// Schema for input analysis
export const analysisSchema = z.object({
  nextNodeId: z
    .string()
    .describe('The next node id from the possible next nodes list'),
  userInputs: z
    .record(z.string())
    .describe('Any identified user inputs from the user input'),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe('Confidence score between 0 and 1'),
  suggestedResponse: z.string().describe('Suggested response to the user'),
});

// Schema for demo scheduling
export const demoToolSchema = {
  name: 'schedule_demo',
  description: 'Schedule a demo with the customer',
  parameters: {
    type: 'object',
    properties: {
      name: { type: 'string', description: "Customer's name" },
      email: { type: 'string', description: "Customer's email" },
      productInterest: {
        type: 'array',
        items: { type: 'string' },
        description: 'Products user is interested in or has asked about',
      },
      date: {
        type: 'string',
        description:
          'It should be in the format of DD-MM-YYYY HH:MM:SS, if no date is mentioned schedule tomorrow',
      },
    },
    required: ['name', 'email', 'productInterest', 'date'],
  },
};
