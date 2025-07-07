export type ChatMessage = {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  isStreaming?: boolean;
  fullText?: string;
};
