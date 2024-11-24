import { EmbeddingService } from '../services/EmbeddingService';
import { logger } from '../utils/logger';
import dotenv from 'dotenv';
import config from '../config';

dotenv.config();

interface ProductSection {
  id: string;
  text: string;
  metadata: {
    category: string;
    productName?: string;
    section: string;
  };
}

async function loadAwsProductData() {
  const embeddingService = new EmbeddingService();

  // Initialize the index
  await embeddingService.initialize(config.pinecone.awsProductsIndexName);

  // Complete AWS product catalog data
  const sections: ProductSection[] = [
    // Company Overview
    {
      id: 'aws-overview',
      text: `Amazon Web Services (AWS) is a subsidiary of Amazon providing on-demand cloud computing platforms and APIs. Launched in 2006, AWS offers over 200 fully-featured services from data centers globally. AWS is the world's most comprehensive and broadly adopted cloud platform, used by millions of customers including fastest-growing startups, largest enterprises, and leading government agencies.`,
      metadata: {
        category: 'overview',
        section: 'company-overview',
      },
    },

    // EC2 Sections
    {
      id: 'ec2-overview',
      text: `Amazon EC2 (Elastic Compute Cloud) is a compute service launched in August 2006. It's an IaaS (Infrastructure as a Service) offering with a pay-as-you-go pricing model with multiple pricing options. EC2 provides resizable compute capacity in the cloud, offering the broadest and deepest compute platform with choice of processor, storage, networking, operating system, and purchase model.`,
      metadata: {
        category: 'compute',
        productName: 'EC2',
        section: 'overview',
      },
    },
    {
      id: 'ec2-specs',
      text: `EC2 Technical Specifications: Instance Types include General Purpose, Compute Optimized, Memory Optimized, Storage Optimized, and Accelerated Computing. Processor options include Intel Xeon, AMD EPYC, and AWS Graviton. Maximum memory up to 24TB with High Memory instances. Storage options include EBS volumes and Instance Store. Network Performance up to 100 Gbps. Supports Linux, Windows, and MacOS operating systems.`,
      metadata: {
        category: 'compute',
        productName: 'EC2',
        section: 'specifications',
      },
    },
    {
      id: 'ec2-features',
      text: `EC2 Key Features: Elastic Load Balancing, Auto Scaling, Flexible networking with VPC integration, Security Groups and Network ACLs, Placement Groups for optimized performance, Dedicated Hosts and Instances, Spot Instances for cost optimization, Reserved Instances for predictable workloads.`,
      metadata: {
        category: 'compute',
        productName: 'EC2',
        section: 'features',
      },
    },
    {
      id: 'ec2-use-cases',
      text: `EC2 Use Cases: Web and Application Servers, Game Servers, High-Performance Computing, Development and Test Environments, Machine Learning and AI Training.`,
      metadata: {
        category: 'compute',
        productName: 'EC2',
        section: 'use-cases',
      },
    },

    // S3 Sections
    {
      id: 's3-overview',
      text: `Amazon S3 (Simple Storage Service) is an object storage service launched in March 2006. It uses a pay-for-use pricing model based on storage, requests, and data transfer. S3 offers industry-leading scalability, data availability, security, and performance, designed to deliver 99.999999999% durability.`,
      metadata: {
        category: 'storage',
        productName: 'S3',
        section: 'overview',
      },
    },
    {
      id: 's3-specs',
      text: `S3 Technical Specifications: Storage Classes include Standard, Intelligent-Tiering, Standard-IA, One Zone-IA, Glacier, and Glacier Deep Archive. Maximum object size is 5TB. Availability is 99.99% (Standard). Durability is 99.999999999% (11 9's). Access Control through IAM, Bucket Policies, ACLs. Encryption options include Server-side (SSE-S3, SSE-KMS, SSE-C) and Client-side. First byte latency in milliseconds.`,
      metadata: {
        category: 'storage',
        productName: 'S3',
        section: 'specifications',
      },
    },
    {
      id: 's3-features',
      text: `S3 Key Features: Versioning, Lifecycle Management, Cross-Region Replication, Event Notifications, Static Website Hosting, Transfer Acceleration, Batch Operations, Strong Consistency, Object Lock for WORM (Write Once Read Many).`,
      metadata: {
        category: 'storage',
        productName: 'S3',
        section: 'features',
      },
    },
    {
      id: 's3-use-cases',
      text: `S3 Use Cases: Data Lakes, Backup and Restore, Disaster Recovery, Content Distribution, Big Data Analytics.`,
      metadata: {
        category: 'storage',
        productName: 'S3',
        section: 'use-cases',
      },
    },

    // RDS Sections
    {
      id: 'rds-overview',
      text: `Amazon RDS (Relational Database Service) launched in October 2009 is a Platform as a Service (PaaS) with pay-per-hour pricing based on instance type and storage. RDS makes it easy to set up, operate, and scale a relational database in the cloud, automating administration tasks like hardware provisioning, database setup, patching, and backups.`,
      metadata: {
        category: 'database',
        productName: 'RDS',
        section: 'overview',
      },
    },
    {
      id: 'rds-specs',
      text: `RDS Technical Specifications: Supports Amazon Aurora, PostgreSQL, MySQL, MariaDB, Oracle, and SQL Server. Maximum storage up to 64TB. Up to 80,000 IOPS. Backup retention up to 35 days. Up to 15 read replicas. High Availability through Multi-AZ deployment. Security features include network isolation with VPC, encryption at rest and in transit.`,
      metadata: {
        category: 'database',
        productName: 'RDS',
        section: 'specifications',
      },
    },
    {
      id: 'rds-features',
      text: `RDS Key Features: Automated Patching, Continuous Backup, Point-in-Time Recovery, Read Replicas, Multi-AZ Deployments, Performance Insights, Enhanced Monitoring, Easy Scaling, Automated Failover.`,
      metadata: {
        category: 'database',
        productName: 'RDS',
        section: 'features',
      },
    },

    // DynamoDB Sections
    {
      id: 'dynamodb-overview',
      text: `Amazon DynamoDB, launched in January 2012, is a fully managed NoSQL database service with pay-per-request or provisioned capacity pricing. It provides fast and flexible NoSQL database service for any scale, with consistent single-digit millisecond latency and built-in security, backup and restore, and in-memory caching.`,
      metadata: {
        category: 'database',
        productName: 'DynamoDB',
        section: 'overview',
      },
    },
    {
      id: 'dynamodb-specs',
      text: `DynamoDB Technical Specifications: Supports key-value and document data models. Offers eventually consistent and strongly consistent reads. Maximum item size is 400KB. Unlimited tables per account. Virtually unlimited throughput with Auto Scaling. Single-digit millisecond latency. Global Tables feature enables multi-region, multi-master replication.`,
      metadata: {
        category: 'database',
        productName: 'DynamoDB',
        section: 'specifications',
      },
    },

    // Lambda Sections
    {
      id: 'lambda-overview',
      text: `Amazon Lambda, launched in November 2014, is a serverless computing service (Function as a Service) with pay-per-request and compute time pricing. Lambda lets you run code without provisioning or managing servers, paying only for the compute time consumed with no charges when code is not running.`,
      metadata: {
        category: 'serverless',
        productName: 'Lambda',
        section: 'overview',
      },
    },
    {
      id: 'lambda-specs',
      text: `Lambda Technical Specifications: Supports Node.js, Python, Java, Go, .NET, Ruby runtimes. Up to 10GB memory. Maximum execution time of 15 minutes. 1000 concurrent executions (default, can be increased). Deployment package size up to 50MB zipped, 250MB unzipped. 512MB temporary storage. VPC support with ENI.`,
      metadata: {
        category: 'serverless',
        productName: 'Lambda',
        section: 'specifications',
      },
    },

    // Integration and Support
    {
      id: 'aws-integration',
      text: `AWS Integration and Ecosystem: All services work together through Shared Security Model, AWS Identity and Access Management (IAM), Virtual Private Cloud (VPC) networking, CloudFormation for Infrastructure as Code, AWS Organizations for multi-account management, CloudWatch for monitoring, AWS CloudTrail for API auditing.`,
      metadata: {
        category: 'integration',
        section: 'ecosystem',
      },
    },
    {
      id: 'aws-support',
      text: `AWS Support Plans: Basic Support included for all customers, Developer Support with technical guidance, Business Support with 24/7 support and <1-hour response for urgent cases, Enterprise Support with technical account manager and <15-minute response for critical cases.`,
      metadata: {
        category: 'support',
        section: 'plans',
      },
    },
    {
      id: 'aws-security',
      text: `AWS Compliance and Security: 90+ security standards and compliance certifications, Shared Responsibility Model, Built-in DDoS protection, Encryption at rest and in transit, Regular security audits and penetration testing, Continuous monitoring and threat detection.`,
      metadata: {
        category: 'security',
        section: 'compliance',
      },
    },
  ];

  try {
    // Store the sections in batches
    const BATCH_SIZE = 10;
    for (let i = 0; i < sections.length; i += BATCH_SIZE) {
      const batch = sections.slice(i, i + BATCH_SIZE);
      const items = batch.map((section) => ({
        id: section.id,
        text: section.text,
        metadata: section.metadata,
      }));

      await embeddingService.storeTexts(items);
      logger.info(`Stored batch ${i / BATCH_SIZE + 1} successfully`);
    }

    // Verify the index stats
    const stats = await embeddingService.getIndexStats();
    logger.info('Data loading completed. Index stats:', stats);
  } catch (error) {
    logger.error('Error loading AWS product data:', error);
    throw error;
  }
}

// Execute the script
loadAwsProductData().catch((error) => {
  logger.error('Script failed:', error);
  process.exit(1);
});
