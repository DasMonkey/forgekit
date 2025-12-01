import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Gamepad2, Home, Layout, Users, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface FloatingMenuBarProps {
  projectName?: string;
  onNavigate?: (path: string) => void;
}

export const FloatingMenuBar: React.FC<FloatingMenuBarProps> = ({ 
  projectName,
  onNavigate 
}) => {
  const navigate = useNavigate();
  const { state } = useAuth();

  const handleNavigation = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    }
    navigate(path);
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-fade-in-opacity">
      <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-700/50 rounded-full shadow-2xl px-3 py-2 md:px-4 md:py-2.5">
        <div className="flex items-center gap-2 md:gap-4">
          {/* Logo/Brand */}
          <Link
            to="/"
            className="flex items-center gap-1.5 md:gap-2 group px-2 py-1"
            onClick={(e) => {
              e.preventDefault();
              handleNavigation('/');
            }}
          >
            <Gamepad2 className="w-4 h-4 md:w-5 md:h-5 text-amber-500 group-hover:rotate-12 smooth-transition" />
            <span className="text-sm md:text-base font-black tracking-tighter text-zinc-100 hidden sm:inline">
              GameCraft
            </span>
          </Link>

          {/* Divider */}
          <div className="w-px h-6 bg-zinc-700/50" />

          {/* Navigation Links */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleNavigation('/')}
              className="flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 rounded-full text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 smooth-transition text-xs md:text-sm font-medium"
              title="Home"
            >
              <Home className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span className="hidden md:inline">Home</span>
            </button>

            {/* Hidden for hackathon demo - auth not fully implemented */}
            {/* <button
              onClick={() => handleNavigation('/projects')}
              className="flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 rounded-full text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 smooth-transition text-xs md:text-sm font-medium"
              title="My Projects"
            >
              <Layout className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span className="hidden md:inline">Projects</span>
            </button>

            <button
              onClick={() => handleNavigation('/community')}
              className="flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 rounded-full text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 smooth-transition text-xs md:text-sm font-medium"
              title="Community Gallery"
            >
              <Users className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span className="hidden md:inline">Community</span>
            </button> */}

            <button
              onClick={() => handleNavigation('/settings')}
              className="flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 rounded-full text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 smooth-transition text-xs md:text-sm font-medium relative"
              title="Settings"
            >
              <User className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span className="hidden md:inline">Settings</span>
            </button>
          </div>

          {/* Project Name Display */}
          {projectName && (
            <>
              <div className="w-px h-6 bg-zinc-700/50 hidden lg:block" />
              <div className="hidden lg:flex items-center gap-2 px-3 py-1 max-w-xs">
                <span className="text-xs text-zinc-500 font-medium">Project:</span>
                <span className="text-sm text-zinc-200 font-semibold truncate">
                  {projectName}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
