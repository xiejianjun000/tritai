export interface ConversationRequest {
  content: string;
  context?: Record<string, unknown>;
  timestamp?: number;
}
