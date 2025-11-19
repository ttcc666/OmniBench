
import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Activity, 
  Settings as SettingsIcon, 
  Send, 
  Trash2, 
  Menu,
  X,
  RefreshCw,
  Save,
  Globe,
  Key,
  Plus,
  AlertTriangle,
  Info,
  CheckCircle,
  Moon,
  Sun,
  Languages,
  Zap,
  Link,
  Timer,
  Trophy,
  BarChart2,
  Network,
  RotateCcw,
  Shield
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

import { DEFAULT_SYSTEM_PROMPT, DEFAULT_SETTINGS, SUGGESTED_MODELS, TRANSLATIONS, DEFAULT_CORS_PROXY } from './constants';
import { AppSettings, Message, ModelOption, Provider, SpeedTestResult, ViewState, ProviderConfig } from './types';
import { 
  generateOpenAIContent, 
  generateAnthropicContent, 
  fetchOpenAIModels,
  fetchGeminiModels,
  fetchAnthropicModels,
  generateGeminiContentRest
} from './services/externalServices';

import { Button, Input, Select, Card, Badge, SegmentedControl, Textarea, Switch } from './ui';

const SidebarItem = ({ 
  active, 
  icon: Icon, 
  label, 
  onClick 
}: { 
  active: boolean; 
  icon: React.ElementType; 
  label: string; 
  onClick: () => void; 
}) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
      active 
        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-semibold' 
        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
    }`}
  >
    <Icon size={20} className={active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'} />
    <span>{label}</span>
    {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />}
  </button>
);

export default function App() {
  const [view, setView] = useState<ViewState>('settings');
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  
  const [availableModels, setAvailableModels] = useState<ModelOption[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [testResults, setTestResults] = useState<SpeedTestResult[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{msg: string, type: 'success'|'error'|'info'} | null>(null);
  
  // Manual model entry state
  const [manualModelInput, setManualModelInput] = useState({ id: '', name: '' });
  const [manualModelProvider, setManualModelProvider] = useState<string>(Provider.OPENAI);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- Effects ---

  useEffect(() => {
    const saved = localStorage.getItem('omni_settings_v2');
    if (saved) {
      const parsed = JSON.parse(saved);
      setSettings({
          ...DEFAULT_SETTINGS,
          ...parsed,
          google: { ...DEFAULT_SETTINGS.google, ...(parsed.google || {}) },
          openai: { ...DEFAULT_SETTINGS.openai, ...(parsed.openai || {}) },
          anthropic: { ...DEFAULT_SETTINGS.anthropic, ...(parsed.anthropic || {}) }
      });
    } else if (process.env.API_KEY) {
      setSettings(prev => ({
          ...prev,
          google: { ...prev.google, apiKey: process.env.API_KEY || '' }
      }));
    }
    
    const savedModels = localStorage.getItem('omni_models');
    if (savedModels) {
      setAvailableModels(JSON.parse(savedModels));
    }
  }, []);

  useEffect(() => {
    if (settings.theme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  useEffect(() => {
    if (availableModels.length > 0 && !selectedModelId) {
      setSelectedModelId(availableModels[0].id);
    }
  }, [availableModels, selectedModelId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // --- Helpers ---

  const t = (key: keyof typeof TRANSLATIONS.en) => {
     const lang = settings.language || 'en';
     return TRANSLATIONS[lang][key] || TRANSLATIONS['en'][key];
  };

  const getEffectiveBaseUrl = (config: ProviderConfig) => {
    if (!settings.corsProxy) return config.baseUrl;
    
    const proxy = settings.corsProxy.trim();
    const target = config.baseUrl;

    // If proxy ends with delimiters like =, ?, or /, simply append
    if (proxy.endsWith('=') || proxy.endsWith('?') || proxy.endsWith('/')) {
        return `${proxy}${target}`;
    }

    // Otherwise, assume it's a path-based proxy (like Cloudflare Workers) and add a slash
    return `${proxy}/${target}`;
  };

  const saveSettings = () => {
    localStorage.setItem('omni_settings_v2', JSON.stringify(settings));
    localStorage.setItem('omni_models', JSON.stringify(availableModels));
    showFeedback(settings.language === 'zh' ? '配置已保存' : 'Settings Saved', 'success');
  };

  const showFeedback = (msg: string, type: 'success'|'error'|'info') => {
    setFeedbackMsg({ msg, type });
    setTimeout(() => setFeedbackMsg(null), 6000);
  };

  const isProviderEnabled = (provider: Provider) => {
    if (provider === Provider.GOOGLE) return settings.google.enabled;
    if (provider === Provider.OPENAI) return settings.openai.enabled;
    if (provider === Provider.ANTHROPIC) return settings.anthropic.enabled;
    return false;
  };

  // --- Logic ---

  const fetchModelsForProvider = async (provider: Provider) => {
    try {
      let newModels: ModelOption[] = [];
      
      if (provider === Provider.OPENAI) {
        newModels = await fetchOpenAIModels(getEffectiveBaseUrl(settings.openai), settings.openai.apiKey);
      } else if (provider === Provider.GOOGLE) {
        newModels = await fetchGeminiModels(getEffectiveBaseUrl(settings.google), settings.google.apiKey);
      } else if (provider === Provider.ANTHROPIC) {
        newModels = await fetchAnthropicModels(getEffectiveBaseUrl(settings.anthropic), settings.anthropic.apiKey);
      }

      if (newModels.length > 0) {
        setAvailableModels(prev => {
          const filtered = prev.filter(m => m.provider !== provider && m.isManual); 
          const updated = [...filtered, ...newModels];
          localStorage.setItem('omni_models', JSON.stringify(updated));
          return updated;
        });
        showFeedback(`${t('success')}: ${newModels.length} models`, 'success');
      } else {
        showFeedback(t('noModels'), 'info');
      }
    } catch (e: any) {
      console.error(e);
      if (e.message.includes("CORS")) {
        showFeedback("CORS Error. Try setting a Proxy.", 'error');
      } else {
        showFeedback(`Fetch Failed: ${e.message}`, 'error');
      }
    }
  };

  const addManualModel = () => {
    if (!manualModelInput.id) {
        showFeedback("Model ID is required", 'error');
        return;
    }
    const newModel: ModelOption = {
        id: manualModelInput.id,
        name: manualModelInput.name || manualModelInput.id,
        provider: manualModelProvider as Provider,
        isManual: true
    };
    setAvailableModels(prev => {
        const filtered = prev.filter(m => m.id !== newModel.id);
        const updated = [...filtered, newModel];
        localStorage.setItem('omni_models', JSON.stringify(updated));
        return updated;
    });
    setManualModelInput({ id: '', name: '' });
    showFeedback(`${t('add')} ${newModel.name}`, 'success');
  };

  const removeModel = (id: string) => {
    setAvailableModels(prev => {
        const updated = prev.filter(m => m.id !== id);
        localStorage.setItem('omni_models', JSON.stringify(updated));
        return updated;
    });
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isGenerating) return;
    
    const model = availableModels.find(m => m.id === selectedModelId);
    if (!model) {
        showFeedback(t('noModels'), "error");
        return;
    }

    if (!isProviderEnabled(model.provider)) {
      showFeedback(`${model.provider} is disabled. Enable it in Settings.`, 'error');
      return;
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsGenerating(true);

    const aiMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, {
      id: aiMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      provider: model.provider,
      model: model.name
    }]);

    try {
      let result;
      if (model.provider === Provider.GOOGLE) {
        result = await generateGeminiContentRest(getEffectiveBaseUrl(settings.google), settings.google.apiKey, model.id, userMsg.content, DEFAULT_SYSTEM_PROMPT);
      } else if (model.provider === Provider.OPENAI) {
        result = await generateOpenAIContent(getEffectiveBaseUrl(settings.openai), settings.openai.apiKey, model.id, userMsg.content, DEFAULT_SYSTEM_PROMPT);
      } else if (model.provider === Provider.ANTHROPIC) {
        result = await generateAnthropicContent(getEffectiveBaseUrl(settings.anthropic), settings.anthropic.apiKey, model.id, userMsg.content, DEFAULT_SYSTEM_PROMPT);
      }

      if (result) {
        setMessages(prev => prev.map(m => 
          m.id === aiMsgId ? { ...m, content: result.text, latency: result.latency } : m
        ));
      }
    } catch (error: any) {
      setMessages(prev => prev.map(m => 
        m.id === aiMsgId ? { ...m, content: `Error: ${error.message}`, role: 'system' } : m
      ));
    } finally {
      setIsGenerating(false);
    }
  };

  const runSpeedTest = async () => {
    const activeModels = availableModels.filter(m => isProviderEnabled(m.provider));

    if (activeModels.length === 0) {
        showFeedback("No models available from enabled providers", "error");
        return;
    }
    setIsTesting(true);
    setTestResults([]);
    const prompt = "Ping";

    for (const model of activeModels) {
      setTestResults(prev => [...prev, {
        id: model.id,
        provider: model.provider,
        model: model.name,
        status: 'loading',
        latency: 0,
        timestamp: Date.now()
      }]);

      try {
        let res;
        if (model.provider === Provider.GOOGLE) {
             res = await generateGeminiContentRest(getEffectiveBaseUrl(settings.google), settings.google.apiKey, model.id, prompt);
        } else if (model.provider === Provider.OPENAI) {
             res = await generateOpenAIContent(getEffectiveBaseUrl(settings.openai), settings.openai.apiKey, model.id, prompt);
        } else if (model.provider === Provider.ANTHROPIC) {
             res = await generateAnthropicContent(getEffectiveBaseUrl(settings.anthropic), settings.anthropic.apiKey, model.id, prompt);
        }

        setTestResults(prev => prev.map(r => 
          r.id === model.id ? { ...r, status: 'success', latency: res!.latency, ttft: res!.ttft } : r
        ));
      } catch (error: any) {
        setTestResults(prev => prev.map(r => 
          r.id === model.id ? { ...r, status: 'error', latency: 0, errorMsg: error.message } : r
        ));
      }
    }
    setIsTesting(false);
  };

  // --- Render Functions ---

  const getSpeedStats = () => {
    const successful = testResults.filter(r => r.status === 'success');
    if (successful.length === 0) return null;

    const fastest = successful.reduce((prev, curr) => prev.latency < curr.latency ? prev : curr);
    const avgLatency = Math.round(successful.reduce((sum, curr) => sum + curr.latency, 0) / successful.length);
    const avgTtft = Math.round(successful.reduce((sum, curr) => sum + (curr.ttft || 0), 0) / successful.length);
    
    return { fastest, avgLatency, avgTtft, count: successful.length };
  };

  const renderSettings = () => (
    <div className="p-6 max-w-5xl mx-auto h-full overflow-y-auto pb-24">
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
             <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{t('configTitle')}</h1>
             <p className="text-slate-500 dark:text-slate-400 mt-1">{t('configDesc')}</p>
          </div>
          <Button onClick={saveSettings} icon={Save} size="lg">
             {t('saveConfig')}
          </Button>
      </header>

      {/* Appearance */}
      <Card className="mb-6">
        <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
               <label className="text-xs font-bold text-slate-500 uppercase mb-2 block flex items-center gap-2"><Languages size={14}/> {t('language')}</label>
               <SegmentedControl 
                  options={[{value: 'en', label: 'English'}, {value: 'zh', label: '中文'}]}
                  value={settings.language}
                  onChange={(v) => setSettings(s => ({...s, language: v}))}
               />
            </div>
            <div className="flex-1">
               <label className="text-xs font-bold text-slate-500 uppercase mb-2 block flex items-center gap-2"><Sun size={14}/> {t('theme')}</label>
               <SegmentedControl 
                  options={[
                    {value: 'light', label: t('light'), icon: Sun}, 
                    {value: 'dark', label: t('dark'), icon: Moon}
                  ]}
                  value={settings.theme}
                  onChange={(v) => setSettings(s => ({...s, theme: v}))}
               />
            </div>
        </div>
      </Card>

      {/* Network Settings (CORS Proxy) */}
      <Card className="mb-8">
         <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Network size={20} className="text-blue-500"/> 
            {t('networkTitle')}
         </h3>
         
         <div className="flex flex-col md:flex-row gap-6 items-start">
             <div className="flex-1 w-full">
                <Input 
                    label={t('proxyLabel')} 
                    placeholder="e.g. https://corsproxy.io/?url=" 
                    value={settings.corsProxy} 
                    onChange={e=>setSettings({...settings, corsProxy: e.target.value})} 
                    icon={Globe}
                />
                
                {/* Helper Buttons for Proxy */}
                <div className="flex gap-2 mt-3">
                  <button 
                    onClick={() => setSettings(s => ({...s, corsProxy: DEFAULT_CORS_PROXY}))}
                    className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded border border-slate-200 dark:border-slate-700 flex items-center gap-1 transition-colors"
                  >
                    <RotateCcw size={12}/> {t('useDefault')}
                  </button>
                  <button 
                    onClick={() => setSettings(s => ({...s, corsProxy: ''}))}
                    className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded border border-slate-200 dark:border-slate-700 flex items-center gap-1 transition-colors"
                  >
                    <Shield size={12}/> {t('useDirect')}
                  </button>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 leading-relaxed">
                    {t('proxyDesc')}
                </p>
             </div>
             
             {/* CORS Info Box */}
             <div className="flex-1 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-sm flex items-start gap-3">
                <div className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                    <AlertTriangle size={18} />
                </div>
                <div>
                    <strong className="block mb-1 text-amber-800 dark:text-amber-300">{t('corsTitle')}</strong>
                    <p className="text-amber-700 dark:text-amber-400/80 leading-snug mb-2">{t('corsDesc')}</p>
                    <div className="flex flex-col gap-1 text-amber-800 dark:text-amber-400 opacity-90 text-xs">
                        <span className="flex items-center gap-1.5"><CheckCircle size={10}/> {t('corsOption1')}</span>
                        <span className="flex items-center gap-1.5"><CheckCircle size={10}/> {t('corsOption2')}</span>
                    </div>
                </div>
            </div>
         </div>
      </Card>

      {/* Providers Grid */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {/* Google Config */}
        <Card className={!settings.google.enabled ? 'opacity-75' : ''}>
           <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <div className="w-2 h-8 bg-blue-500 rounded-full"></div>
                Google Gemini
              </h3>
              <Switch 
                checked={settings.google.enabled} 
                onChange={(v) => setSettings(s => ({...s, google: {...s.google, enabled: v}}))}
              />
           </div>
           <div className={`space-y-4 ${!settings.google.enabled ? 'pointer-events-none opacity-50' : ''}`}>
              <Input 
                label={t('baseUrl')} 
                placeholder="https://generativelanguage..." 
                value={settings.google.baseUrl} 
                onChange={e=>setSettings({...settings, google:{...settings.google, baseUrl:e.target.value}})} 
                icon={Link}
                disabled={!settings.google.enabled}
              />
              <Input 
                label={t('apiKey')} 
                type="password"
                placeholder="AIza..." 
                value={settings.google.apiKey} 
                onChange={e=>setSettings({...settings, google:{...settings.google, apiKey:e.target.value}})} 
                icon={Key}
                disabled={!settings.google.enabled}
              />
              <Button 
                variant="secondary" 
                className="w-full" 
                onClick={()=>fetchModelsForProvider(Provider.GOOGLE)} 
                icon={RefreshCw}
                disabled={!settings.google.enabled}
              >
                {t('fetchModels')}
              </Button>
           </div>
        </Card>

        {/* OpenAI Config */}
        <Card className={!settings.openai.enabled ? 'opacity-75' : ''}>
           <div className="flex items-center justify-between mb-4">
             <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <div className="w-2 h-8 bg-green-500 rounded-full"></div>
                OpenAI
             </h3>
             <Switch 
                checked={settings.openai.enabled} 
                onChange={(v) => setSettings(s => ({...s, openai: {...s.openai, enabled: v}}))}
              />
           </div>
           <div className={`space-y-4 ${!settings.openai.enabled ? 'pointer-events-none opacity-50' : ''}`}>
              <Input 
                label={t('baseUrl')} 
                placeholder="https://api.openai.com/v1" 
                value={settings.openai.baseUrl} 
                onChange={e=>setSettings({...settings, openai:{...settings.openai, baseUrl:e.target.value}})} 
                icon={Link}
                disabled={!settings.openai.enabled}
              />
              <Input 
                label={t('apiKey')} 
                type="password"
                placeholder="sk-..." 
                value={settings.openai.apiKey} 
                onChange={e=>setSettings({...settings, openai:{...settings.openai, apiKey:e.target.value}})} 
                icon={Key}
                disabled={!settings.openai.enabled}
              />
              <Button 
                variant="secondary" 
                className="w-full" 
                onClick={()=>fetchModelsForProvider(Provider.OPENAI)} 
                icon={RefreshCw}
                disabled={!settings.openai.enabled}
              >
                {t('fetchModels')}
              </Button>
           </div>
        </Card>

        {/* Anthropic Config */}
        <Card className={!settings.anthropic.enabled ? 'opacity-75' : ''}>
           <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <div className="w-2 h-8 bg-orange-500 rounded-full"></div>
                Anthropic
              </h3>
              <Switch 
                checked={settings.anthropic.enabled} 
                onChange={(v) => setSettings(s => ({...s, anthropic: {...s.anthropic, enabled: v}}))}
              />
           </div>
           <div className={`space-y-4 ${!settings.anthropic.enabled ? 'pointer-events-none opacity-50' : ''}`}>
              <Input 
                label={t('baseUrl')} 
                placeholder="https://api.anthropic.com/v1" 
                value={settings.anthropic.baseUrl} 
                onChange={e=>setSettings({...settings, anthropic:{...settings.anthropic, baseUrl:e.target.value}})} 
                icon={Link}
                disabled={!settings.anthropic.enabled}
              />
              <Input 
                label={t('apiKey')} 
                type="password"
                placeholder="sk-ant..." 
                value={settings.anthropic.apiKey} 
                onChange={e=>setSettings({...settings, anthropic:{...settings.anthropic, apiKey:e.target.value}})} 
                icon={Key}
                disabled={!settings.anthropic.enabled}
              />
              <Button 
                variant="secondary" 
                className="w-full" 
                onClick={()=>fetchModelsForProvider(Provider.ANTHROPIC)} 
                icon={RefreshCw}
                disabled={!settings.anthropic.enabled}
              >
                {t('fetchModels')}
              </Button>
           </div>
        </Card>
      </div>

      <Card>
         <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
           <Plus size={20} className="text-blue-500"/> 
           {t('manualAddTitle')}
         </h3>
         <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{t('manualAddDesc')}</p>
         
         {/* Manual Add Form */}
         <div className="flex flex-col md:flex-row gap-4 mb-8 bg-slate-50 dark:bg-slate-900/50 p-5 rounded-xl border border-slate-200 dark:border-slate-700/50">
            <div className="min-w-[180px]">
                <Select 
                  label={t('provider')}
                  value={manualModelProvider}
                  onChange={(v) => setManualModelProvider(v)}
                  options={Object.values(Provider).map(p => ({ value: p, label: p }))}
                />
            </div>
            <div className="flex-1">
                <Input 
                  label={`${t('modelId')} (Required)`}
                  placeholder="e.g. gpt-4o, gemini-2.0-flash" 
                  value={manualModelInput.id}
                  onChange={e => setManualModelInput({...manualModelInput, id: e.target.value})}
                />
            </div>
            <div className="flex-1">
                <Input 
                  label={t('displayName')}
                  placeholder="Friendly name" 
                  value={manualModelInput.name}
                  onChange={e => setManualModelInput({...manualModelInput, name: e.target.value})}
                />
            </div>
            <div className="flex items-end">
                <Button onClick={addManualModel} className="h-[42px]" icon={Plus}>
                   {t('add')}
                </Button>
            </div>
         </div>
         
         {/* Quick Suggestions */}
         <div className="mb-8 flex flex-wrap gap-2 items-center">
            <span className="text-xs font-bold text-slate-400 uppercase mr-2">{t('quickTemplates')}</span>
            {SUGGESTED_MODELS.map(m => (
               <button 
                 key={m.id}
                 onClick={() => { setManualModelProvider(m.provider); setManualModelInput({id: m.id, name: m.name}); }}
                 className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200 dark:border-slate-700 rounded-full text-xs text-slate-600 dark:text-slate-300 transition-colors"
               >
                 + {m.name}
               </button>
            ))}
         </div>

         {/* Model List Table */}
         <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm">
               <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 font-medium">
                  <tr>
                     <th className="p-4 w-1/4">{t('provider')}</th>
                     <th className="p-4 w-1/3">{t('modelId')}</th>
                     <th className="p-4 w-1/3">{t('displayName')}</th>
                     <th className="p-4 text-right pr-6">Action</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-800/20 text-slate-800 dark:text-slate-300">
                  {availableModels.length === 0 && (
                     <tr>
                        <td colSpan={4} className="p-12">
                           <div className="flex flex-col items-center justify-center gap-3 text-slate-400 dark:text-slate-500 opacity-70">
                              <Activity className="opacity-20" size={48} />
                              <span className="text-lg font-medium">{t('noModels')}</span>
                           </div>
                        </td>
                     </tr>
                  )}
                  {availableModels.map((m) => (
                     <tr key={m.id + m.provider} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group ${!isProviderEnabled(m.provider) ? 'opacity-50 grayscale' : ''}`}>
                        <td className="p-4">
                          <Badge variant="neutral">{m.provider}</Badge>
                          {!isProviderEnabled(m.provider) && <span className="ml-2 text-[10px] text-red-500 font-bold">(DISABLED)</span>}
                        </td>
                        <td className="p-4 font-mono text-xs text-slate-500 dark:text-slate-400">{m.id}</td>
                        <td className="p-4 flex items-center gap-2">
                           <span className="font-medium">{m.name}</span>
                           {m.isManual && <span className="text-[10px] text-slate-400 border border-slate-200 dark:border-slate-700 px-1.5 rounded">MANUAL</span>}
                        </td>
                        <td className="p-4 text-right pr-6">
                           <button onClick={() => removeModel(m.id)} className="text-slate-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                              <Trash2 size={18}/>
                           </button>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </Card>
    </div>
  );

  const renderChat = () => {
    // Filter models to only show enabled ones in the dropdown
    const activeModels = availableModels.filter(m => isProviderEnabled(m.provider));
    
    return (
    <div className="flex flex-col h-full max-w-4xl mx-auto w-full">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
         <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg flex items-center justify-center">
               <MessageSquare size={20} />
            </div>
            <div>
               <h2 className="font-bold text-slate-900 dark:text-slate-100">{t('chatInterface')}</h2>
               <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className={`w-2 h-2 rounded-full ${activeModels.length > 0 ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                  {activeModels.length} models available
               </div>
            </div>
         </div>
         <div className="flex items-center gap-3">
            <div className="w-64 hidden md:block">
              <Select 
                placeholder={activeModels.length > 0 ? t('selectModel') : "No enabled models"}
                disabled={activeModels.length === 0}
                options={activeModels.map(m => ({
                    value: m.id, 
                    label: m.name, 
                    subLabel: m.provider,
                    icon: m.provider === Provider.GOOGLE ? Zap : m.provider === Provider.OPENAI ? Activity : Globe
                }))}
                value={selectedModelId}
                onChange={setSelectedModelId}
              />
            </div>
            <Button variant="ghost" size="sm" icon={Trash2} onClick={() => setMessages([])}>
              {t('clearChat')}
            </Button>
         </div>
      </div>
      
      <div className="md:hidden px-4 py-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
         <Select 
            placeholder={activeModels.length > 0 ? t('selectModel') : "No enabled models"}
            disabled={activeModels.length === 0}
            options={activeModels.map(m => ({value: m.id, label: m.name}))}
            value={selectedModelId}
            onChange={setSelectedModelId}
          />
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
         {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 opacity-50">
               <MessageSquare size={64} strokeWidth={1.5} />
               <p className="mt-4 text-lg font-medium">{t('typeMessage')}</p>
            </div>
         ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                 <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    msg.role === 'user' ? 'bg-blue-600 text-white' : 
                    msg.role === 'system' ? 'bg-red-100 text-red-600' :
                    'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300'
                 }`}>
                    {msg.role === 'user' ? <Send size={14}/> : <Zap size={14}/>}
                 </div>
                 <div className={`flex flex-col max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                       msg.role === 'user' 
                         ? 'bg-blue-600 text-white rounded-tr-none' 
                         : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-tl-none text-slate-800 dark:text-slate-200'
                    }`}>
                       {msg.content}
                    </div>
                    {msg.latency && (
                       <span className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                          <Timer size={10}/> {msg.latency}ms • {msg.model}
                       </span>
                    )}
                 </div>
              </div>
            ))
         )}
         {isGenerating && (
           <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 flex items-center justify-center shrink-0 animate-pulse">
                 <Zap size={14}/>
              </div>
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-2xl rounded-tl-none">
                 <div className="flex gap-1">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}/>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}/>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}/>
                 </div>
              </div>
           </div>
         )}
         <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
         <div className="relative">
            <Textarea 
               placeholder={t('typeMessage')}
               value={input}
               onChange={(e) => setInput(e.target.value)}
               onKeyDown={(e) => {
                  if(e.key === 'Enter' && !e.shiftKey) {
                     e.preventDefault();
                     handleSendMessage();
                  }
               }}
               className="pr-12 max-h-32 min-h-[50px] py-3"
               disabled={isGenerating}
            />
            <button 
               onClick={handleSendMessage}
               disabled={!input.trim() || isGenerating}
               className="absolute right-2 bottom-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
            >
               {isGenerating ? <Activity size={18} className="animate-spin"/> : <Send size={18} />}
            </button>
         </div>
      </div>
    </div>
  );
  };

  const renderSpeedTest = () => {
     const stats = getSpeedStats();

     const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
           const data = payload[0].payload;
           return (
              <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl text-xs z-50">
                 <p className="font-bold text-white mb-2 border-b border-slate-700 pb-1">{data.model}</p>
                 <div className="space-y-1.5">
                    <div className="flex justify-between items-center gap-6">
                       <span className="text-slate-400 flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${data.latency < 500 ? 'bg-green-500' : data.latency < 1000 ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                          Total Latency
                       </span>
                       <span className="font-mono font-bold text-slate-200">
                          {data.latency} ms
                       </span>
                    </div>
                    {data.ttft > 0 && (
                       <div className="flex justify-between items-center gap-6">
                          <span className="text-slate-500 ml-3">TTFT</span>
                          <span className="font-mono text-slate-400">{data.ttft} ms</span>
                       </div>
                    )}
                 </div>
                 <div className="mt-2 pt-2 border-t border-slate-800 text-[10px] text-slate-500 text-right uppercase tracking-wider">
                    {data.provider}
                 </div>
              </div>
           );
        }
        return null;
     };

     return (
       <div className="p-6 max-w-6xl mx-auto h-full overflow-y-auto pb-20">
         <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
               <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{t('speedTestTitle')}</h1>
               <p className="text-slate-500 dark:text-slate-400 mt-1">{t('speedTestDesc')}</p>
            </div>
            <Button onClick={runSpeedTest} icon={Activity} size="lg" isLoading={isTesting}>
               {t('startBenchmark')}
            </Button>
         </header>
         
         {/* Summary Cards */}
         {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
               <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-none text-white">
                  <div className="text-blue-100 text-xs font-medium uppercase mb-1">Avg Latency</div>
                  <div className="text-3xl font-bold">{stats.avgLatency}<span className="text-lg opacity-80 font-normal">ms</span></div>
               </Card>
               <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 border-none text-white">
                  <div className="text-indigo-100 text-xs font-medium uppercase mb-1">Avg TTFT</div>
                  <div className="text-3xl font-bold">{stats.avgTtft}<span className="text-lg opacity-80 font-normal">ms</span></div>
               </Card>
               <Card className="bg-white dark:bg-slate-800">
                  <div className="text-slate-500 text-xs font-medium uppercase mb-1">Fastest Model</div>
                  <div className="text-lg font-bold truncate text-green-600 dark:text-green-400">{stats.fastest.model}</div>
                  <div className="text-xs text-slate-400">{stats.fastest.latency}ms</div>
               </Card>
               <Card className="bg-white dark:bg-slate-800">
                  <div className="text-slate-500 text-xs font-medium uppercase mb-1">Models Tested</div>
                  <div className="text-3xl font-bold text-slate-900 dark:text-white">{stats.count}</div>
               </Card>
            </div>
         )}

         {/* Chart */}
         {testResults.some(r => r.status === 'success') && (
            <Card className="mb-8 h-64 p-2">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={testResults.filter(r => r.status === 'success')} layout="vertical" margin={{top: 5, right: 30, left: 20, bottom: 5}}>
                     <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" opacity={0.2} />
                     <XAxis type="number" hide />
                     <YAxis dataKey="model" type="category" width={100} tick={{fontSize: 10, fill: '#94a3b8'}} />
                     <Tooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}} />
                     <Bar dataKey="latency" name="Total Latency" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20}>
                        {testResults.filter(r => r.status === 'success').map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={entry.latency < 500 ? '#22c55e' : entry.latency < 1000 ? '#eab308' : '#ef4444'} />
                        ))}
                     </Bar>
                  </BarChart>
               </ResponsiveContainer>
            </Card>
         )}
         
         {/* Results Grid */}
         <div className="grid md:grid-cols-2 gap-4">
            {testResults.map(r => (
               <div key={r.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex items-center gap-4 shadow-sm">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                     r.status === 'loading' ? 'bg-slate-100 dark:bg-slate-700' : 
                     r.status === 'success' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 
                     'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                  }`}>
                     {r.status === 'loading' ? <Activity className="animate-spin" size={20}/> : 
                      r.status === 'success' ? <CheckCircle size={20}/> : <AlertTriangle size={20}/>}
                  </div>
                  <div className="flex-1 min-w-0">
                     <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold truncate text-slate-900 dark:text-white">{r.model}</h4>
                        {r.status === 'success' && (
                           <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                              r.latency < 500 ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400' : 
                              r.latency < 1500 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400' : 
                              'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400'
                           }`}>
                              {r.latency} ms
                           </span>
                        )}
                     </div>
                     <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                        <Badge variant="neutral">{r.provider}</Badge>
                        {r.ttft && <span>TTFT: {r.ttft}ms</span>}
                        {r.status === 'error' && <span className="text-red-500 truncate">{r.errorMsg}</span>}
                     </div>
                  </div>
               </div>
            ))}
            {testResults.length === 0 && !isTesting && (
               <div className="col-span-2 text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                     <Activity size={32} />
                  </div>
                  <p className="text-slate-500">{t('speedTestDesc')}</p>
                  <Button variant="outline" className="mt-4" onClick={runSpeedTest}>{t('startBenchmark')}</Button>
               </div>
            )}
         </div>
       </div>
     );
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200 font-sans transition-colors duration-300">
      {/* Sidebar */}
      <aside className="hidden md:flex w-72 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800/50">
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                <Zap size={24} fill="currentColor" />
             </div>
             <div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-none">OmniBench</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Multi-Model AI Tester</p>
             </div>
           </div>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-6">
          <SidebarItem active={view === 'settings'} icon={SettingsIcon} label={t('settings')} onClick={() => setView('settings')} />
          <SidebarItem active={view === 'chat'} icon={MessageSquare} label={t('chat')} onClick={() => setView('chat')} />
          <SidebarItem active={view === 'speedtest'} icon={Activity} label={t('speedTest')} onClick={() => setView('speedtest')} />
        </nav>
        <div className="p-6 border-t border-slate-100 dark:border-slate-800/50">
           <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400">v2.3.0 • Local Storage</p>
           </div>
        </div>
      </aside>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-slate-950/95 md:hidden flex flex-col p-6 animate-in fade-in duration-200">
          <div className="flex justify-end mb-8">
            <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100">
              <X size={24} />
            </button>
          </div>
          <div className="space-y-2">
            <SidebarItem active={view === 'settings'} icon={SettingsIcon} label={t('settings')} onClick={() => {setView('settings'); setMobileMenuOpen(false)}} />
            <SidebarItem active={view === 'chat'} icon={MessageSquare} label={t('chat')} onClick={() => {setView('chat'); setMobileMenuOpen(false)}} />
            <SidebarItem active={view === 'speedtest'} icon={Activity} label={t('speedTest')} onClick={() => {setView('speedtest'); setMobileMenuOpen(false)}} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-10">
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center">
                <Zap size={18} fill="currentColor" />
             </div>
             <span className="font-bold text-slate-900 dark:text-white">OmniBench</span>
          </div>
          <button onClick={() => setMobileMenuOpen(true)} className="p-2 text-slate-600 dark:text-slate-300">
            <Menu size={24} />
          </button>
        </div>

        {/* Feedback Toast */}
        {feedbackMsg && (
          <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full shadow-xl border text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-4 ${
            feedbackMsg.type === 'success' ? 'bg-green-50 dark:bg-green-900/80 text-green-700 dark:text-green-100 border-green-200 dark:border-green-800' :
            feedbackMsg.type === 'error' ? 'bg-red-50 dark:bg-red-900/80 text-red-700 dark:text-red-100 border-red-200 dark:border-red-800' :
            'bg-slate-800 text-white border-slate-700'
          }`}>
            {feedbackMsg.type === 'success' ? <CheckCircle size={14}/> : 
             feedbackMsg.type === 'error' ? <AlertTriangle size={14}/> : 
             <Info size={14}/>}
            {feedbackMsg.msg}
          </div>
        )}

        {/* Views */}
        {view === 'settings' && renderSettings()}
        {view === 'chat' && renderChat()}
        {view === 'speedtest' && renderSpeedTest()}
      </main>
    </div>
  );
}
