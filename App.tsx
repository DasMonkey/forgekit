import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { LandingPage } from './pages/LandingPage';
import { CanvasWorkspace } from './pages/CanvasWorkspace';
import { ProjectsGallery } from './pages/ProjectsGallery';
import { CommunityGallery } from './pages/CommunityGallery';
import { AIProvider } from './contexts/AIContext';
import { ProjectsProvider } from './contexts/ProjectsContext';

export default function App() {
  return (
    <Router>
      <AIProvider>
        <ProjectsProvider>
          <div className="min-h-screen bg-slate-950">
            <Navigation />
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/canvas" element={<CanvasWorkspace />} />
              <Route path="/canvas/:projectId" element={<CanvasWorkspace />} />
              <Route path="/projects" element={<ProjectsGallery />} />
              <Route path="/community" element={<CommunityGallery />} />
              <Route path="/community/:projectId" element={<CanvasWorkspace readOnly={true} />} />
            </Routes>
          </div>
        </ProjectsProvider>
      </AIProvider>
    </Router>
  );
}