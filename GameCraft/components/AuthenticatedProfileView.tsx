import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  User as UserIcon,
  Mail,
  Key,
  Crown,
  LogOut,
  Save,
  Eye,
  EyeOff,
  Trash2,
  Check,
  Sparkles,
  Zap,
  Share2,
} from 'lucide-react';
import { maskApiKey } from '../utils/encryption';

export const AuthenticatedProfileView: React.FC = () => {
  const { state, updateProfile, setApiKey, removeApiKey, upgradeToPro, logout } =
    useAuth();
  const [displayName, setDisplayName] = useState(state.user?.displayName || '');
  const [email, setEmail] = useState(state.user?.email || '');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingApiKey, setIsSavingApiKey] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [apiKeySuccess, setApiKeySuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setError(null);
    setProfileSuccess(false);

    try {
      await updateProfile({ displayName, email });
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

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

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      logout();
    }
  };

  const handleUpgrade = async () => {
    try {
      await upgradeToPro();
      alert('Upgraded to Pro! (This is a demo - no payment required)');
    } catch (err: any) {
      setError(err.message || 'Failed to upgrade');
    }
  };

  const isPro = state.subscription === 'pro';

  return (
    <div className="min-h-screen bg-slate-950 pt-24 pb-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-black text-slate-100 mb-2">
            Profile Settings
          </h1>
          <p className="text-slate-400">
            Manage your account, API keys, and subscription
          </p>
        </div>

        <div className="space-y-6">
          {/* Account Information */}
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <UserIcon className="w-6 h-6 text-indigo-500" />
              <h2 className="text-xl font-bold text-slate-100">
                Account Information
              </h2>
            </div>

            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div>
                <label
                  htmlFor="displayName"
                  className="block text-sm font-medium text-slate-300 mb-2"
                >
                  Display Name
                </label>
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Your name"
                  required
                  maxLength={100}
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-slate-300 mb-2"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="your@email.com"
                  required
                  maxLength={254}
                />
              </div>

              <div className="text-sm text-slate-500">
                <Mail className="w-4 h-4 inline mr-1" />
                Member since{' '}
                {state.user?.createdAt
                  ? new Date(state.user.createdAt).toLocaleDateString()
                  : 'N/A'}
              </div>

              {profileSuccess && (
                <div className="bg-emerald-900/20 border border-emerald-800 rounded-lg p-3 flex items-center gap-2">
                  <Check className="w-5 h-5 text-emerald-400" />
                  <p className="text-sm text-emerald-400">
                    Profile updated successfully!
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={isSavingProfile}
                className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-900/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isSavingProfile ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>

          {/* API Key Settings */}
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Key className="w-6 h-6 text-emerald-500" />
              <h2 className="text-xl font-bold text-slate-100">API Key Settings</h2>
            </div>

            <p className="text-sm text-slate-400 mb-6">
              Use your own Gemini API key for unlimited generations without rate
              limits. Your key is encrypted and stored securely in your browser.
            </p>

            {state.apiKey ? (
              <div className="space-y-4">
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-300">
                      Current API Key
                    </span>
                    <button
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      {showApiKey ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <code className="text-sm text-slate-100 font-mono">
                    {showApiKey ? state.apiKey : maskApiKey(state.apiKey)}
                  </code>
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
                    className="block text-sm font-medium text-slate-300 mb-2"
                  >
                    Gemini API Key
                  </label>
                  <input
                    id="apiKey"
                    type="password"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-mono"
                    placeholder="AIza..."
                    required
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Get your API key from{' '}
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:text-indigo-300"
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

                <button
                  type="submit"
                  disabled={isSavingApiKey}
                  className="px-6 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {isSavingApiKey ? 'Saving...' : 'Save API Key'}
                </button>
              </form>
            )}
          </div>

          {/* Subscription */}
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Crown className="w-6 h-6 text-yellow-500" />
              <h2 className="text-xl font-bold text-slate-100">Subscription</h2>
            </div>

            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm text-slate-400 mb-1">Current Plan</p>
                <p className="text-2xl font-bold text-slate-100">
                  {isPro ? (
                    <span className="text-yellow-500">Pro</span>
                  ) : (
                    <span>Free</span>
                  )}
                </p>
              </div>
              {!isPro && (
                <button
                  onClick={handleUpgrade}
                  className="px-6 py-3 bg-gradient-to-r from-orange-500 to-yellow-500 text-slate-950 font-bold rounded-lg hover:from-orange-600 hover:to-yellow-600 transition-all shadow-lg shadow-orange-900/50"
                >
                  Upgrade to Pro
                </button>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="font-bold text-slate-200 mb-3">
                {isPro ? 'Your Pro Features' : 'Upgrade to unlock'}
              </h3>

              <div
                className={`flex items-center gap-3 ${
                  isPro ? 'text-slate-300' : 'text-slate-500'
                }`}
              >
                <Sparkles className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                <span className="text-sm">Unlimited projects</span>
              </div>

              <div
                className={`flex items-center gap-3 ${
                  isPro ? 'text-slate-300' : 'text-slate-500'
                }`}
              >
                <Zap className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                <span className="text-sm">Priority AI generation</span>
              </div>

              <div
                className={`flex items-center gap-3 ${
                  isPro ? 'text-slate-300' : 'text-slate-500'
                }`}
              >
                <Share2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <span className="text-sm">Community publishing</span>
              </div>

              <div
                className={`flex items-center gap-3 ${
                  isPro ? 'text-slate-300' : 'text-slate-500'
                }`}
              >
                <Key className="w-5 h-5 text-purple-400 flex-shrink-0" />
                <span className="text-sm">Personal API key support</span>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Logout */}
          <div className="flex justify-center pt-4">
            <button
              onClick={handleLogout}
              className="px-6 py-2 bg-slate-800 border border-slate-700 text-slate-300 font-medium rounded-lg hover:bg-slate-700 hover:text-slate-100 transition-all flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
