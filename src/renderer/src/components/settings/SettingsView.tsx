import React, { useEffect, useState } from 'react';
import {
  Cpu,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Shield,
  Sliders,
  Key,
  Eye,
  EyeOff,
  Globe,
  Sparkles,
} from 'lucide-react';
import type {
  AIProviderConfig,
  AIConnectionTestResult,
  AIProviderType,
  HardwareProfile,
} from '@shared/contracts/ipc-api';
import { useToast } from '../common/Toast';

interface ProviderPreset {
  id: AIProviderType;
  name: string;
  badge: string;
  desc: string;
  defaultUrl: string;
  defaultModel: string;
  isCloud: boolean;
  keyPlaceholder: string;
  hint: string;
}

const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: 'ollama',
    name: 'Ollama',
    badge: '11434',
    desc: 'Local daemon (Qwen 2.5, Llama 3.2, Mistral)',
    defaultUrl: 'http://127.0.0.1:11434',
    defaultModel: 'qwen2.5:3b-instruct',
    isCloud: false,
    keyPlaceholder: 'Optional (if reverse-proxied)',
    hint: 'Runs 100% offline via local Ollama service.',
  },
  {
    id: 'lmstudio',
    name: 'LM Studio',
    badge: '1234',
    desc: 'Local OpenAI server with GGUF acceleration',
    defaultUrl: 'http://127.0.0.1:1234',
    defaultModel: 'qwen2.5-3b-instruct',
    isCloud: false,
    keyPlaceholder: 'Optional (if reverse-proxied)',
    hint: 'Start Local Server in LM Studio (<-> tab).',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    badge: 'Cloud',
    desc: 'GPT-4o, GPT-4o-mini with fast cloud inference',
    defaultUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    isCloud: true,
    keyPlaceholder: 'sk-proj-...',
    hint: 'Get an API key from platform.openai.com/api-keys',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    badge: 'Cloud',
    desc: 'Gemini 1.5 Flash / 2.0 Flash via Google AI',
    defaultUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-1.5-flash',
    isCloud: true,
    keyPlaceholder: 'AIzaSy...',
    hint: 'Get an API key from aistudio.google.com/app/apikey',
  },
  {
    id: 'custom',
    name: 'Custom / BYO',
    badge: 'OpenAI API',
    desc: 'Groq, OpenRouter, DeepSeek, Together, or LAN',
    defaultUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    isCloud: true,
    keyPlaceholder: 'Bearer key or API token',
    hint: 'Works with any OpenAI-compatible API endpoint.',
  },
];

