import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjects } from '../contexts/ProjectsContext';
import { CraftCategory } from '../types';
import { sanitizeImageUrl, sanitizeText } from '../utils/security';
import { 
  Trash2, 
  Copy, 
  FolderOpen, 
  Search, 
  Filter,
  Clock,
  Tag,
  AlertCircle,
  Sparkles,
  Upload
} from 'lucide-react';

// Sample data for demonstration - Game Asset themed
const SAMPLE_PROJECTS = [
  {
    id: 'sample-1',
    name: 'Retro Knight Character',
    category: CraftCategory.PIXEL_ART,
    prompt: 'A 32x32 pixel art knight character with sword and shield',
    masterImageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&q=80',
    dissection: null,
    stepImages: new Map(),
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    lastModified: new Date(Date.now() - 2 * 60 * 60 * 1000),
    canvasState: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } }
  },
  {
    id: 'sample-2',
    name: 'Cinematic Hero Character',
    category: CraftCategory.AAA,
    prompt: 'High-fidelity AAA game character with detailed armor and realistic textures',
    masterImageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&q=80',
    dissection: null,
    stepImages: new Map(),
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    lastModified: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    canvasState: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } }
  },
  {
    id: 'sample-3',
    name: 'Low Poly Tree Pack',
    category: CraftCategory.LOW_POLY_3D,
    prompt: 'Stylized low-poly forest trees with autumn colors',
    masterImageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80',
    dissection: null,
    stepImages: new Map(),
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    lastModified: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    canvasState: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } }
  },
  {
    id: 'sample-4',
    name: 'Voxel Robot Character',
    category: CraftCategory.VOXEL_ART,
    prompt: 'Cute voxel robot companion with glowing eyes and antenna',
    masterImageUrl: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&q=80',
    dissection: null,
    stepImages: new Map(),
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    lastModified: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    canvasState: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } }
  }
];

