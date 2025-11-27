import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, UserPlus, Sparkles, Zap, Crown, Share2 } from 'lucide-react';

export const GuestProfileView: React.FC = () => {
  const { login, signup, state, clearError } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    clearError();

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await signup(email, password, displayName);
      }
    } catch (error) {
      // Error is handled by context
      console.error('Auth error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    clearError();
  };

  return (
    <div className="min-h-screen bg-slate-950 pt-24 pb-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-black text-slate-100 mb-4">
            Welcome to Craftus
          </h1>
          <p className="text-lg text-slate-400">
            Create an account to save your projects and unlock premium features
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Login/Signup Form */}
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-8">
            <div className="flex items-center justify-center gap-4 mb-6">
              <button
                onClick={() => setMode('login')}
                className={`px-6 py-2 rounded-lg font-medium transition-all ${
                  mode === 'login'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LogIn className="w-4 h-4 inline mr-2" />
                Login
              </button>
              <button
                onClick={() => setMode('signup')}
                className={`px-6 py-2 rounded-lg font-medium transition-all ${
                  mode === 'signup'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <UserPlus className="w-4 h-4 inline mr-2" />
                Sign Up
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
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
                    placeholder="Enter your name"
                    required
                    maxLength={100}
                  />
                </div>
              )}

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

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-slate-300 mb-2"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="••••••••"
                  required
                  minLength={8}
                  maxLength={128}
                />
                {mode === 'signup' && (
                  <p className="text-xs text-slate-500 mt-1">
                    At least 8 characters with letters and numbers
                  </p>
                )}
              </div>

              {state.error && (
                <div className="bg-red-900/20 border border-red-800 rounded-lg p-3">
                  <p className="text-sm text-red-400">{state.error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full px-6 py-3 bg-gradient-to-r from-orange-500 to-yellow-500 text-slate-950 font-bold rounded-lg hover:from-orange-600 hover:to-yellow-600 transition-all shadow-lg shadow-orange-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting
                  ? 'Please wait...'
                  : mode === 'login'
                  ? 'Login'
                  : 'Create Account'}
              </button>
            </form>

            <div className="mt-6 text-center space-y-3">
              <button
                onClick={toggleMode}
                className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
              >
                {mode === 'login'
                  ? "Don't have an account? Sign up"
                  : 'Already have an account? Login'}
              </button>

              {mode === 'login' && (
                <div className="bg-indigo-900/20 border border-indigo-800 rounded-lg p-3">
                  <p className="text-xs text-indigo-300 font-medium mb-1">
                    Demo Account
                  </p>
                  <p className="text-xs text-slate-400">
                    Email: <code className="text-indigo-400">demo@craftus.art</code>
                  </p>
                  <p className="text-xs text-slate-400">
                    Password: <code className="text-indigo-400">demo1234</code>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Pro Features Showcase */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 backdrop-blur-xl border border-indigo-800 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <Crown className="w-8 h-8 text-yellow-500" />
                <h2 className="text-2xl font-black text-slate-100">
                  Pro Features
                </h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-indigo-400 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-bold text-slate-200 mb-1">
                      Unlimited Projects
                    </h3>
                    <p className="text-sm text-slate-400">
                      Save and organize unlimited craft projects without restrictions
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Zap className="w-5 h-5 text-yellow-400 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-bold text-slate-200 mb-1">
                      Priority AI Generation
                    </h3>
                    <p className="text-sm text-slate-400">
                      Skip the queue with faster AI image generation and processing
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Share2 className="w-5 h-5 text-emerald-400 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-bold text-slate-200 mb-1">
                      Community Publishing
                    </h3>
                    <p className="text-sm text-slate-400">
                      Share your creations with the community and inspire others
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-purple-400 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-bold text-slate-200 mb-1">
                      Use Your Own API Key
                    </h3>
                    <p className="text-sm text-slate-400">
                      Connect your personal Gemini API key for unlimited generations
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
              <h3 className="font-bold text-slate-200 mb-3">
                Why Create an Account?
              </h3>
              <ul className="space-y-2 text-sm text-slate-400">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                  Save your craft projects across devices
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                  Access your work from anywhere
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                  Customize your profile settings
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                  Upgrade to Pro for premium features
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
