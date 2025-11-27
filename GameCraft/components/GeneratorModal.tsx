import React, { useState, useEffect } from 'react';
import { Sparkles, X, Loader2, Wand2 } from 'lucide-react';
import { CraftCategory } from '../types';
import { generateCraftImage } from '../services/geminiService';

interface GeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (imageUrl: string, prompt: string, category: CraftCategory) => void;
}

const LOADING_MESSAGES = [
  "Summoning creative spirits...",
  "Weaving pixels into matter...",
  "Consulting the digital oracle...",
  "Gathering virtual materials...",
  "Constructing reality..."
];

export const GeneratorModal: React.FC<GeneratorModalProps> = ({ isOpen, onClose, onGenerate }) => {
  const [prompt, setPrompt] = useState('');
  const [category, setCategory] = useState<CraftCategory>(CraftCategory.PIXEL_ART);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);

  useEffect(() => {
    if (!process.env.API_KEY) {
        setApiKeyMissing(true);
    }
  }, []);

  // Rotate loading messages
  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setLoadingMsg(LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isLoading]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt) return;

    setIsLoading(true);

    try {
      const imageUrl = await generateCraftImage(prompt, category);
      onGenerate(imageUrl, prompt, category);
      setPrompt('');
      onClose();
    } catch (error) {
      console.error("Generation failed:", error);
      alert("Failed to generate image. Ensure you have a valid API Key selected.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden relative">
        
        {/* Header */}
        <div className="bg-slate-800/50 px-6 py-4 flex justify-between items-center border-b border-slate-700">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="text-indigo-400" />
            Conjure New Craft
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {apiKeyMissing && (
             <div className="bg-red-900/20 border border-red-800 text-red-200 p-3 rounded text-sm">
                Warning: No default API_KEY found in environment. You may need to select one if using the selection flow.
             </div>
          )}

          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20 animate-pulse rounded-full"></div>
                <Loader2 className="w-16 h-16 text-indigo-500 animate-spin relative z-10" />
              </div>
              <p className="text-lg font-medium text-indigo-200 animate-pulse">{loadingMsg}</p>
              <p className="text-sm text-slate-500">Generating 1K studio reference...</p>
            </div>
          ) : (
            <form onSubmit={handleGenerate} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as CraftCategory)}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                >
                  {Object.values(CraftCategory).map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Vision Prompt</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="E.g., A steampunk wrist gauntlet made of leather and copper gears..."
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white h-32 resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2 transition-transform active:scale-95"
              >
                <Wand2 className="w-5 h-5" />
                Generate Reference
              </button>
            </form>
          )}
        </div>
        
        {/* Footer Note */}
        <div className="bg-slate-950/50 px-6 py-3 border-t border-slate-800 text-center">
            <p className="text-xs text-slate-500">Powered by Gemini 3 Pro Image Preview</p>
        </div>
      </div>
    </div>
  );
};
