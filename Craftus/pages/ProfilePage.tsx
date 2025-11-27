import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { GuestProfileView } from '../components/GuestProfileView';
import { AuthenticatedProfileView } from '../components/AuthenticatedProfileView';
import { Loader2 } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { state } = useAuth();

  // Loading state
  if (state.isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Show appropriate view based on authentication state
  if (!state.isAuthenticated) {
    return <GuestProfileView />;
  }

  return <AuthenticatedProfileView />;
};
