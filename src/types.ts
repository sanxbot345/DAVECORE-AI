export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  isStreaming?: boolean;
  thought?: string; // Stored thinking process
  groundingMetadata?: any; // Stored search grounding citations
  toolsUsed?: { name: string; arg?: string; status: 'executing' | 'success' | 'failed'; resultSummary?: string }[];
}

export interface CanvasDocument {
  id: string;
  title: string;
  content: string;
  language: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  timestamp: number;
  canvasDoc?: CanvasDocument | null; // Optional Canvas document persisted in this session
}

