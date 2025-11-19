
import { AppSettings, Provider, ModelOption } from './types';

export const DEFAULT_SYSTEM_PROMPT = "You are a helpful AI assistant. Be concise and accurate.";

export const DEFAULT_SETTINGS: AppSettings = {
  language: 'en',
  theme: 'dark',
  google: {
    enabled: true,
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    apiKey: '' 
  },
  openai: {
    enabled: true,
    baseUrl: 'https://api.openai.com/v1',
    apiKey: ''
  },
  anthropic: {
    enabled: true,
    baseUrl: 'https://api.anthropic.com/v1',
    apiKey: ''
  }
};

export const SUGGESTED_MODELS: ModelOption[] = [
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: Provider.GOOGLE },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: Provider.GOOGLE },
  { id: 'gpt-4o', name: 'GPT-4o', provider: Provider.OPENAI },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: Provider.OPENAI },
  { id: 'claude-3-5-sonnet-20240620', name: 'Claude 3.5 Sonnet', provider: Provider.ANTHROPIC },
  { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', provider: Provider.ANTHROPIC }
];

export const TRANSLATIONS = {
  en: {
    settings: "Settings",
    chat: "Test Chat",
    speedTest: "Endpoint Speed",
    configTitle: "Configuration",
    configDesc: "Define endpoints and keys. Add models manually if auto-fetch fails.",
    saveConfig: "Save Config",
    corsTitle: "Browser CORS Restriction",
    corsDesc: "Official endpoints (e.g., api.openai.com) usually block browser requests.",
    corsOption1: "Use a CORS-compatible Proxy URL.",
    corsOption2: "Manually add your model IDs below.",
    fetchModels: "Fetch Models",
    baseUrl: "Base URL",
    apiKey: "API Key",
    manualAddTitle: "Manually Add Model",
    manualAddDesc: "Use this if 'Fetch Models' fails or to test specific model IDs.",
    provider: "Provider",
    modelId: "Model ID",
    displayName: "Display Name",
    add: "Add",
    quickTemplates: "Quick Templates:",
    noModels: "No models configured yet.",
    chatInterface: "Chat Interface",
    selectModel: "-- Select Configured Model --",
    typeMessage: "Type your message...",
    speedTestTitle: "Endpoint Speed Test",
    speedTestDesc: "Measures TTFT (Time To First Token) and Total Latency.",
    startBenchmark: "Start Benchmark",
    running: "Running Test...",
    latencyComp: "Latency Comparison (ms)",
    status: "Status",
    success: "Success",
    error: "Error",
    loading: "Testing...",
    theme: "Theme",
    language: "Language",
    light: "Light",
    dark: "Dark",
    clearChat: "Clear Chat"
  },
  zh: {
    settings: "设置",
    chat: "对话测试",
    speedTest: "速度测试",
    configTitle: "配置",
    configDesc: "定义接口地址和密钥。如果自动获取失败，请手动添加模型。",
    saveConfig: "保存配置",
    corsTitle: "浏览器跨域限制 (CORS)",
    corsDesc: "官方接口 (如 api.openai.com) 通常会阻止浏览器直接请求。",
    corsOption1: "使用支持 CORS 的代理地址作为 Base URL。",
    corsOption2: "在下方手动添加模型 ID。",
    fetchModels: "获取模型列表",
    baseUrl: "接口地址 (Base URL)",
    apiKey: "API 密钥 (Key)",
    manualAddTitle: "手动添加模型",
    manualAddDesc: "如果获取模型失败（常见的跨域问题）或需测试特定模型，请使用此项。",
    provider: "提供商",
    modelId: "模型 ID",
    displayName: "显示名称",
    add: "添加",
    quickTemplates: "快速模版:",
    noModels: "暂无配置模型。",
    chatInterface: "对话界面",
    selectModel: "-- 选择已配置模型 --",
    typeMessage: "输入消息...",
    speedTestTitle: "端点速度测试",
    speedTestDesc: "测量首字延迟 (TTFT) 和总响应时间。",
    startBenchmark: "开始基准测试",
    running: "测试中...",
    latencyComp: "延迟对比 (ms)",
    status: "状态",
    success: "成功",
    error: "错误",
    loading: "测试中...",
    theme: "界面主题",
    language: "语言",
    light: "亮色模式",
    dark: "暗色模式",
    clearChat: "清空对话"
  }
};