export const ProjectsGallery: React.FC = () => {
  const navigate = useNavigate();
  const { state, deleteProject, duplicateProject, publishToCommunity } = useProjects();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CraftCategory | 'all'>('all');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Use sample data if no real projects exist
  const displayProjects = state.projects.length > 0 ? state.projects : SAMPLE_PROJECTS;

  // Filter and search projects
  const filteredProjects = useMemo(() => {
    return displayProjects.filter(project => {
      const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           project.prompt.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || project.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [displayProjects, searchQuery, selectedCategory]);

  // Sort by last modified (newest first)
  const sortedProjects = useMemo(() => {
    return [...filteredProjects].sort((a, b) => 
      new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
    );
  }, [filteredProjects]);

  const handleOpenProject = (projectId: string) => {
    // Don't allow opening sample projects
    if (projectId.startsWith('sample-')) {
      alert('This is a sample project. Create your own projects on the canvas!');
      return;
    }
    navigate(`/canvas/${projectId}`);
  };

  const handleDeleteProject = (projectId: string) => {
    // Don't allow deleting sample projects
    if (projectId.startsWith('sample-')) {
      return;
    }
    deleteProject(projectId);
    setDeleteConfirmId(null);
  };

  const handleDuplicateProject = (projectId: string) => {
    // Don't allow duplicating sample projects
    if (projectId.startsWith('sample-')) {
      alert('This is a sample project. Create your own projects on the canvas!');
      return;
    }
    duplicateProject(projectId);
  };

  const handlePublishToCommunity = async (projectId: string) => {
    // Don't allow publishing sample projects
    if (projectId.startsWith('sample-')) {
      alert('This is a sample project. Create your own projects to publish!');
      return;
    }
    
    try {
      await publishToCommunity(projectId);
      alert('Project published to community! (Feature coming soon with backend)');
    } catch (error) {
      alert('Publishing to community is not yet available. This feature requires backend integration.');
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: new Date(date).getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const getCategoryColor = (category: CraftCategory) => {
    const colors: Record<CraftCategory, string> = {
      [CraftCategory.PIXEL_ART]: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      [CraftCategory.HD_2D]: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      [CraftCategory.AAA]: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      [CraftCategory.LOW_POLY_3D]: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      [CraftCategory.VOXEL_ART]: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    };
    return colors[category] || 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
  };

  return (
    <div className="min-h-screen bg-slate-950 pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-black text-slate-100 mb-2 flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-indigo-500" />
            My Projects
          </h1>
          <p className="text-slate-400">
            {state.projects.length > 0 ? (
              <>{state.projects.length} {state.projects.length === 1 ? 'project' : 'projects'} saved</>
            ) : (
              <>Showing sample projects - create your first project to get started</>
            )}
          </p>
        </div>

        {/* Search and Filter Bar */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => {
                const value = e.target.value.slice(0, 100); // Limit to 100 chars
                setSearchQuery(sanitizeText(value, 100));
              }}
              maxLength={100}
              className="w-full pl-12 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Category Filter */}
          <div className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as CraftCategory | 'all')}
              className="pl-12 pr-8 py-3 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none cursor-pointer min-w-[200px]"
            >
              <option value="all">All Categories</option>
              {Object.values(CraftCategory).map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Projects Grid */}
        {sortedProjects.length === 0 ? (
          <div className="text-center py-20">
            <AlertCircle className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-400 mb-2">
              {state.projects.length === 0 ? 'No projects yet' : 'No projects found'}
            </h3>
            <p className="text-slate-500 mb-6">
              {state.projects.length === 0 
                ? 'Start creating your first craft project on the canvas'
                : 'Try adjusting your search or filter'
              }
            </p>
            {state.projects.length === 0 && (
              <button
                onClick={() => navigate('/canvas')}
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-yellow-500 text-slate-950 font-bold rounded-lg hover:shadow-lg hover:shadow-orange-500/50 transition-all duration-200"
              >
                Start Crafting
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedProjects.map(project => (
              <div
                key={project.id}
                className="group bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-indigo-500/50 transition-all duration-200 hover:shadow-xl hover:shadow-indigo-900/20"
              >
                {/* Thumbnail */}
                <div 
                  className="relative aspect-video bg-slate-800 overflow-hidden cursor-pointer"
                  onClick={() => handleOpenProject(project.id)}
                >
                  {project.masterImageUrl && sanitizeImageUrl(project.masterImageUrl) ? (
                    <img
                      src={sanitizeImageUrl(project.masterImageUrl) || ''}
                      alt={sanitizeText(project.name, 100)}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        // Fallback if image fails to load
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Sparkles className="w-12 h-12 text-slate-700" />
                    </div>
                  )}
                  
                  {/* Sample Badge */}
                  {project.id.startsWith('sample-') && (
                    <div className="absolute top-3 right-3 px-3 py-1 bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-full text-xs font-medium text-slate-400">
                      Sample
                    </div>
                  )}
                  
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                    <button
                      onClick={() => handleOpenProject(project.id)}
                      className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-500 transition-colors duration-200 flex items-center gap-2"
                    >
                      <FolderOpen className="w-5 h-5" />
                      {project.id.startsWith('sample-') ? 'View Sample' : 'Open Project'}
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">
                  {/* Title */}
                  <h3 className="text-lg font-bold text-slate-100 mb-2 line-clamp-2 group-hover:text-indigo-400 transition-colors duration-200">
                    {project.name}
                  </h3>

                  {/* Metadata */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`px-2 py-1 rounded-md text-xs font-medium border flex items-center gap-1 ${getCategoryColor(project.category)}`}>
                      <Tag className="w-3 h-3" />
                      {project.category}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Clock className="w-3 h-3" />
                      {formatDate(project.lastModified)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    {/* Primary Actions Row */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenProject(project.id)}
                        className="flex-1 px-4 py-2 bg-slate-800 text-slate-200 font-medium text-sm rounded-lg hover:bg-slate-700 transition-colors duration-200 flex items-center justify-center gap-2"
                      >
                        <FolderOpen className="w-4 h-4" />
                        {project.id.startsWith('sample-') ? 'View' : 'Open'}
                      </button>
                      
                      <button
                        onClick={() => handleDuplicateProject(project.id)}
                        disabled={project.id.startsWith('sample-')}
                        className={`px-4 py-2 rounded-lg transition-colors duration-200 ${
                          project.id.startsWith('sample-')
                            ? 'bg-slate-800/50 text-slate-600 cursor-not-allowed'
                            : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                        }`}
                        title={project.id.startsWith('sample-') ? 'Cannot duplicate sample projects' : 'Duplicate project'}
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    
                      {deleteConfirmId === project.id && !project.id.startsWith('sample-') ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleDeleteProject(project.id)}
                            className="px-3 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-500 transition-colors duration-200"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-3 py-2 bg-slate-700 text-slate-300 text-xs font-medium rounded-lg hover:bg-slate-600 transition-colors duration-200"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => !project.id.startsWith('sample-') && setDeleteConfirmId(project.id)}
                          disabled={project.id.startsWith('sample-')}
                          className={`px-4 py-2 rounded-lg transition-colors duration-200 ${
                            project.id.startsWith('sample-')
                              ? 'bg-slate-800/50 text-slate-600 cursor-not-allowed'
                              : 'bg-slate-800 text-red-400 hover:bg-red-900/30'
                          }`}
                          title={project.id.startsWith('sample-') ? 'Cannot delete sample projects' : 'Delete project'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Publish Button */}
                    {!project.id.startsWith('sample-') && (
                      <button
                        onClick={() => handlePublishToCommunity(project.id)}
                        className="w-full px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-medium text-sm rounded-lg hover:from-emerald-500 hover:to-emerald-400 transition-all duration-200 flex items-center justify-center gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        Publish to Community
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
