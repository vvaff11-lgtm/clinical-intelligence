import { TOKEN_STORAGE_KEY } from '../constants';
import type {
  Article,
  AuthResponse,
  AuthUser,
  ConsultationMessage,
  ConsultationMessageResponse,
  ConsultationSession,
  Drug,
  FullKnowledgeGraph,
  PaginatedResponse,
  Profile,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function getToken() {
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setToken(token: string) {
  window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set('Accept', 'application/json');
  if (!(init?.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const token = getToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    let message = '请求失败，请稍后再试';
    try {
      const errorBody = await response.json();
      message = errorBody.detail || errorBody.message || message;
    } catch {
      // ignore parse errors
    }
    if (response.status === 401) {
      clearToken();
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  health: () => request<{ status: string }>('/health'),
  register: (payload: { email: string; phone?: string; password: string; name: string }) =>
    request<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload: { email: string; password: string }) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  me: () => request<AuthUser>('/auth/me'),
  getProfile: () => request<Profile>('/profile'),
  updateProfile: (payload: Partial<Profile>) =>
    request<Profile>('/profile', { method: 'PUT', body: JSON.stringify(payload) }),
  listConsultations: () => request<PaginatedResponse<ConsultationSession>>('/consultations'),
  createConsultation: (payload?: { title?: string }) =>
    request<ConsultationSession>('/consultations', {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    }),
  listMessages: (sessionId: number) =>
    request<PaginatedResponse<ConsultationMessage>>(`/consultations/${sessionId}/messages`),
  deleteConsultation: (sessionId: number) =>
    request<void>(`/consultations/${sessionId}`, { method: 'DELETE' }),
  sendMessage: (
    sessionId: number,
    payload: {
      content: string;
      queryType?: '疾病' | '症状';
      topK?: number;
      temperature?: number;
      modelType?: 'AliyunBailian' | 'Ollama';
      modelName?: string;
      llmBaseUrl?: string;
      apiKey?: string;
    }
  ) =>
    request<ConsultationMessageResponse>(`/consultations/${sessionId}/messages`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  regenerateMessage: (
    sessionId: number,
    messageId: number,
    payload: {
      queryType?: '疾病' | '症状';
      topK?: number;
      temperature?: number;
      modelType?: 'AliyunBailian' | 'Ollama';
      modelName?: string;
      llmBaseUrl?: string;
      apiKey?: string;
    }
  ) =>
    request<ConsultationMessage>(`/consultations/${sessionId}/messages/${messageId}/regenerate`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  listDrugs: (query?: string) =>
    request<PaginatedResponse<Drug>>(`/drugs${query ? `?query=${encodeURIComponent(query)}` : ''}`),
  getDrug: (drugId: number) => request<Drug>(`/drugs/${drugId}`),
  listArticles: (query?: string) =>
    request<PaginatedResponse<Article>>(`/articles${query ? `?query=${encodeURIComponent(query)}` : ''}`),
  getArticle: (articleId: number) => request<Article>(`/articles/${articleId}`),
  getKnowledgeGraph: (nodeLimit = 500, edgeLimit = 1200) =>
    request<FullKnowledgeGraph>(`/knowledge-graph?node_limit=${nodeLimit}&edge_limit=${edgeLimit}`),
};
