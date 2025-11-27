import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Gamepad2, Home, Layout, Users, Sparkles, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const Navigation: React.FC = () => {
  const location = useLocation();
  const { state } = useAuth();

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/canvas', label: 'Canvas', icon: Layout },
    { path: '/projects', label: 'My Projects', icon: Sparkles },
    { path: '/community', label: 'Community', icon: Users },
    { path: '/profile', label: 'Profile', icon: User },
  ];

  // Hide navigation on canvas page for immersive experience
  if (location.pathname === '/canvas' || location.pathname.startsWith('/canvas/')) {
    return null;
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-3 md:px-6 py-3 md:py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 md:gap-3 group">
            <Gamepad2 className="w-6 h-6 md:w-8 md:h-8 text-amber-500 group-hover:rotate-12 smooth-transition" />
            <span className="text-lg md:text-xl font-black tracking-tighter text-zinc-100">GameCraft</span>
          </Link>

          {/* Nav Links */}
          <div className="flex items-center gap-1 md:gap-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              const isProfileLink = item.path === '/profile';

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`
                    flex items-center gap-1.5 md:gap-2 px-2.5 md:px-4 py-1.5 md:py-2 rounded-lg font-medium text-xs md:text-sm smooth-transition relative
                    ${isActive
                      ? 'bg-amber-600 text-zinc-900 shadow-lg shadow-amber-900/50'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                    }
                  `}
                >
                  <Icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                  {isProfileLink && state.isAuthenticated && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full border-2 border-zinc-900"></span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};
