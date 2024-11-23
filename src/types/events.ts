export type Event = {
  name: string;
  data: any;
  metadata?: Record<string, any>;
  sessionId: string;
};
