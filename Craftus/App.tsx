import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { LandingPage } from './pages/LandingPage';
import { CanvasWorkspace } from './pages/CanvasWorkspace';
import { ProjectsGallery } from './pages/ProjectsGallery';
import { CommunityGallery } from './pages/CommunityGallery';
import { ProfilePage } from './pages/ProfilePage';
import { AuthProvider } from './contexts/AuthContext';
import { AIProvider } from './contexts/AIContext';
import { ProjectsProvider } from './contexts/ProjectsContext';
import { setupDemoAccount } from './utils/setupDemoAccount';

export default function App() {
  // Setup demo account on first load
  useEffect(() => {
    setupDemoAccount();
  }, []);

  return (
    <Router>
      <AuthProvider>
        <AIProvider>
          <ProjectsProvider>
            <div className="min-h-screen bg-slate-950">
              <Navigation />
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/canvas" element={<CanvasWorkspace />} />
                <Route path="/canvas/:projectId" element={<CanvasWorkspace />} />
                {/* Hidden for hackathon demo - auth not fully implemented */}
                {/* <Route path="/projects" element={<ProjectsGallery />} /> */}
                {/* <Route path="/community" element={<CommunityGallery />} /> */}
                {/* <Route path="/community/:projectId" element={<CanvasWorkspace readOnly={true} />} /> */}
                <Route path="/settings" element={<ProfilePage />} />
                {/* Keep old route for backwards compatibility */}
                <Route path="/profile" element={<ProfilePage />} />
              </Routes>
            </div>
          </ProjectsProvider>
        </AIProvider>
      </AuthProvider>
    </Router>
  );
}