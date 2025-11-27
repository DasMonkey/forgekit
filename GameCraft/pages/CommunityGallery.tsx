import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CraftCategory } from '../types';
import { 
  Users, 
  Sparkles, 
  Eye, 
  Heart,
  Share2,
  Filter,
  Search,
  Tag,
  TrendingUp,
  Clock
} from 'lucide-react';

// Community Project Interface
interface CommunityProject {
  id: string;
  name: string;
  category: CraftCategory;
  masterImageUrl: string;
  difficulty: 'Simple' | 'Moderate' | 'Complex';
  creatorHandle: string;
  creatorAvatar?: string;
  views: number;
  likes: number;
  publishedAt: Date;
}

// Sample community projects for demonstration - Game Asset themed
const SAMPLE_COMMUNITY_PROJECTS: CommunityProject[] = [
  {
    id: 'community-1',
    name: 'Dungeon Crawler Tileset',
    category: CraftCategory.PIXEL_ART,
    masterImageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&q=80',
    difficulty: 'Moderate',
    creatorHandle: '@pixel_master',
    views: 1247,
    likes: 89,
    publishedAt: new Date(Date.now() - 3 * 60 * 60 * 1000)
  },
  {
    id: 'community-2',
    name: 'Cinematic Battle Scene',
    category: CraftCategory.AAA,
    masterImageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&q=80',
    difficulty: 'Complex',
    creatorHandle: '@aaa_artist',
    views: 2341,
    likes: 156,
    publishedAt: new Date(Date.now() - 5 * 60 * 60 * 1000)
  },
  {
    id: 'community-3',
    name: 'Low Poly Nature Pack',
    category: CraftCategory.LOW_POLY_3D,
    masterImageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80',
    difficulty: 'Simple',
    creatorHandle: '@lowpoly_maker',
    views: 945,
    likes: 78,
    publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000)
  },
  {
    id: 'community-4',
    name: 'Voxel City Buildings',
    category: CraftCategory.VOXEL_ART,
    masterImageUrl: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&q=80',
    difficulty: 'Simple',
    creatorHandle: '@voxel_builder',
    views: 2134,
    likes: 189,
    publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000)
  }
];

export const CommunityGallery: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CraftCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'trending'>('trending');

  // Filter and search projects
  const filteredProjects = useMemo(() => {
    return SAMPLE_COMMUNITY_PROJECTS.filter(project => {
      const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           project.creatorHandle.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || project.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  // Sort projects
  const sortedProjects = useMemo(() => {
    const sorted = [...filteredProjects];
    switch (sortBy) {
      case 'recent':
        return sorted.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
      case 'popular':
        return sorted.sort((a, b) => b.likes - a.likes);
      case 'trending':
        return sorted.sort((a, b) => b.views - a.views);
      default:
        return sorted;
    }
  }, [filteredProjects, sortBy]);

  const handleViewProject = (projectId: string) => {
    // Navigate to canvas in readonly mode
    navigate(`/community/${projectId}`);
  };

  const handleShare = (project: CommunityProject) => {
    const url = `${window.location.origin}/community/${project.id}`;
    navigator.clipboard.writeText(url).then(() => {
      alert('Link copied to clipboard!');
    }).catch(() => {
      alert('Failed to copy link');
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Simple':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'Moderate':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'Complex':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const getCategoryColor = (category: CraftCategory) => {
    const colors: Record<CraftCategory, string> = {
      [CraftCategory.PIXEL_ART]: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      [CraftCategory.AAA]: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      [CraftCategory.LOW_POLY_3D]: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      [CraftCategory.VOXEL_ART]: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    };
    return colors[category] || 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  };

  return (
    <div className="min-h-screen bg-slate-950 pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-black text-slate-100 mb-2 flex items-center gap-3">
            <Users className="w-8 h-8 text-emerald-500" />
            Community Gallery
          </h1>
          <p className="text-slate-400">
            Explore {SAMPLE_COMMUNITY_PROJECTS.length} craft projects shared by the community
          </p>
        </div>

        {/* Search, Filter, and Sort Bar */}
        <div className="mb-8 flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              placeholder="Search projects or creators..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          {/* Category Filter */}
          <div className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as CraftCategory | 'all')}
              className="pl-12 pr-8 py-3 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent appearance-none cursor-pointer min-w-[200px]"
            >
              <option value="all">All Categories</option>
              {Object.values(CraftCategory).map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div className="flex gap-2 bg-slate-900 border border-slate-800 rounded-lg p-1">
            <button
              onClick={() => setSortBy('trending')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center gap-2 ${
                sortBy === 'trending'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Trending
            </button>
            <button
              onClick={() => setSortBy('popular')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center gap-2 ${
                sortBy === 'popular'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Heart className="w-4 h-4" />
              Popular
            </button>
            <button
              onClick={() => setSortBy('recent')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center gap-2 ${
                sortBy === 'recent'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="w-4 h-4" />
              Recent
            </button>
          </div>
        </div>

        {/* Projects Masonry Grid */}
        {sortedProjects.length === 0 ? (
          <div className="text-center py-20">
            <Sparkles className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-400 mb-2">No projects found</h3>
            <p className="text-slate-500">Try adjusting your search or filter</p>
          </div>
        ) : (
          <div 
            className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6"
            style={{ columnFill: 'balance' }}
          >
            {sortedProjects.map(project => (
              <div
                key={project.id}
                className="group bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-emerald-500/50 transition-all duration-200 hover:shadow-xl hover:shadow-emerald-900/20 break-inside-avoid mb-6"
              >
                {/* Thumbnail */}
                <div 
                  className="relative bg-slate-800 overflow-hidden cursor-pointer"
                  onClick={() => handleViewProject(project.id)}
                  style={{ 
                    aspectRatio: project.id.includes('1') || project.id.includes('4') || project.id.includes('7') 
                      ? '3/4' 
                      : project.id.includes('2') || project.id.includes('5') 
                      ? '4/3' 
                      : '1/1' 
                  }}
                >
                  <img
                    src={project.masterImageUrl}
                    alt={project.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                    <button
                      onClick={() => handleViewProject(project.id)}
                      className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-500 transition-colors duration-200 flex items-center gap-2"
                    >
                      <Eye className="w-5 h-5" />
                      View Project
                    </button>
                  </div>

                  {/* Difficulty Badge */}
                  <div className={`absolute top-3 right-3 px-2 py-1 rounded-md text-xs font-medium border backdrop-blur-sm ${getDifficultyColor(project.difficulty)}`}>
                    {project.difficulty}
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  {/* Title */}
                  <h3 className="text-base font-bold text-slate-100 mb-2 line-clamp-2 group-hover:text-emerald-400 transition-colors duration-200">
                    {project.name}
                  </h3>

                  {/* Creator */}
                  <p className="text-sm text-slate-400 mb-3">{project.creatorHandle}</p>

                  {/* Category */}
                  <div className="mb-3">
                    <div className={`inline-flex px-2 py-1 rounded-md text-xs font-medium border items-center gap-1 ${getCategoryColor(project.category)}`}>
                      <Tag className="w-3 h-3" />
                      {project.category}
                    </div>
                  </div>

                  {/* Stats and Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {formatNumber(project.views)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        {formatNumber(project.likes)}
                      </div>
                    </div>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShare(project);
                      }}
                      className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors duration-200"
                      title="Share project"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
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
