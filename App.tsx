
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
  BarChart2
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

import { DEFAULT_SYSTEM_PROMPT, DEFAULT_SETTINGS, SUGGESTED_MODELS, TRANSLATIONS } from './constants';
import { AppSettings, Message, ModelOption, Provider, SpeedTestResult, ViewState } from './types';
import { 
  generateOpenAIContent, 
  generateAnthropicContent, 
  fetchOpenAIModels,
  fetchGeminiModels,
  generateGeminiContentRest
} from './services/externalServices';

import { Button, Input, Select, Card, Badge, SegmentedControl, Textarea } from './ui';

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
          language: parsed.language || 'en',
          theme: parsed.theme || 'dark'
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

  const saveSettings = () => {
    localStorage.setItem('omni_settings_v2', JSON.stringify(settings));
    localStorage.setItem('omni_models', JSON.stringify(availableModels));
    showFeedback(settings.language === 'zh' ? '配置已保存' : 'Settings Saved', 'success');
  };

  const showFeedback = (msg: string, type: 'success'|'error'|'info') => {
    setFeedbackMsg({ msg, type });
    setTimeout(() => setFeedbackMsg(null), 6000);
  };

  // --- Logic ---

  const fetchModelsForProvider = async (provider: Provider) => {
    try {
      let newModels: ModelOption[] = [];
      let config;
      
      if (provider === Provider.OPENAI) {
        config = settings.openai;
        newModels = await fetchOpenAIModels(config.baseUrl, config.apiKey);
      } else if (provider === Provider.GOOGLE) {
        config = settings.google;
        newModels = await fetchGeminiModels(config.baseUrl, config.apiKey);
      } else {
        throw new Error("Auto-fetch not supported for Claude. Add manually.");
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
        showFeedback("CORS Error. See Warning.", 'error');
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
        result = await generateGeminiContentRest(settings.google.baseUrl, settings.google.apiKey, model.id, userMsg.content, DEFAULT_SYSTEM_PROMPT);
      } else if (model.provider === Provider.OPENAI) {
        result = await generateOpenAIContent(settings.openai.baseUrl, settings.openai.apiKey, model.id, userMsg.content, DEFAULT_SYSTEM_PROMPT);
      } else if (model.provider === Provider.ANTHROPIC) {
        result = await generateAnthropicContent(settings.anthropic.baseUrl, settings.anthropic.apiKey, model.id, userMsg.content, DEFAULT_SYSTEM_PROMPT);
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
    if (availableModels.length === 0) {
        showFeedback(t('noModels'), "error");
        return;
    }
    setIsTesting(true);
    setTestResults([]);
    const prompt = "Ping";

    for (const model of availableModels) {
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
             res = await generateGeminiContentRest(settings.google.baseUrl, settings.google.apiKey, model.id, prompt);
        } else if (model.provider === Provider.OPENAI) {
             res = await generateOpenAIContent(settings.openai.baseUrl, settings.openai.apiKey, model.id, prompt);
        } else if (model.provider === Provider.ANTHROPIC) {
             res = await generateAnthropicContent(settings.anthropic.baseUrl, settings.anthropic.apiKey, model.id, prompt);
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

  // --- Render Helpers for Speed Test ---

  const getSpeedStats = () => {
    const successful = testResults.filter(r => r.status === 'success');
    if (successful.length === 0) return null;

    const fastest = successful.reduce((prev, curr) => prev.latency < curr.latency ? prev : curr);
    const avgLatency = Math.round(successful.reduce((sum, curr) => sum + curr.latency, 0) / successful.length);
    const avgTtft = Math.round(successful.reduce((sum, curr) => sum + (curr.ttft || 0), 0) / successful.length);
    
    return { fastest, avgLatency, avgTtft, count: successful.length };
  };

  const maxLatency = Math.max(...testResults.filter(r => r.status === 'success').map(r => r.latency), 1);

  // --- Render Views ---

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

      {/* CORS Warning */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-8 text-sm flex items-start gap-4">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg text-amber-600 dark:text-amber-400 shrink-0">
             <AlertTriangle size={24} />
          </div>
          <div>
             <strong className="block mb-1 text-amber-800 dark:text-amber-300 text-base">{t('corsTitle')}</strong>
             <p className="text-amber-700 dark:text-amber-400/80 leading-relaxed">{t('corsDesc')}</p>
             <div className="flex flex-col gap-1 mt-2 text-amber-800 dark:text-amber-400 opacity-90">
                <span className="flex items-center gap-2"><CheckCircle size={12}/> {t('corsOption1')}</span>
                <span className="flex items-center gap-2"><CheckCircle size={12}/> <strong>{t('corsOption2')}</strong></span>
             </div>
          </div>
      </div>

      {/* Providers Grid */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {/* Google Config */}
        <Card>
           <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <div className="w-2 h-8 bg-blue-500 rounded-full"></div>
                Google Gemini
              </h3>
           </div>
           <div className="space-y-4">
              <Input 
                label={t('baseUrl')} 
                placeholder="https://generativelanguage..." 
                value={settings.google.baseUrl} 
                onChange={e=>setSettings({...settings, google:{...settings.google, baseUrl:e.target.value}})} 
                icon={Link}
              />
              <Input 
                label={t('apiKey')} 
                type="password"
                placeholder="AIza..." 
                value={settings.google.apiKey} 
                onChange={e=>setSettings({...settings, google:{...settings.google, apiKey:e.target.value}})} 
                icon={Key}
              />
              <Button 
                variant="secondary" 
                className="w-full" 
                onClick={()=>fetchModelsForProvider(Provider.GOOGLE)} 
                icon={RefreshCw}
              >
                {t('fetchModels')}
              </Button>
           </div>
        </Card>

        {/* OpenAI Config */}
        <Card>
           <div className="flex items-center justify-between mb-4">
             <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <div className="w-2 h-8 bg-green-500 rounded-full"></div>
                OpenAI
             </h3>
           </div>
           <div className="space-y-4">
              <Input 
                label={t('baseUrl')} 
                placeholder="https://api.openai.com/v1" 
                value={settings.openai.baseUrl} 
                onChange={e=>setSettings({...settings, openai:{...settings.openai, baseUrl:e.target.value}})} 
                icon={Link}
              />
              <Input 
                label={t('apiKey')} 
                type="password"
                placeholder="sk-..." 
                value={settings.openai.apiKey} 
                onChange={e=>setSettings({...settings, openai:{...settings.openai, apiKey:e.target.value}})} 
                icon={Key}
              />
              <Button 
                variant="secondary" 
                className="w-full" 
                onClick={()=>fetchModelsForProvider(Provider.OPENAI)} 
                icon={RefreshCw}
              >
                {t('fetchModels')}
              </Button>
           </div>
        </Card>

        {/* Anthropic Config */}
        <Card>
           <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <div className="w-2 h-8 bg-orange-500 rounded-full"></div>
                Anthropic
              </h3>
           </div>
           <div className="space-y-4">
              <Input 
                label={t('baseUrl')} 
                placeholder="https://api.anthropic.com/v1" 
                value={settings.anthropic.baseUrl} 
                onChange={e=>setSettings({...settings, anthropic:{...settings.anthropic, baseUrl:e.target.value}})} 
                icon={Link}
              />
              <Input 
                label={t('apiKey')} 
                type="password"
                placeholder="sk-ant..." 
                value={settings.anthropic.apiKey} 
                onChange={e=>setSettings({...settings, anthropic:{...settings.anthropic, apiKey:e.target.value}})} 
                icon={Key}
              />
              <Button variant="secondary" disabled className="w-full opacity-50 cursor-not-allowed">
                Fetch Not Supported
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
                     <tr key={m.id + m.provider} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                        <td className="p-4">
                          <Badge variant="neutral">{m.provider}</Badge>
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
          <div className="flex justify-end mb-8"><button onClick={() => setMobileMenuOpen(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full"><X size={24} /></button></div>
          <nav className="space-y-4">
            <Button variant={view === 'settings' ? 'primary' : 'ghost'} className="w-full justify-start text-lg h-14" onClick={() => {setView('settings'); setMobileMenuOpen(false)}} icon={SettingsIcon}>{t('settings')}</Button>
            <Button variant={view === 'chat' ? 'primary' : 'ghost'} className="w-full justify-start text-lg h-14" onClick={() => {setView('chat'); setMobileMenuOpen(false)}} icon={MessageSquare}>{t('chat')}</Button>
            <Button variant={view === 'speedtest' ? 'primary' : 'ghost'} className="w-full justify-start text-lg h-14" onClick={() => {setView('speedtest'); setMobileMenuOpen(false)}} icon={Activity}>{t('speedTest')}</Button>
          </nav>
        </div>
      )}

      <main className="flex-1 overflow-hidden relative flex flex-col bg-slate-50 dark:bg-slate-950">
        {/* Top Bar Mobile */}
        <div className="md:hidden p-4 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur flex justify-between items-center z-20">
           <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
             <Zap size={20} className="text-blue-600"/> OmniBench
           </div>
           <button onClick={() => setMobileMenuOpen(true)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><Menu size={24}/></button>
        </div>

        {view === 'chat' && (
            <div className="flex flex-col h-full relative">
              {/* Chat Header */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-4 justify-between items-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-md z-10 shadow-sm">
                <div className="flex items-center gap-3 self-start md:self-center">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                    <MessageSquare size={20} />
                  </div>
                  <h2 className="font-bold text-slate-800 dark:text-slate-100 hidden md:block">{t('chatInterface')}</h2>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                   <div className="w-full md:w-[320px]">
                     <Select 
                       placeholder={t('selectModel')}
                       options={availableModels.map(m => ({ 
                         value: m.id, 
                         label: m.name, 
                         subLabel: `${m.provider} • ${m.id}` 
                       }))}
                       value={selectedModelId}
                       onChange={setSelectedModelId}
                     />
                   </div>
                   <Button 
                     variant="danger" 
                     size="md"
                     onClick={() => setMessages([])} 
                     title={t('clearChat')}
                     className="aspect-square px-0 w-10"
                     icon={Trash2}
                   />
                </div>
              </div>

              {/* Chat Area */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8 relative scroll-smooth">
                {availableModels.length === 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                           <SettingsIcon size={32} className="text-slate-400" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t('noModels')}</h3>
                        <p className="text-slate-500 dark:text-slate-400 max-w-md mb-6">You haven't configured any AI models yet. Head to settings to add API keys or custom models.</p>
                        <Button onClick={() => setView('settings')}>
                          {t('settings')}
                        </Button>
                    </div>
                )}
                
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
                    <div className={`flex flex-col max-w-[90%] md:max-w-[80%] lg:max-w-[70%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`rounded-2xl p-5 shadow-sm relative ${
                        msg.role === 'user' 
                            ? 'bg-blue-600 text-white rounded-br-none' 
                            : msg.role === 'system'
                            ? 'bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-800 dark:text-red-200'
                            : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-none'
                        }`}>
                        {msg.role === 'assistant' && (
                            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-100 dark:border-slate-700/50 text-[10px] font-bold tracking-widest uppercase opacity-70">
                                <span className="text-blue-600 dark:text-blue-400">{msg.provider}</span>
                                <span className="text-slate-300 dark:text-slate-600">•</span>
                                <span>{msg.model}</span>
                                {msg.latency && (
                                    <span className="ml-auto flex items-center gap-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded">
                                        <Activity size={10}/> {msg.latency}ms
                                    </span>
                                )}
                            </div>
                        )}
                        <div className="whitespace-pre-wrap text-sm md:text-base leading-relaxed tracking-wide font-light">{msg.content}</div>
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 px-1">
                           {new Date(msg.timestamp).toLocaleTimeString()}
                        </span>
                    </div>
                  </div>
                ))}
                
                {isGenerating && (
                  <div className="flex justify-start">
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-bl-none p-4 flex items-center gap-2 shadow-sm">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} className="h-4"/>
              </div>

              {/* Input Area */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-20">
                <div className="relative max-w-5xl mx-auto flex gap-3 items-end">
                  <div className="flex-1 relative">
                    <Textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                        placeholder={t('typeMessage')}
                        disabled={availableModels.length === 0}
                        className="min-h-[56px] py-4 pr-14"
                        rows={1}
                    />
                  </div>
                  <Button 
                    onClick={handleSendMessage}
                    disabled={isGenerating || !input.trim() || availableModels.length === 0}
                    className="h-[56px] w-[56px] rounded-xl shrink-0"
                    icon={Send}
                  />
                </div>
              </div>
            </div>
        )}

        {view === 'speedtest' && (
           <div className="p-6 md:p-10 max-w-[1600px] mx-auto h-full overflow-y-auto pb-24 w-full">
             <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
               <div>
                 <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight flex items-center gap-3">
                    <Activity className="text-violet-600" size={32}/>
                    {t('speedTestTitle')}
                 </h1>
                 <p className="text-lg text-slate-500 dark:text-slate-400">{t('speedTestDesc')}</p>
               </div>
               <div className="flex gap-4">
                   <Button 
                    onClick={runSpeedTest} 
                    disabled={isTesting} 
                    size="lg" 
                    className="h-12 px-8 text-lg shadow-xl bg-violet-600 hover:bg-violet-700 shadow-violet-500/30"
                    icon={Activity}
                    >
                    {isTesting ? t('running') : t('startBenchmark')}
                    </Button>
               </div>
             </header>

             {/* KPI Summary Cards - Only show if we have results */}
             {testResults.length > 0 && getSpeedStats() && (
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 animate-in fade-in slide-in-from-bottom-4">
                 <div className="bg-white dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
                   <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-xl">
                      <Trophy size={28} />
                   </div>
                   <div>
                      <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Fastest Model</p>
                      <p className="text-xl font-bold text-slate-900 dark:text-white mt-1 truncate max-w-[200px]">{getSpeedStats()!.fastest.model}</p>
                      <p className="text-sm text-green-600 font-mono">{getSpeedStats()!.fastest.latency}ms</p>
                   </div>
                 </div>
                 <div className="bg-white dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
                   <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl">
                      <Timer size={28} />
                   </div>
                   <div>
                      <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Avg Latency</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{getSpeedStats()!.avgLatency}<span className="text-sm font-normal text-slate-500 ml-1">ms</span></p>
                   </div>
                 </div>
                 <div className="bg-white dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
                   <div className="p-3 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-xl">
                      <BarChart2 size={28} />
                   </div>
                   <div>
                      <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Avg TTFT</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{getSpeedStats()!.avgTtft}<span className="text-sm font-normal text-slate-500 ml-1">ms</span></p>
                   </div>
                 </div>
               </div>
             )}

             <div className="flex flex-col gap-8">
               {/* Chart Section */}
               <Card className="h-[500px] flex flex-col shadow-md p-6 md:p-8">
                 <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase mb-8">{t('latencyComp')}</h3>
                 <div className="flex-1 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={testResults.filter(r=>r.status==='success')} layout="vertical" margin={{ left: 0, right: 50, top: 0, bottom: 0 }} barGap={8}>
                        <CartesianGrid strokeDasharray="3 3" stroke={settings.theme === 'light' ? '#e2e8f0' : '#334155'} horizontal={true} vertical={true} opacity={0.4} />
                        <XAxis type="number" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis dataKey="model" type="category" stroke="#94a3b8" width={180} fontSize={13} fontWeight={500} tickFormatter={(val) => val.length > 25 ? val.substring(0,25)+'...' : val} tickLine={false} axisLine={false} />
                        <Tooltip 
                            cursor={{fill: settings.theme === 'light' ? '#f1f5f9' : '#1e293b', opacity: 0.6}}
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                    <div className="bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-xl shadow-2xl text-sm border border-slate-700/50 min-w-[200px]">
                                    <p className="font-bold text-lg mb-1">{data.model}</p>
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className={`w-2 h-2 rounded-full ${data.provider===Provider.GOOGLE ? 'bg-blue-500' : data.provider===Provider.OPENAI ? 'bg-green-500' : 'bg-orange-500'}`}></span>
                                        <span className="opacity-80 text-xs uppercase tracking-wider">{data.provider}</span>
                                    </div>
                                    <div className="space-y-2 pt-3 border-t border-slate-700/50">
                                        <div className="flex justify-between gap-8">
                                            <span className="text-slate-400">Total Latency:</span> 
                                            <span className="font-mono font-bold text-green-400 text-base">{data.latency}ms</span>
                                        </div>
                                        {data.ttft && (
                                            <div className="flex justify-between gap-8">
                                                <span className="text-slate-400">First Token:</span> 
                                                <span className="font-mono text-blue-400 text-base">{data.ttft}ms</span>
                                            </div>
                                        )}
                                    </div>
                                    </div>
                                );
                                }
                                return null;
                            }}
                        />
                        <Bar dataKey="latency" radius={[0, 6, 6, 0]} barSize={32} animationDuration={1000}>
                            {testResults.filter(r=>r.status==='success').map((e, i) => (
                                <Cell key={i} fill={e.provider===Provider.GOOGLE ? '#3b82f6' : e.provider===Provider.OPENAI ? '#22c55e' : '#f97316'} fillOpacity={0.9} />
                            ))}
                        </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                 </div>
               </Card>
               
               {/* Detailed Stats Table */}
               <Card className="flex flex-col overflow-hidden p-0 shadow-md border-0 ring-1 ring-slate-200 dark:ring-slate-800">
                  <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
                    <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase">Detailed Benchmark Results</h3>
                    <span className="text-xs text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">sorted by provider</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400">
                          <tr>
                              <th className="p-6 font-medium w-[30%]">{t('modelId')}</th>
                              <th className="p-6 font-medium w-[15%]">{t('status')}</th>
                              <th className="p-6 font-medium w-[55%] text-right">Performance Visualization</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {testResults.length === 0 && (
                            <tr>
                                <td colSpan={3} className="p-16 text-center">
                                    <div className="flex flex-col items-center gap-4 text-slate-400">
                                        <Activity size={48} className="opacity-20" />
                                        <p className="text-lg">No benchmark results yet</p>
                                        <Button onClick={runSpeedTest} variant="secondary">Start First Test</Button>
                                    </div>
                                </td>
                            </tr>
                        )}
                        {testResults.map((res) => (
                            <tr key={res.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                            <td className="p-6 align-middle">
                                <div className="flex flex-col gap-1.5">
                                    <span className="font-bold text-base text-slate-900 dark:text-slate-100">{res.model}</span>
                                    <Badge variant="neutral">{res.provider}</Badge>
                                </div>
                            </td>
                            <td className="p-6 align-middle">
                                {res.status === 'success' && <Badge variant="success">{t('success')}</Badge>}
                                {res.status === 'error' && <Badge variant="error">Error</Badge>}
                                {res.status === 'loading' && <div className="flex items-center gap-2 text-amber-500 font-medium"><div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"/>{t('loading')}</div>}
                                {res.status === 'error' && <div className="text-xs text-red-500 mt-2 font-mono bg-red-50 dark:bg-red-900/10 p-2 rounded">{res.errorMsg}</div>}
                            </td>
                            <td className="p-6 align-middle">
                                {res.status === 'success' ? (
                                    <div className="flex flex-col gap-3">
                                        <div className="flex justify-end gap-8 items-baseline">
                                            <div className="flex flex-col items-end">
                                                <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Time To First Token</span>
                                                <span className="font-mono text-lg font-medium text-slate-700 dark:text-slate-300">{res.ttft}ms</span>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Total Latency</span>
                                                <span className="font-mono text-xl font-bold text-green-600 dark:text-green-400">{res.latency}ms</span>
                                            </div>
                                        </div>
                                        {/* Visual Bar */}
                                        <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex justify-end relative">
                                            <div 
                                                className={`h-full rounded-full ${res.provider===Provider.GOOGLE ? 'bg-blue-500' : res.provider===Provider.OPENAI ? 'bg-green-500' : 'bg-orange-500'}`} 
                                                style={{ width: `${Math.max((res.latency / maxLatency) * 100, 5)}%` }} 
                                            />
                                        </div>
                                    </div>
                                ) : <span className="text-slate-300 dark:text-slate-700 block text-right">-</span>}
                            </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                  </div>
               </Card>
             </div>
           </div>
        )}
        
        {view === 'settings' && renderSettings()}
        
        {feedbackMsg && (
           <div className={`fixed bottom-8 right-8 px-6 py-4 rounded-xl shadow-2xl z-50 text-sm flex items-center gap-3 border max-w-md animate-in slide-in-from-bottom-5 fade-in duration-300 ${
             feedbackMsg.type === 'success' ? 'bg-slate-900 border-green-500/50 text-green-400' : 
             feedbackMsg.type === 'error' ? 'bg-slate-900 border-red-500/50 text-red-400' :
             'bg-slate-900 border-blue-500/50 text-blue-400'
           }`}>
             {feedbackMsg.type === 'error' ? <AlertTriangle size={20} className="shrink-0"/> : <CheckCircle size={20} className="shrink-0"/>}
             <div className="font-medium">{feedbackMsg.msg}</div>
           </div>
        )}
      </main>
    </div>
  );
}