export function SettingsView(): JSX.Element {
  const toast = useToast();
  const [provider, setProvider] = useState<AIProviderType>('ollama');
  const [baseUrl, setBaseUrl] = useState('http://127.0.0.1:11434');
  const [model, setModel] = useState('qwen2.5:3b-instruct');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [timeoutMs, setTimeoutMs] = useState(10000);
  const [closeBehavior, setCloseBehavior] = useState('minimizeToTray');

  const [hardware, setHardware] = useState<HardwareProfile | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<AIConnectionTestResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!window.api) return;

    window.api
      .getAiSettings()
      .then((cfg) => {
        setProvider(cfg.provider || 'ollama');
        setBaseUrl(cfg.baseUrl || 'http://127.0.0.1:11434');
        setModel(cfg.model || 'qwen2.5:3b-instruct');
        setApiKey(cfg.apiKey || '');
        setTimeoutMs(cfg.timeoutMs || 10000);
      })
      .catch(console.error);

    window.api
      .getAppSettings()
      .then((settings) => {
        if (settings.closeBehavior) {
          setCloseBehavior(settings.closeBehavior);
        }
      })
      .catch(console.error);

    window.api
      .getHardwareProfile?.()
      ?.then(setHardware)
      ?.catch(console.error);
  }, []);

  const currentPreset =
    PROVIDER_PRESETS.find((p) => p.id === provider) || PROVIDER_PRESETS[0];

  const handleProviderChange = (newProvider: AIProviderType) => {
    setProvider(newProvider);
    const preset = PROVIDER_PRESETS.find((p) => p.id === newProvider);
    if (preset) {
      setBaseUrl(preset.defaultUrl);
      setModel(preset.defaultModel);
    }
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    if (!window.api) return;
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await window.api.testAiConnection({
        provider,
        baseUrl,
        model,
        apiKey: apiKey.trim() || undefined,
        timeoutMs,
      });
      setTestResult(res);
      if (res.success) {
        toast.success(
          `Connected to ${currentPreset.name}`,
          `${res.latencyMs} ms latency`
        );
      } else {
        toast.error('AI connection failed', res.error || 'Connection error');
      }
    } catch (err: any) {
      const errorMsg = err?.message || 'Connection failed';
      setTestResult({
        success: false,
        models: [],
        latencyMs: 0,
        error: errorMsg,
      });
      toast.error('AI provider offline', errorMsg);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    if (!window.api) return;
    setIsSaving(true);
    try {
      await window.api.updateAiSettings({
        provider,
        baseUrl,
        model,
        apiKey: apiKey.trim(),
        timeoutMs,
      });
      await window.api.updateAppSettings('closeBehavior', closeBehavior);
      toast.success('Settings saved', 'Configurations and API key persisted');
    } catch (err: any) {
      toast.error('Failed to save settings', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#141415] text-[#ededed]">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-1">
        <div className="space-y-0.5">
          <h2 className="text-base font-semibold text-[#ededed] flex items-center space-x-2">
            <span>Settings</span>
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
          </h2>
          <p className="text-xs text-[#85858b]">
            AI inference provider, API keys, desktop behavior, and machine specs
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 flex items-center space-x-1.5 transition-colors duration-150 cursor-pointer disabled:opacity-50"
        >
          {isSaving ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          <span>Save settings</span>
        </button>
      </div>

      {/* AI Inference Provider & API Key Configuration Card */}
      <div className="rounded-xl border border-white/[0.08] bg-[#19191b] space-y-4 p-5 hover:border-indigo-500/30 transition-colors">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-semibold text-[#ededed]">
              AI Query Interpreter & Intelligence Provider
            </h3>
          </div>
          {currentPreset.isCloud ? (
            <span className="text-[11px] text-cyan-300 font-mono bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/25 flex items-center space-x-1.5">
              <Globe className="w-3 h-3" />
              <span>BYO API Key • Cloud Inference</span>
            </span>
          ) : (
            <span className="text-[11px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              100% Offline • Localhost
            </span>
          )}
        </div>

        {/* Provider Switcher Tabs */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[#a1a1a6]">
            Select inference provider
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            {PROVIDER_PRESETS.map((p) => {
              const isSelected = provider === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleProviderChange(p.id)}
                  className={`p-3 rounded-xl border text-left transition-colors duration-150 cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-indigo-600/15 border-indigo-500/50 text-indigo-200 shadow-sm'
                      : 'bg-[#141415] border-white/[0.08] text-[#85858b] hover:text-[#ededed] hover:border-white/[0.14]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-xs text-[#ededed]">
                      {p.name}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                        p.isCloud
                          ? 'bg-cyan-500/20 text-cyan-300'
                          : 'bg-indigo-500/20 text-indigo-300'
                      }`}
                    >
                      {p.badge}
                    </span>
                  </div>
                  <div className="text-[10px] text-[#85858b] line-clamp-2">
                    {p.desc}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* API Key Input (Highlighted for Cloud & Custom Providers) */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-[#a1a1a6] flex items-center space-x-1.5">
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>
                API Key {currentPreset.isCloud ? '(Required for Cloud)' : '(Optional)'}
              </span>
            </label>
            <span className="text-[10px] text-[#85858b]">{currentPreset.hint}</span>
          </div>
          <div className="relative">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={currentPreset.keyPlaceholder}
              className="w-full bg-[#141415] border border-white/[0.08] rounded-lg pl-3 pr-10 py-2 text-xs text-amber-200 font-mono focus:border-amber-500/50 focus:outline-none placeholder:text-[#52525b]"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#85858b] hover:text-[#ededed] transition-colors p-1"
            >
              {showApiKey ? (
                <EyeOff className="w-3.5 h-3.5" />
              ) : (
                <Eye className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Base URL and Model Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#a1a1a6]">
              Provider endpoint URL
            </label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="w-full bg-[#141415] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-indigo-300 font-mono focus:border-indigo-500/50 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#a1a1a6]">
              Model identifier
            </label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="e.g. gpt-4o-mini, gemini-1.5-flash, qwen2.5:3b"
              className="w-full bg-[#141415] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-indigo-300 font-mono focus:border-indigo-500/50 focus:outline-none"
            />
          </div>
        </div>

        {/* Test Connection Button & Result */}
        <div className="pt-2 flex flex-col space-y-3">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting}
            className="w-full md:w-auto px-4 py-2 rounded-lg bg-[#232325] hover:bg-indigo-600/20 text-[#ededed] hover:text-indigo-300 border border-white/[0.08] hover:border-indigo-500/30 text-xs font-medium flex items-center justify-center space-x-2 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                isTesting ? 'animate-spin text-indigo-400' : 'text-indigo-400'
              }`}
            />
            <span>Test endpoint & authenticate</span>
          </button>

          {testResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-start space-x-3 ${
                testResult.success
                  ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1.5 flex-1">
                <div className="font-semibold text-[#ededed]">
                  {testResult.success
                    ? `Connected successfully (${testResult.latencyMs} ms)`
                    : 'Connection failed'}
                </div>
                {testResult.success && testResult.models.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[11px] text-[#a1a1a6]">
                      Available / Verified models:
                    </span>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {testResult.models.slice(0, 15).map((m) => (
                        <button
                          key={m}
                          onClick={() => {
                            setModel(m);
                            toast.info('Model Selected', m);
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-colors cursor-pointer ${
                            model === m
                              ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200 font-semibold'
                              : 'bg-[#141415] border-white/[0.08] text-[#85858b] hover:text-[#ededed]'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {testResult.error && (
                  <div className="text-[11px] text-[#85858b]">{testResult.error}</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Shell Preferences Card */}
      <div className="rounded-xl border border-white/[0.08] bg-[#19191b] space-y-4 p-5">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div className="flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-semibold text-[#ededed]">Desktop behavior</h3>
          </div>
          <span className="text-[11px] text-[#85858b]">OS Integration</span>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="space-y-0.5">
            <div className="text-xs font-medium text-[#ededed]">Window close action</div>
            <p className="text-[11px] text-[#85858b]">
              Keep SIFT active in the system tray for real-time filesystem watching
            </p>
          </div>
          <select
            value={closeBehavior}
            onChange={(e) => setCloseBehavior(e.target.value)}
            className="bg-[#141415] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-[#ededed] focus:outline-none cursor-pointer"
          >
            <option value="minimizeToTray">Minimize to system tray</option>
            <option value="quit">Exit application</option>
          </select>
        </div>
      </div>

      {/* Dynamic Machine Hardware Specs Card */}
      <div className="rounded-xl border border-white/[0.08] bg-[#19191b] p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-semibold text-[#ededed]">
              Detected Machine Hardware Profile
            </h3>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            {hardware ? hardware.osPlatform : 'Auto-detected'}
          </span>
        </div>
        <p className="text-xs text-[#85858b] leading-relaxed">
          SIFT auto-tunes its vector search and text-extraction pipelines based on your host
          machine's available hardware. Search index and document contents never leave your device.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1 text-xs">
          <div className="p-2.5 rounded-lg bg-[#141415] border border-white/[0.06]">
            <span className="text-[#85858b] text-[10px] block">CPU Processor</span>
            <span className="text-indigo-300 font-semibold font-mono truncate block" title={hardware?.cpuModel}>
              {hardware ? `${hardware.cpuModel} (${hardware.cpuCores}T)` : 'Detecting...'}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-[#141415] border border-white/[0.06]">
            <span className="text-[#85858b] text-[10px] block">Graphics Adapter</span>
            <span className="text-emerald-300 font-semibold font-mono truncate block" title={hardware?.gpuName}>
              {hardware ? hardware.gpuName : 'Detecting...'}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-[#141415] border border-white/[0.06]">
            <span className="text-[#85858b] text-[10px] block">System Memory</span>
            <span className="text-amber-300 font-semibold font-mono">
              {hardware ? `${hardware.totalRamGb} GB RAM (${hardware.freeRamGb} GB free)` : 'Detecting...'}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-[#141415] border border-white/[0.06]">
            <span className="text-[#85858b] text-[10px] block">Local Embedder</span>
            <span className="text-cyan-300 font-semibold font-mono">
              MiniLM-L6-v2 (CPU ONNX)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
