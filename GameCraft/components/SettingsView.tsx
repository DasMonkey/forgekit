import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Key, Save, Eye, EyeOff, Trash2, Check, Settings as SettingsIcon } from 'lucide-react';
import { maskApiKey } from '../utils/encryption';

export const SettingsView: React.FC = () => {
  const { state, setApiKey, removeApiKey } = useAuth();
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSavingApiKey, setIsSavingApiKey] = useState(false);
  const [apiKeySuccess, setApiKeySuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApiKeySave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingApiKey(true);
    setError(null);
    setApiKeySuccess(false);

    try {
      setApiKey(apiKeyInput);
      setApiKeyInput('');
      setApiKeySuccess(true);
      setTimeout(() => setApiKeySuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save API key');
    } finally {
      setIsSavingApiKey(false);
    }
  };

  const handleApiKeyRemove = () => {
    if (confirm('Are you sure you want to remove your API key?')) {
      removeApiKey();
      setApiKeyInput('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 pt-24 pb-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <SettingsIcon className="w-8 h-8 text-amber-500" />
            <h1 className="text-4xl font-black text-zinc-100">Settings</h1>
          </div>
          <p className="text-zinc-400">
            Configure your API key to unlock AI-powered features
          </p>
        </div>

        <div className="space-y-6">
          {/* API Key Settings */}
          <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Key className="w-6 h-6 text-emerald-500" />
              <h2 className="text-xl font-bold text-zinc-100">Gemini API Key</h2>
            </div>

            <p className="text-sm text-zinc-400 mb-6">
              Add your own Gemini API key to use AI features for sprite generation, 
              image editing, and more. Your key is encrypted and stored securely in your browser.
            </p>

            {state.apiKey ? (
              <div className="space-y-4">
                <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-zinc-300">
                      Current API Key
                    </span>
                    <button
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="text-zinc-400 hover:text-zinc-200 transition-colors"
                    >
                      {showApiKey ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <code className="text-sm text-zinc-100 font-mono break-all">
                    {showApiKey ? state.apiKey : maskApiKey(state.apiKey)}
                  </code>
                </div>

                <div className="bg-emerald-900/20 border border-emerald-800 rounded-lg p-4">
                  <p className="text-sm text-emerald-400">
                    ✓ API key configured! You can now use all AI features.
                  </p>
                </div>

                <button
                  onClick={handleApiKeyRemove}
                  className="px-4 py-2 bg-red-900/20 border border-red-800 text-red-400 font-medium rounded-lg hover:bg-red-900/30 transition-all flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Remove API Key
                </button>
              </div>
            ) : (
              <form onSubmit={handleApiKeySave} className="space-y-4">
                <div>
                  <label
                    htmlFor="apiKey"
                    className="block text-sm font-medium text-zinc-300 mb-2"
                  >
                    Enter Your API Key
                  </label>
                  <input
                    id="apiKey"
                    type="password"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-mono"
                    placeholder="AIza..."
                    required
                  />
                  <p className="text-xs text-zinc-500 mt-2">
                    Get your free API key from{' '}
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-400 hover:text-amber-300 underline"
                    >
                      Google AI Studio
                    </a>
                  </p>
                </div>

                {apiKeySuccess && (
                  <div className="bg-emerald-900/20 border border-emerald-800 rounded-lg p-3 flex items-center gap-2">
                    <Check className="w-5 h-5 text-emerald-400" />
                    <p className="text-sm text-emerald-400">
                      API key saved successfully!
                    </p>
                  </div>
                )}

                {error && (
                  <div className="bg-red-900/20 border border-red-800 rounded-lg p-3">
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSavingApiKey}
                  className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {isSavingApiKey ? 'Saving...' : 'Save API Key'}
                </button>
              </form>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-amber-900/20 border border-amber-800 rounded-2xl p-6">
            <h3 className="font-bold text-amber-300 mb-3 flex items-center gap-2">
              <Key className="w-5 h-5" />
              Why do I need an API key?
            </h3>
            <ul className="space-y-2 text-sm text-zinc-400">
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 flex-shrink-0"></div>
                <span>Generate pixel art sprites with AI</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 flex-shrink-0"></div>
                <span>Edit and refine your images using natural language</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 flex-shrink-0"></div>
                <span>Create sprite sheets and animations</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 flex-shrink-0"></div>
                <span>No usage limits - use your own quota</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
