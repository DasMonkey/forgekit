import React from 'react';
import { SettingsView } from '../components/SettingsView';

// Simplified for hackathon demo - no auth required
// Just show settings page with API key management
export const ProfilePage: React.FC = () => {
  return <SettingsView />;
};
