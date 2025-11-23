import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, ArrowUp, ChevronUp, Loader2 } from 'lucide-react';
import { CraftCategory } from '../types';
import { generateCraftImage } from '../services/geminiService';

interface ChatInterfaceProps {
  onGenerate: (imageUrl: string, prompt: string, category: CraftCategory) => void;
}

const LOADING_MESSAGES = [
  "Dreaming up the design...",
  "Gathering digital materials...",
  "Sketching the blueprint...",
  "Applying textures...",
  "Finalizing the studio lighting..."
];

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ onGenerate }) => {
  const [prompt, setPrompt] = useState('');
  const [category, setCategory] = useState<CraftCategory>(CraftCategory.MISC);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCategoryOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cycle loading messages
  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setLoadingMsg(LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]);
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);

    try {
      const imageUrl = await generateCraftImage(prompt, category);
      onGenerate(imageUrl, prompt, category);
      setPrompt('');
      setIsCategoryOpen(false); // Close menu if open
    } catch (error) {
      console.error("Generation failed:", error);
      alert("Failed to generate craft. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 w-full max-w-2xl px-4 z-50">
      <div className="relative group" ref={dropdownRef}>
        
        {/* Category Popup - Appears above the input */}
        {isCategoryOpen && (
          <div 
            className="absolute bottom-full left-0 mb-3 w-64 bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 origin-bottom-left"
          >
             <div className="p-3 border-b border-slate-800 bg-slate-950/30">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Category</span>
             </div>
             <div className="max-h-[280px] overflow-y-auto py-1 custom-scrollbar">
               {Object.values(CraftCategory).map((cat) => (
                 <button
                   key={cat}
                   onClick={() => {
                     setCategory(cat);
                     setIsCategoryOpen(false);
                   }}
                   className={`w-full text-left px-4 py-3 text-sm transition-all flex items-center gap-2 ${
                     category === cat 
                       ? 'bg-indigo-600/20 text-indigo-300 border-l-2 border-indigo-500' 
                       : 'text-slate-300 hover:bg-slate-800 border-l-2 border-transparent'
                   }`}
                 >
                   {cat}
                 </button>
               ))}
             </div>
          </div>
        )}

        {/* Main Input Bar */}
        <form 
          onSubmit={handleSubmit}
          className={`
            relative flex items-center gap-2 bg-slate-900/90 backdrop-blur-md border border-slate-700/50 p-2 rounded-3xl shadow-2xl shadow-black/50 transition-all duration-300
            ${isLoading ? 'border-indigo-500/50 ring-1 ring-indigo-500/20' : 'hover:border-slate-600 focus-within:border-slate-500'}
          `}
        >
          {/* Category Trigger Button */}
          <button
            type="button"
            onClick={() => setIsCategoryOpen(!isCategoryOpen)}
            className={`
                flex items-center gap-2 px-4 py-3 rounded-2xl transition-all h-12 flex-shrink-0
                ${isCategoryOpen ? 'bg-indigo-600 text-white' : 'bg-slate-800 hover:bg-slate-750 text-indigo-300'}
            `}
            title="Select Category"
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium hidden sm:block max-w-[120px] truncate">{category}</span>
            <ChevronUp className={`w-3 h-3 transition-transform duration-300 ${isCategoryOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Text Input */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={isLoading ? loadingMsg : "Describe a craft you want to build..."}
              disabled={isLoading}
              className="w-full bg-transparent border-none text-slate-100 placeholder-slate-500 focus:ring-0 h-12 py-3 px-2 text-base"
              autoComplete="off"
            />
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!prompt.trim() || isLoading}
            className={`
              h-12 w-12 flex items-center justify-center rounded-2xl transition-all duration-300 flex-shrink-0
              ${!prompt.trim() || isLoading 
                ? 'bg-slate-800 text-slate-600 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/20 hover:scale-105 active:scale-95'}
            `}
          >
            {isLoading ? (
               <Loader2 className="w-5 h-5 animate-spin text-white/80" />
            ) : (
               <ArrowUp className="w-5 h-5 font-bold" />
            )}
          </button>
        </form>
        
        {/* Footer Hint */}
        <div className="absolute top-full left-0 right-0 mt-4 text-center pointer-events-none transition-opacity duration-500">
            <p className={`text-[10px] uppercase tracking-widest font-medium ${isLoading ? 'text-indigo-400 opacity-100' : 'text-slate-600 opacity-0'}`}>
                Running Gemini 3 Pro
            </p>
        </div>
      </div>
    </div>
  );
};