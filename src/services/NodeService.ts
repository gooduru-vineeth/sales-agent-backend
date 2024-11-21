import { v4 as uuidv4 } from 'uuid';

export interface Node {
  id: string;
  description: string;
  promptTemplate: string;
  requiredFields: string[];
  listOfNextPossibleNodes: string[];
  customHandlerFunction?: (input: string, history: string[], context: Record<string, any>) => Promise<string>;
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
    return {
      id,
      description,
      promptTemplate: prompt,
      requiredFields: required,
      listOfNextPossibleNodes: nextNodes
    };
  }

  private createCustomNode(
    id: string,
    description: string,
    prompt: string,
    required: string[],
    nextNodes: string[],
    handler: (input: string, history: string[], context: Record<string, any>) => Promise<string>
  ): Node {
    return {
      id,
      description,
      promptTemplate: prompt,
      requiredFields: required,
      listOfNextPossibleNodes: nextNodes,
      customHandlerFunction: handler
    };
  }

  private initializeNodes(): void {
    const nodes = new Map<string, Node>();

    nodes.set('welcome', this.createBasicNode(
      'welcome',
      'Welcome message',
      'Hello! I\'m your sales assistant. May I know your name?',
      [],
      ['collect_email', 'get_products', 'question_and_answer_node_for_product_details']
    ));

    nodes.set('collect_name', this.createBasicNode(
      'collect_name',
      'Collect name from user',
      'Nice to meet you, {name}! What\'s your email address?',
      [],
      ['collect_email', 'get_products', 'question_and_answer_node_for_product_details']
    ));

    // Add other nodes...

    this.nodes = nodes;
  }

  getNode(nodeId: string): Node | undefined {
    return this.nodes.get(nodeId);
  }
} 