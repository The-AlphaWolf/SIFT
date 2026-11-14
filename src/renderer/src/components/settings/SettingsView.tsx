import React, { useEffect, useState } from 'react';
import {
  Cpu,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Shield,
  Sliders,
} from 'lucide-react';
import type { AIProviderConfig, AIConnectionTestResult } from '@shared/contracts/ipc-api';
import { useToast } from '../common/Toast';

export function SettingsView(): JSX.Element {
  const toast = useToast();
  const [provider, setProvider] = useState<'ollama' | 'lmstudio'>('ollama');
  const [baseUrl, setBaseUrl] = useState('http://127.0.0.1:11434');
  const [model, setModel] = useState('qwen2.5:3b');
  const [timeoutMs, setTimeoutMs] = useState(10000);
  const [closeBehavior, setCloseBehavior] = useState('minimizeToTray');

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<AIConnectionTestResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!window.api) return;
    window.api.getAiSettings().then((cfg) => {
      setProvider(cfg.provider);
      setBaseUrl(cfg.baseUrl);
      setModel(cfg.model);
      setTimeoutMs(cfg.timeoutMs);
    }).catch(console.error);

    window.api.getAppSettings().then((settings) => {
      if (settings.closeBehavior) {
        setCloseBehavior(settings.closeBehavior);
      }
    }).catch(console.error);
  }, []);

  const handleProviderChange = (newProvider: 'ollama' | 'lmstudio') => {
    setProvider(newProvider);
    if (newProvider === 'ollama') {
      setBaseUrl('http://127.0.0.1:11434');
      setModel('qwen2.5:3b');
    } else {
      setBaseUrl('http://127.0.0.1:1234');
      setModel('qwen2.5-3b-instruct');
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
        timeoutMs,
      });
      setTestResult(res);
      if (res.success) {
        toast.success(`Connected to ${provider}`, `${res.latencyMs} ms latency`);
      } else {
        toast.error('AI connection failed', res.error);
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
        timeoutMs,
      });
      await window.api.updateAppSettings('closeBehavior', closeBehavior);
      toast.success('Settings saved', 'Configurations updated');
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
          <h2 className="text-base font-medium text-[#ededed]">Settings</h2>
          <p className="text-xs text-[#85858b]">
            Local inference endpoints, desktop behavior, and hardware profile
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-3 py-1.5 rounded-lg bg-[#ededed] hover:bg-white text-[#141415] text-xs font-medium surface-highlight flex items-center space-x-1.5 transition-colors duration-150 cursor-pointer disabled:opacity-50"
        >
          {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          <span>Save settings</span>
        </button>
      </div>

      {/* Local AI Inference Configuration Card */}
      <div className="rounded-xl border border-white/[0.08] bg-[#19191b] space-y-4 p-5">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div className="flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-[#85858b]" />
            <h3 className="text-xs font-medium text-[#ededed]">Local AI inference provider</h3>
          </div>
          <span className="text-[11px] text-[#85858b] font-mono">100% offline • localhost</span>
        </div>

        {/* Provider Switcher Tabs */}
        <div className="space-y-1.5">
          <label className="text-xs text-[#85858b]">Active inference provider</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleProviderChange('ollama')}
              className={`p-3 rounded-lg border text-left transition-colors duration-150 cursor-pointer ${
                provider === 'ollama'
                  ? 'bg-[#232325] border-white/[0.14] text-[#ededed] surface-highlight'
                  : 'bg-[#141415] border-white/[0.08] text-[#85858b] hover:text-[#ededed]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-xs text-[#ededed]">Ollama</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] font-mono text-[#85858b]">11434</span>
              </div>
              <div className="text-[10px] text-[#85858b] mt-1">
                Local LLM daemon (Qwen 2.5, Llama 3.2, Mistral)
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleProviderChange('lmstudio')}
              className={`p-3 rounded-lg border text-left transition-colors duration-150 cursor-pointer ${
                provider === 'lmstudio'
                  ? 'bg-[#232325] border-white/[0.14] text-[#ededed] surface-highlight'
                  : 'bg-[#141415] border-white/[0.08] text-[#85858b] hover:text-[#ededed]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-xs text-[#ededed]">LM Studio</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] font-mono text-[#85858b]">1234</span>
              </div>
              <div className="text-[10px] text-[#85858b] mt-1">
                OpenAI-compatible local server with GGUF acceleration
              </div>
            </button>
          </div>
        </div>

        {/* Base URL and Model Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <div className="space-y-1.5">
            <label className="text-xs text-[#85858b]">Provider endpoint URL</label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="w-full bg-[#141415] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-[#ededed] font-mono focus:border-white/[0.2] focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-[#85858b]">Model identifier</label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="e.g. qwen2.5:3b, llama3.2:3b"
              className="w-full bg-[#141415] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-[#ededed] font-mono focus:border-white/[0.2] focus:outline-none"
            />
          </div>
        </div>

        {/* Test Connection Button & Result */}
        <div className="pt-2 flex flex-col space-y-3">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting}
            className="w-full md:w-auto px-3.5 py-2 rounded-lg bg-[#232325] hover:bg-white/[0.12] text-[#ededed] border border-white/[0.08] text-xs font-normal flex items-center justify-center space-x-2 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
            <span>Test endpoint & discover models</span>
          </button>

          {testResult && (
            <div
              className={`p-3 rounded-lg border text-xs flex items-start space-x-2.5 ${
                testResult.success
                  ? 'bg-[#141415] border-[#4cc38a]/30 text-[#4cc38a]'
                  : 'bg-[#141415] border-[#e5484d]/30 text-[#e5484d]'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-[#4cc38a] shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-[#e5484d] shrink-0 mt-0.5" />
              )}
              <div className="space-y-1.5 flex-1">
                <div className="font-medium text-[#ededed]">
                  {testResult.success
                    ? `Connected successfully (${testResult.latencyMs} ms)`
                    : 'Connection failed'}
                </div>
                {testResult.success && testResult.models.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[11px] text-[#85858b]">Available models:</span>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {testResult.models.map((m) => (
                        <button
                          key={m}
                          onClick={() => {
                            setModel(m);
                            toast.info('Model Selected', m);
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-colors cursor-pointer ${
                            model === m
                              ? 'bg-white/[0.1] border-white/[0.2] text-[#ededed]'
                              : 'bg-white/[0.03] border-white/[0.06] text-[#85858b] hover:text-[#ededed]'
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
            <Sliders className="w-4 h-4 text-[#85858b]" />
            <h3 className="text-xs font-medium text-[#ededed]">Desktop behavior</h3>
          </div>
          <span className="text-[11px] text-[#85858b]">Windows 11 integration</span>
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

      {/* Hardware Profile & Privacy Card */}
      <div className="rounded-xl border border-white/[0.08] bg-[#19191b] p-5 space-y-3">
        <div className="flex items-center space-x-2">
          <Shield className="w-4 h-4 text-[#85858b]" />
          <h3 className="text-xs font-medium text-[#ededed]">Hardware profile & offline guarantee</h3>
        </div>
        <p className="text-xs text-[#85858b] leading-relaxed">
          SIFT operates with 100% local execution. Files, extracted text, embeddings, and search queries remain on your local NVMe storage.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1 text-xs">
          <div className="p-2.5 rounded-lg bg-[#141415] border border-white/[0.06]">
            <span className="text-[#85858b] text-[10px] block">CPU</span>
            <span className="text-[#ededed] font-medium font-mono">Ryzen 7 4800H</span>
          </div>
          <div className="p-2.5 rounded-lg bg-[#141415] border border-white/[0.06]">
            <span className="text-[#85858b] text-[10px] block">GPU</span>
            <span className="text-[#ededed] font-medium font-mono">NVIDIA RTX 3050</span>
          </div>
          <div className="p-2.5 rounded-lg bg-[#141415] border border-white/[0.06]">
            <span className="text-[#85858b] text-[10px] block">RAM</span>
            <span className="text-[#ededed] font-medium font-mono">24 GB DDR4</span>
          </div>
          <div className="p-2.5 rounded-lg bg-[#141415] border border-white/[0.06]">
            <span className="text-[#85858b] text-[10px] block">Embeddings</span>
            <span className="text-[#ededed] font-medium font-mono">MiniLM-L6-v2 (CPU)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
