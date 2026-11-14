import React, { useEffect, useState } from 'react';
import {
  Cpu,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  Shield,
  Layers,
  Sliders,
  Check,
} from 'lucide-react';
import type { AIProviderConfig, AIConnectionTestResult } from '@shared/contracts/ipc-api';

export function SettingsView(): JSX.Element {
  const [provider, setProvider] = useState<'ollama' | 'lmstudio'>('ollama');
  const [baseUrl, setBaseUrl] = useState('http://127.0.0.1:11434');
  const [model, setModel] = useState('qwen2.5:3b');
  const [timeoutMs, setTimeoutMs] = useState(10000);
  const [closeBehavior, setCloseBehavior] = useState('minimizeToTray');

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<AIConnectionTestResult | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

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
      if (res.models && res.models.length > 0 && !res.models.includes(model)) {
        // If user's typed model isn't in list, suggest first discovered model
        setModel(res.models[0]);
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        models: [],
        latencyMs: 0,
        error: err?.message || 'Connection failed',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    if (!window.api) return;
    try {
      await window.api.updateAiSettings({
        provider,
        baseUrl,
        model,
        timeoutMs,
      });
      await window.api.updateAppSettings('closeBehavior', closeBehavior);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(`Failed to save settings: ${err.message}`);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-zinc-950">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-zinc-100">Application Settings</h2>
          <p className="text-xs text-zinc-400">
            Configure local inference endpoints, desktop preferences, and hardware offloading.
          </p>
        </div>
        <button
          onClick={handleSave}
          className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 flex items-center space-x-1.5 transition-all"
        >
          {saveSuccess ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
          <span>{saveSuccess ? 'Saved!' : 'Save Settings'}</span>
        </button>
      </div>

      {/* Local AI Inference Configuration Card */}
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 overflow-hidden space-y-4 p-5">
        <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
          <div className="flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-semibold text-zinc-200">Local AI Inference Provider</h3>
          </div>
          <span className="text-[11px] text-zinc-500">100% Offline • Localhost only</span>
        </div>

        {/* Provider Switcher Tabs */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-300">Active Provider</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleProviderChange('ollama')}
              className={`p-3 rounded-lg border text-left transition-all ${
                provider === 'ollama'
                  ? 'bg-indigo-600/15 border-indigo-500/50 text-indigo-200 shadow-sm'
                  : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <div className="font-semibold text-xs">Ollama</div>
              <div className="text-[10px] text-zinc-500 mt-0.5">Default port 11434</div>
            </button>

            <button
              type="button"
              onClick={() => handleProviderChange('lmstudio')}
              className={`p-3 rounded-lg border text-left transition-all ${
                provider === 'lmstudio'
                  ? 'bg-indigo-600/15 border-indigo-500/50 text-indigo-200 shadow-sm'
                  : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <div className="font-semibold text-xs">LM Studio</div>
              <div className="text-[10px] text-zinc-500 mt-0.5">Default port 1234</div>
            </button>
          </div>
        </div>

        {/* Base URL and Model Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">Provider Endpoint URL</label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-2 text-xs text-zinc-200 font-mono focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">Model Name</label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="e.g. qwen2.5:3b, llama3.2:3b"
              className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-2 text-xs text-zinc-200 font-mono focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Test Connection Button & Result */}
        <div className="pt-2 flex flex-col space-y-3">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting}
            className="w-full md:w-auto px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
            <span>Test Endpoint & Discover Models</span>
          </button>

          {testResult && (
            <div
              className={`p-3 rounded-lg border text-xs flex items-start space-x-2.5 ${
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
              <div className="space-y-1">
                <div className="font-semibold">
                  {testResult.success
                    ? `Connected successfully (${testResult.latencyMs} ms)`
                    : 'Connection Failed'}
                </div>
                {testResult.success && testResult.models.length > 0 && (
                  <div className="text-[11px] text-zinc-400">
                    Discovered models: {testResult.models.join(', ')}
                  </div>
                )}
                {testResult.error && (
                  <div className="text-[11px] text-zinc-400">{testResult.error}</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Shell Preferences Card */}
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 overflow-hidden space-y-4 p-5">
        <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
          <div className="flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-semibold text-zinc-200">Desktop Behavior</h3>
          </div>
          <span className="text-[11px] text-zinc-500">Windows 11 Integration</span>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="space-y-0.5">
            <div className="text-xs font-medium text-zinc-200">Window Close Action</div>
            <p className="text-[11px] text-zinc-500">
              Keep SIFT active in the system tray for real-time filesystem watching.
            </p>
          </div>
          <select
            value={closeBehavior}
            onChange={(e) => setCloseBehavior(e.target.value)}
            className="bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none"
          >
            <option value="minimizeToTray">Minimize to System Tray</option>
            <option value="quit">Exit Application</option>
          </select>
        </div>
      </div>

      {/* Hardware Profile & Privacy Card */}
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/20 p-5 space-y-3">
        <div className="flex items-center space-x-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-semibold text-zinc-200">Hardware Profile & Privacy Guarantee</h3>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">
          SIFT operates under strict local-first privacy. No files, metadata, extracted text, embeddings, or search queries ever leave your machine.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 text-xs">
          <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/60">
            <span className="text-zinc-500 text-[10px] block">CPU</span>
            <span className="text-zinc-200 font-semibold">Ryzen 7 4800H</span>
          </div>
          <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/60">
            <span className="text-zinc-500 text-[10px] block">GPU</span>
            <span className="text-zinc-200 font-semibold">NVIDIA RTX 3050</span>
          </div>
          <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/60">
            <span className="text-zinc-500 text-[10px] block">RAM</span>
            <span className="text-zinc-200 font-semibold">24 GB DDR4</span>
          </div>
          <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/60">
            <span className="text-zinc-500 text-[10px] block">Local Embedder</span>
            <span className="text-zinc-200 font-semibold">MiniLM-L6-v2</span>
          </div>
        </div>
      </div>
    </div>
  );
}
