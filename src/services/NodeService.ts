import { logger } from '../utils/logger';
import * as AIService from './AIService';
import { Session } from '../types/customer';

export class Node {
  constructor(
    public id: string,
    public description: string,
    public promptTemplate: string,
    public requiredFields: string[],
    public listOfNextPossibleNodes: string[],
    public consumeNodeResponse: boolean = false,
    public customHandlerFunction?: (
      input: string,
      history: string[],
      context: Record<string, any>,
      session: Session
    ) => Promise<string>
  ) {}

  getProcessedPromptTemplate(context: Record<string, any>): string {
    try {
      return this.promptTemplate.replace(
        /\${(\w+)}/g,
        (match, key) => context[key] || match
      );
    } catch (error) {
      logger.error('Error processing prompt template', { error });
      return this.promptTemplate;
    }
  }
}

export class NodeService {
  private nodes: Map<string, Node> = new Map();

  constructor() {
    this.initializeNodes();
  }

  private createBasicNode(
    id: string,
    description: string,
    prompt: string,
    required: string[],
    nextNodes: string[]
  ): Node {
    return new Node(id, description, prompt, required, nextNodes);
  }

  private createCustomNode(
    id: string,
    description: string,
    prompt: string,
    required: string[],
    nextNodes: string[],
    consumeNodeResponse: boolean = false,
    handler: (
      input: string,
      history: string[],
      context: Record<string, any>,
      session: Session
    ) => Promise<string>
  ): Node {
    return new Node(
      id,
      description,
      prompt,
      required,
      nextNodes,
      consumeNodeResponse,
      handler
    );
  }

  private initializeNodes(): void {
    const nodes = new Map<string, Node>();

    nodes.set(
      'welcome',
      this.createBasicNode(
        'welcome',
        'Welcome message',
        "Hello! I'm your sales assistant. May I know your name?",
        [],
        [
          'collect_email',
          'get_products',
          'question_and_answer_node_for_product_details',
        ]
      )
    );

    nodes.set(
      'collect_name',
      this.createBasicNode(
        'collect_name',
        'Collect name from user',
        "Nice to meet you, ${name}! What's your email address?",
        [],
        [
          'collect_email',
          'get_products',
          'question_and_answer_node_for_product_details',
        ]
      )
    );

    nodes.set(
      'collect_email',
      this.createBasicNode(
        'collect_email',
        'Collect email from user',
        "Nice to meet you, ${name}! What's your email address?",
        ['name'],
        ['get_products']
      )
    );

    nodes.set(
      'get_products',
      this.createBasicNode(
        'get_products',
        'Get product details from user',
        `
        What product are you interested in? We offer: 
        1. Amazon EC2 (Elastic Compute Cloud)
        2. Amazon S3 (Simple Storage Service)
        3. Amazon RDS (Relational Database Service)
        4. Amazon DynamoDB
        5. Amazon Lambda (Function as a Service)
        `,
        ['name', 'email'],
        ['question_and_answer_node_for_product_details', 'schedule_demo']
      )
    );

    nodes.set(
      'question_and_answer_node_for_product_details',
      this.createCustomNode(
        'question_and_answer_node_for_product_details',
        'Answers any questions about the product, using RAG',
        '',
        ['name', 'email'],
        [
          'schedule_demo',
          'end_conversation',
          'question_and_answer_node_for_product_details',
        ],
        true,
        AIService.getProductDetails
      )
    );

    nodes.set(
      'schedule_demo',
      this.createCustomNode(
        'schedule_demo',
        'Schedule a demo with the user',
        "success example:  I've scheduled a demo for you on {date} at {time}. I'll send you a confirmation email to {email} shortly for the same. \n" +
          'failure example: Please provide your name and email so I can schedule the demo.',
        ['name', 'email'],
        [
          'end_conversation',
          'question_and_answer_node_for_product_details',
          'collect_name',
          'collect_email',
        ],
        false,
        AIService.scheduleDemo
      )
    );

    nodes.set(
      'end_conversation',
      this.createBasicNode(
        'end_conversation',
        'End the conversation',
        'Thank you for using our service. Have a great day!',
        [],
        []
      )
    );

    this.nodes = nodes;
  }

  getNode(nodeId: string): Node | undefined {
    return this.nodes.get(nodeId);
  }

  getNodes(): Map<string, Node> {
    return this.nodes;
  }
}
