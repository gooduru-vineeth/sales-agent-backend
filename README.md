# AI Sales Agent Backend

A sophisticated Node.js application that implements an AI-powered sales agent using Together AI's LLM capabilities. The platform handles product inquiries, demo scheduling, and customer interactions with a focus on AWS product information.

## 🌟 Features

### Core Capabilities
- 🤖 AI-powered conversational agent using Together AI's LLM (Meta-Llama-3.1-70B-Instruct-Turbo)
- 📝 RAG (Retrieval Augmented Generation) for accurate product information retrieval
- 📅 Automated demo scheduling with email confirmation
- 💾 MongoDB integration for persistent data storage
- 🔄 Real-time communication via WebSocket
- 📊 Sophisticated conversation state management
- 🔍 Vector search using Pinecone for semantic similarity
- 📝 Comprehensive logging system

### Technical Features
- TypeScript-based architecture
- Express.js server with WebSocket support
- Modular service architecture
- Comprehensive error handling
- Structured logging with Winston
- Zod schema validation
- Environment-based configuration

## 🏗 Architecture

### Core Components
1. **WebSocket Manager**: Handles real-time communication
2. **Conversation Manager**: Manages conversation flow and state
3. **Node Service**: Implements conversation flow logic
4. **AI Service**: Integrates with Together AI
5. **Embedding Service**: Manages vector embeddings with Pinecone
6. **Product Service**: Handles product-related queries

### Data Models
- Customer
- Message
- Event
- Session

## 🚀 Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn package manager
- Pinecone account
- Together AI API key

## ⚙️ Environment Variables

Create a `.env` file with:

### API Keys

TOGETHER_API_KEY=your_together_ai_key
PINECONE_API_KEY=your_pinecone_key
PINECONE_ENVIRONMENT=your_pinecone_environment

### Database

MONGODB_URI=your_mongodb_connection_string

### Server

PORT=3000
LOG_LEVEL=debug


## 📦 Installation

1. Clone the repository:

```bash
git clone https://github.com/gooduru-vineeth/sales-agent-backend.git
```

```bash
cd sales-agent-backend
```

2. Install dependencies:

```bash
npm install
```

3. Build the project:

```bash
npm run build
```

4. Load AWS product data:

```bash
npm run load-aws-data
```

5. Start the server:

```bash
npm start
```


## 🛠 Development

### Available Scripts
- `npm start`: Run the production server
- `npm run dev`: Run development server with hot reload
- `npm run build`: Build the TypeScript project
- `npm run lint`: Run ESLint
- `npm run format`: Format code with Prettier
- `npm run load-aws-data`: Load AWS product data into Pinecone

### Project Structure

```
src/
├── config/         # Configuration files
│   ├── database.ts
│   └── index.ts
│
├── models/         # MongoDB models
│   ├── Customer.ts
│   ├── Event.ts
│   └── Message.ts
│
├── providers/      # External service providers
│   ├── together/
│   └── pinecone/
│
├── repositories/   # Data access layer
│   ├── Customer.ts
│   ├── Event.ts
│   └── Message.ts
│
├── scripts/        # Utility scripts
│   └── loadAwsProductData.ts
│
├── services/       # Business logic
│   ├── AIService.ts
│   ├── ConversationManager.ts
│   ├── EmbeddingService.ts
│   └── NodeService.ts
│
├── types/          # TypeScript types
│   ├── ai-provider.ts
│   ├── analysis.ts
│   ├── customer.ts
│   ├── events.ts
│   └── message.ts
│
├── utils/          # Utility functions
│   └── logger.ts
│
└── websocket/      # WebSocket handling
    └── WebSocketManager.ts
```


## 🔄 Conversation Flow

The system implements a node-based conversation flow:
1. Welcome Node
2. Collect User Information
3. Product Information
4. Q&A Node
5. Demo Scheduling
6. End Conversation

## 📚 AWS Product Coverage

Currently supports information about:
- Amazon EC2
- Amazon S3
- Amazon RDS
- Amazon DynamoDB
- AWS Lambda

## 🔒 Security

- Secure WebSocket connections
- Environment-based configuration
- Input validation using Zod
- MongoDB security best practices
- API key management

## 📝 Logging

Comprehensive logging system using Winston with:
- Console output
- File-based logging
- Error tracking
- Request/Response logging
- Performance monitoring

## 📄 License

[MIT License](LICENSE)
