
export enum Provider {
  GOOGLE = 'Google Gemini',
  OPENAI = 'OpenAI',
  ANTHROPIC = 'Anthropic Claude'
}

export type Language = 'en' | 'zh';
export type Theme = 'dark' | 'light';

export interface ModelOption {
  id: string;
  name: string;
  provider: Provider;
  contextWindow?: number;
  isManual?: boolean;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  provider?: Provider;
  model?: string;
  latency?: number; // ms
}

export interface SpeedTestResult {
  id: string;
  provider: Provider;
  model: string;
  status: 'success' | 'error' | 'loading';
  latency: number;
  ttft?: number; // Time to first token
  timestamp: number;
  errorMsg?: string;
}

export interface ProviderConfig {
  enabled: boolean;
  baseUrl: string;
  apiKey: string;
}

export interface AppSettings {
  language: Language;
  theme: Theme;
  corsProxy: string; // Global CORS proxy prefix
  google: ProviderConfig;
  openai: ProviderConfig;
  anthropic: ProviderConfig;
}

export type ViewState = 'chat' | 'speedtest' | 'settings';
