export type Page =
  | 'login'
  | 'register'
  | 'home'
  | 'chat'
  | 'news'
  | 'drugs'
  | 'article'
  | 'profile'
  | 'history'
  | 'knowledge-graph';

export interface AuthUser {
  id: number;
  email: string;
  phone: string | null;
  name: string;
  avatar: string;
  createdAt: string;
}

export interface Profile {
  id: number;
  email: string;
  phone: string | null;
  name: string;
  avatar: string;
  age: number | null;
  bloodType: string | null;
  height: string | null;
  address: string | null;
  allergies: string[];
  chronicConditions: string[];
  privacySettings: {
    shareHistory?: boolean;
    smartAlerts?: boolean;
    [key: string]: boolean | string | number | undefined;
  };
}

export interface ConsultationSession {
  id: number;
  title: string;
  summary: string;
  status: string;
  lastMessageAt: string;
  createdAt: string;
}

export interface KnowledgeQueryResult {
  question?: string;
  queryType?: string;
  topK?: number;
  rootSystemMessageId?: number | string;
  sourceUserMessageId?: number | string | null;
  regeneratedFromMessageId?: number | string;
  graphData?: MedicalGraphData | null;
  contexts?: unknown[];
  error?: string;
  [key: string]: unknown;
}

export interface MedicalGraphNode {
  id: string;
  label: string;
  type: string;
  primary?: boolean;
}

export interface MedicalGraphEdge {
  source: string;
  target: string;
  label: string;
}

export interface MedicalGraphData {
  queryType: string;
  centerId: string;
  title: string;
  similarity?: number;
  nodes: MedicalGraphNode[];
  edges: MedicalGraphEdge[];
}

export interface FullKnowledgeGraph {
  nodes: MedicalGraphNode[];
  edges: MedicalGraphEdge[];
  totalNodes: number;
  totalEdges: number;
  limited?: boolean;
}

export interface ConsultationMessage {
  id: number;
  sessionId: number;
  sender: 'user' | 'system';
  content: string;
  contextData?: KnowledgeQueryResult | null;
  createdAt: string;
}

export interface ConsultationMessageResponse {
  userMessage: ConsultationMessage;
  systemMessage: ConsultationMessage;
}

export interface Drug {
  id: number;
  name: string;
  scientificName: string;
  drugType: 'OTC' | 'RX' | string;
  description: string;
  imageUrl: string;
  dosage: string;
  packaging: string;
  indications: string[];
  aiInsight: string;
}

export interface Article {
  id: number;
  title: string;
  category: string;
  excerpt: string;
  content?: string;
  imageUrl: string;
  author: string;
  publishedAt: string;
  readTime: string;
  tags: string[];
  featured: boolean;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
}
