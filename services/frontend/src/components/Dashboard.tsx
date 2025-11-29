import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sessionsAPI, authAPI, Session, favoritesAPI } from '../services/api';
import { gitService, GitWorkspace } from '../services/gitService';
import { DashboardSkeleton } from './LoadingSkeleton';
import { ErrorAlert, SuccessAlert } from './ErrorAlert';
import { SessionStats } from './SessionStats';
import { useKeyboardShortcuts, KeyboardShortcutsHelp } from './KeyboardShortcuts';
import { EmptyState, NoResultsState } from './EmptyState';
import { FavoriteButton } from './FavoriteButton';
import { LanguageIcon, languageConfig } from './LanguageIcons';

interface User {
  id: number;
  email: string;
  username: string;
  full_name?: string;
  is_active: boolean;
  created_at: string;
}

// Language colors are now imported from LanguageIcons.tsx

export const Dashboard: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [workspaces, setWorkspaces] = useState<GitWorkspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [newSessionDescription, setNewSessionDescription] = useState('');
  const [newSessionTags, setNewSessionTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLanguage, setFilterLanguage] = useState('all');
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const navigate = useNavigate();

  // Keyboard shortcuts
  const shortcuts = [
    {
      key: 'n',
      description: 'Create new session',
      action: () => setShowCreateModal(true),
      ctrlKey: true,
    },
    {
      key: 'j',
      description: 'Join session by code',
      action: () => setShowJoinModal(true),
      ctrlKey: true,
    },
    {
      key: 'k',
      description: 'Focus search',
      action: () => document.getElementById('session-search')?.focus(),
      ctrlKey: true,
    },
    {
      key: '/',
      description: 'Show keyboard shortcuts',
      action: () => setShowShortcutsHelp(true),
    },
  ];

  useKeyboardShortcuts(shortcuts);

  // Close language dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const dropdown = document.getElementById('language-filter-container');
      if (dropdown && !dropdown.contains(e.target as Node)) {
        setShowLanguageDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (user) {
      loadSessions();
      loadFavorites();
      loadWorkspaces();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, filterLanguage]); // Only re-run when user ID or filter changes

  const loadFavorites = async () => {
    try {
      const favoriteIds = await favoritesAPI.getFavorites();
      setFavorites(favoriteIds);
    } catch (err) {
      console.error('Failed to load favorites:', err);
    }
  };

  const loadWorkspaces = async () => {
    try {
      const result = await gitService.listWorkspaces();
      if (result.success) {
        setWorkspaces(result.workspaces);
      }
    } catch (err) {
      console.error('Failed to load workspaces:', err);
    }
  };

  const loadUserData = async () => {
    try {
      const userData = await authAPI.getCurrentUser();
      setUser(userData);
      // Load sessions after user is loaded
      await loadSessions();
    } catch (err: any) {
      if (err.response?.status === 401) {
        navigate('/login');
      } else {
        setError('Failed to load dashboard data');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadSessions = async () => {
    try {
      const lang = filterLanguage === 'all' ? undefined : filterLanguage;
      const data = await sessionsAPI.list(lang);
      setSessions(data);
    } catch (err: any) {
      console.error('Failed to load sessions:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    navigate('/login');
  };

  const handleCreateSession = async () => {
    if (!newSessionName.trim()) return;
    
    try {
      const newSession = await sessionsAPI.create({
        name: newSessionName.trim(),
        language: 'plaintext', // Default to plain text, can be changed in session
        description: newSessionDescription.trim() || undefined,
        tags: newSessionTags,
      });
      
      setSessions([newSession, ...sessions]);
      setShowCreateModal(false);
      setNewSessionName('');
      setNewSessionDescription('');
      setNewSessionTags([]);
      setTagInput('');
      setSuccessMessage(`Session "${newSession.name}" created successfully!`);
      setTimeout(() => setSuccessMessage(''), 3000);
      navigate(`/session/${newSession.id}`);
    } catch (err: any) {
      console.error('Failed to create session:', err);
      setError('Failed to create session: ' + (err.response?.data?.detail || err.message));
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !newSessionTags.includes(tagInput.trim())) {
      setNewSessionTags([...newSessionTags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setNewSessionTags(newSessionTags.filter(tag => tag !== tagToRemove));
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleJoinSession = (sessionId: string) => {
    navigate(`/session/${sessionId}`);
  };

  const handleJoinByCode = async () => {
    if (!joinCode.trim()) {
      setJoinError('Please enter a share code');
      return;
    }
    
    try {
      setJoinError('');
      const session = await sessionsAPI.joinByCode(joinCode.trim().toUpperCase());
      setShowJoinModal(false);
      setJoinCode('');
      navigate(`/session/${session.id}`);
    } catch (err: any) {
      console.error('Failed to join session:', err);
      setJoinError(err.response?.data?.detail || 'Invalid share code. Please check and try again.');
    }
  };

  // Filter sessions based on search, language, and favorites
  const filteredSessions = sessions.filter((session) => {
    const matchesSearch = session.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLanguage = filterLanguage === 'all' || session.language === filterLanguage;
    const matchesFavorites = !showOnlyFavorites || favorites.includes(session.id);
    return matchesSearch && matchesLanguage && matchesFavorites;
  });

  const handleFavoriteToggle = (sessionId: string, newState: boolean) => {
    if (newState) {
      setFavorites([...favorites, sessionId]);
    } else {
      setFavorites(favorites.filter(id => id !== sessionId));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        {/* Header Skeleton */}
        <header className="bg-black/90 backdrop-blur-xl border-b border-green-500/30 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-20">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-green-900/30 border border-green-500/50 animate-pulse"></div>
                <div>
                  <div className="h-6 w-32 bg-green-900/30 border border-green-500/30 animate-pulse mb-1"></div>
                  <div className="h-3 w-24 bg-green-900/30 border border-green-500/30 animate-pulse"></div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="h-10 w-32 bg-green-900/30 border border-green-500/30 animate-pulse"></div>
                <div className="h-10 w-20 bg-green-900/30 border border-green-500/30 animate-pulse"></div>
              </div>
            </div>
          </div>
        </header>
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Action Buttons Skeleton */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="h-8 w-48 bg-green-900/30 border border-green-500/30 animate-pulse mb-2"></div>
              <div className="h-4 w-64 bg-green-900/30 border border-green-500/30 animate-pulse"></div>
            </div>
            <div className="flex gap-3">
              <div className="h-12 w-36 bg-green-900/30 border border-green-500/30 animate-pulse"></div>
              <div className="h-12 w-36 bg-green-900/30 border border-green-500/30 animate-pulse"></div>
            </div>
          </div>
          
          {/* Search Bar Skeleton */}
          <div className="flex gap-4 mb-8">
            <div className="flex-1 h-14 bg-green-900/30 border border-green-500/30 animate-pulse"></div>
            <div className="w-48 h-14 bg-green-900/30 border border-green-500/30 animate-pulse"></div>
          </div>
          
          <DashboardSkeleton />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Error and Success Notifications */}
      {error && <ErrorAlert message={error} onClose={() => setError('')} />}
      {successMessage && <SuccessAlert message={successMessage} onClose={() => setSuccessMessage('')} />}
      
      {/* Hacker Theme Header */}
      <header className="bg-black/90 backdrop-blur-xl border-b border-green-500/30 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo Section */}
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-12 h-12 bg-black border-2 border-green-500 flex items-center justify-center transform hover:scale-110 transition-transform duration-200 shadow-neon">
                  <svg className="w-7 h-7 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-black animate-pulse shadow-neon"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-green-500 font-mono neon-glow">
                  CodeCollab_
                </h1>
              </div>
            </div>

            {/* User Section */}
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-3 px-4 py-2.5 bg-black border border-green-500/50 hover:border-green-400 transition-colors">
                <div className="relative">
                  <div className="w-10 h-10 bg-black border-2 border-green-500 flex items-center justify-center text-green-400 font-bold text-sm font-mono">
                    {user?.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-black"></div>
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-green-400 font-mono">
                    {user?.username || 'User'}
                  </p>
                  <p className="text-xs text-green-600 font-mono">{user?.email || ''}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="px-5 py-2.5 text-sm font-mono text-green-400 bg-black border border-red-500/50 hover:bg-red-500 hover:text-black focus:outline-none transition-all duration-200 hover:shadow-[0_0_10px_rgba(255,0,0,0.5)]"
              >
                <span className="hidden sm:inline">[ LOGOUT ]</span>
                <svg className="w-5 h-5 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Session Statistics */}
        {sessions.length > 0 && <SessionStats sessions={sessions} />}

        {/* Header Actions */}
          <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-green-500 mb-2 font-mono neon-glow">
              YOUR_SESSIONS_
            </h2>
            <p className="text-green-600 font-mono">// create or join collaborative coding sessions</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/git')}
              className="group px-6 py-3.5 text-sm font-mono text-orange-400 bg-black border-2 border-dashed border-orange-500 hover:bg-orange-500 hover:text-black hover:border-solid focus:outline-none transition-all duration-200 hover:shadow-orange-500/50 skew-x-[-2deg]"
            >
              <span className="flex items-center skew-x-[2deg]">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 92 92">
                  <path d="M90.156 41.965L50.036 1.848c-2.467-2.467-6.47-2.467-8.937 0l-8.332 8.332 10.562 10.562c2.623-.872 5.63-.292 7.72 1.798 2.102 2.109 2.678 5.134 1.78 7.768l10.185 10.185c2.634-.898 5.659-.322 7.768 1.78 2.93 2.93 2.93 7.678 0 10.607-2.93 2.93-7.678 2.93-10.607 0-2.21-2.21-2.755-5.458-1.64-8.177L48.73 34.899v29.75c.715.346 1.39.808 1.992 1.41 2.93 2.93 2.93 7.678 0 10.607-2.93 2.93-7.678 2.93-10.607 0-2.93-2.93-2.93-7.678 0-10.607.719-.719 1.545-1.293 2.446-1.722V34.28c-.9-.43-1.727-1.004-2.446-1.722-2.223-2.223-2.762-5.486-1.623-8.214L27.83 13.688 1.848 39.67c-2.467 2.467-2.467 6.47 0 8.937l40.12 40.117c2.467 2.467 6.47 2.467 8.937 0l39.95-39.95c2.468-2.467 2.468-6.47.001-8.937" />
                </svg>
                [ GIT ]
              </span>
            </button>
            <button
              onClick={() => setShowJoinModal(true)}
              className="group px-6 py-3.5 text-sm font-mono text-purple-400 bg-black border border-purple-500 hover:bg-purple-500 hover:text-black focus:outline-none transition-all duration-200 hover:shadow-[0_0_15px_rgba(168,85,247,0.5)]"
            >
              <span className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
                </svg>
                [ JOIN ]
              </span>
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="group px-6 py-3.5 text-sm font-mono text-black bg-green-500 border border-green-500 hover:bg-green-400 focus:outline-none transition-all duration-200 shadow-neon"
            >
              <span className="flex items-center">
                <svg className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
                </svg>
                [ NEW ]
              </span>
            </button>
          </div>
        </div>        {/* Search and Filter */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-cyan-600 group-focus-within:text-cyan-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </div>
            <input
              id="session-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="search_sessions... (Ctrl+K)"
              className="w-full pl-12 pr-4 py-3.5 bg-black border border-cyan-500/50 text-cyan-400 placeholder-cyan-700 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(34,211,238,0.3)] transition-all font-mono"
            />
          </div>
          <div className="flex gap-3">
            <div id="language-filter-container" className="relative">
              <button
                onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                className="pl-4 pr-10 py-3.5 bg-black border border-green-500/50 text-green-400 focus:outline-none focus:border-green-400 focus:shadow-neon transition-all cursor-pointer min-w-[200px] font-mono flex items-center gap-2"
              >
                {filterLanguage !== 'all' && <LanguageIcon language={filterLanguage} className={`w-4 h-4 ${languageConfig[filterLanguage]?.color || 'text-green-400'}`} />}
                <span>{filterLanguage === 'all' ? 'all_languages' : filterLanguage}</span>
              </button>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg className={`h-5 w-5 text-green-500 transition-transform ${showLanguageDropdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                </svg>
              </div>
              {/* Custom Dropdown */}
              {showLanguageDropdown && (
                <div className="absolute top-full left-0 mt-1 w-full bg-black border border-green-500/50 z-50 max-h-80 overflow-y-auto">
                  {[
                    { value: 'all', label: 'all_languages' },
                    { value: 'python', label: 'python' },
                    { value: 'javascript', label: 'javascript' },
                    { value: 'typescript', label: 'typescript' },
                    { value: 'go', label: 'go' },
                    { value: 'rust', label: 'rust' },
                    { value: 'cpp', label: 'c++' },
                    { value: 'c', label: 'c' },
                    { value: 'java', label: 'java' },
                    { value: 'vlang', label: 'vlang' },
                    { value: 'zig', label: 'zig' },
                    { value: 'elixir', label: 'elixir' },
                  ].map((lang) => (
                    <button
                      key={lang.value}
                      onClick={() => {
                        setFilterLanguage(lang.value);
                        setShowLanguageDropdown(false);
                      }}
                      className={`w-full px-4 py-2 text-left flex items-center gap-2 font-mono hover:bg-green-500/20 transition-colors ${
                        filterLanguage === lang.value ? 'bg-green-500/20 text-green-400' : 'text-green-500'
                      }`}
                    >
                      {lang.value !== 'all' && <LanguageIcon language={lang.value} className={`w-4 h-4 ${languageConfig[lang.value]?.color || 'text-green-400'}`} />}
                      <span>{lang.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
              className={`px-4 py-3.5 border focus:outline-none transition-all flex items-center gap-2 font-mono ${
                showOnlyFavorites
                  ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.3)]'
                  : 'bg-black border-amber-500/50 text-amber-600 hover:text-amber-400 hover:border-amber-400'
              }`}
              title="Show only favorites"
            >
              <svg className="w-5 h-5" fill={showOnlyFavorites ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              {showOnlyFavorites && <span className="text-sm">{favorites.length}</span>}
            </button>
            <button
              onClick={() => setShowShortcutsHelp(true)}
              className="px-4 py-3.5 bg-black border border-purple-500/50 text-purple-600 hover:text-purple-400 hover:border-purple-400 focus:outline-none transition-all hover:shadow-[0_0_10px_rgba(168,85,247,0.3)]"
              title="Keyboard shortcuts (/)"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Sessions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Session Cards */}
          {filteredSessions.map((session) => {
            const langColor = languageConfig[session.language] || languageConfig.python;
            return (
              <div
                key={session.id}
                className="group relative bg-black border border-green-500/30 p-6 hover:border-green-400 transition-all duration-300 hover:shadow-neon"
              >
                {/* Favorite Button */}
                <div className="absolute top-4 right-4 z-10">
                  <FavoriteButton
                    sessionId={session.id}
                    isFavorite={favorites.includes(session.id)}
                    onToggle={handleFavoriteToggle}
                  />
                </div>

                {/* Language Badge */}
                <div className="absolute -top-3 -left-3">
                  <div className="px-4 py-2 bg-black border border-green-500 shadow-neon-sm transform group-hover:scale-110 transition-transform duration-200">
                    <span className={`font-bold text-sm uppercase tracking-wider flex items-center font-mono ${langColor.color}`}>
                      <span className="mr-1.5"><LanguageIcon language={session.language} className="w-4 h-4" /></span>
                      {session.language}
                    </span>
                  </div>
                </div>

                {/* Session Content - clickable */}
                <div className="mt-6 cursor-pointer" onClick={() => handleJoinSession(session.id)}>
                  <div className="flex items-center justify-between mb-3 pr-10">
                    <h3 className="text-xl font-bold text-green-400 group-hover:text-green-300 transition-colors line-clamp-2 flex-1 font-mono">
                      {session.name}
                    </h3>
                    {/* Recently Active Badge */}
                    {session.last_accessed_at && new Date(session.last_accessed_at).getTime() > Date.now() - 3600000 && (
                      <span className="ml-2 px-2 py-1 text-xs font-mono bg-green-500/20 text-green-400 border border-green-500/50">
                        [ ACTIVE ]
                      </span>
                    )}
                  </div>
                  
                  {/* Tags */}
                  {session.tags && session.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {session.tags.slice(0, 3).map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-0.5 text-xs font-mono bg-cyan-900/30 text-cyan-500 border border-cyan-500/30"
                        >
                          #{tag}
                        </span>
                      ))}
                      {session.tags.length > 3 && (
                        <span className="px-2 py-0.5 text-xs font-mono bg-black text-cyan-600 border border-cyan-500/30">
                          +{session.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-sm mt-2">
                    <div className="flex items-center space-x-4">
                      {/* Participants */}
                      <div className="flex items-center text-purple-500 group-hover:text-purple-400 transition-colors font-mono">
                        <div className="flex -space-x-2 mr-2">
                          {[...Array(Math.min(session.participants.length, 3))].map((_, i) => (
                            <div
                              key={i}
                              className="w-7 h-7 border-2 border-black bg-purple-900 flex items-center justify-center text-purple-400 text-xs font-bold font-mono"
                              title={session.participants[i] || ''}
                            >
                              {(session.participants[i] || 'U').charAt(0).toUpperCase()}
                            </div>
                          ))}
                          {session.participants.length > 3 && (
                            <div className="w-7 h-7 border-2 border-black bg-black flex items-center justify-center text-purple-500 text-xs font-bold font-mono">
                              +{session.participants.length - 3}
                            </div>
                          )}
                        </div>
                        <span>{session.participants.length}</span>
                      </div>

                      {/* Date */}
                      <div className="flex items-center text-amber-600 font-mono">
                        <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
                        </svg>
                        <span className="text-xs">{new Date(session.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Join Button Overlay */}
                  <div className="mt-4 pt-4 border-t border-green-500/30">
                    <div className="flex items-center justify-between font-mono">
                      <span className="text-sm text-green-600">click_to_join</span>
                      <svg className="w-5 h-5 text-green-500 group-hover:text-green-400 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Hover Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-green-900/10 to-black opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
              </div>
            );
          })}

          {/* Git Workspace Cards */}
          {workspaces.map((workspace) => (
            <div
              key={workspace.workspace_id}
              className="group relative bg-black border-2 border-dashed border-orange-500/30 p-6 hover:border-orange-400 transition-all duration-300 hover:shadow-orange-500/30 cursor-pointer"
              onClick={() => navigate('/git')}
            >
              {/* Corner accents */}
              <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-orange-500"></div>
              <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-orange-500"></div>
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-orange-500"></div>
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-orange-500"></div>
              
              {/* Git Badge */}
              <div className="absolute -top-3 -right-3">
                <div className="px-4 py-2 bg-black border-2 border-dashed border-orange-500 shadow-orange-500/30 shadow-md transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-200">
                  <span className="text-orange-400 font-bold text-sm uppercase tracking-wider flex items-center font-mono">
                    <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 92 92">
                      <path d="M90.156 41.965L50.036 1.848c-2.467-2.467-6.47-2.467-8.937 0l-8.332 8.332 10.562 10.562c2.623-.872 5.63-.292 7.72 1.798 2.102 2.109 2.678 5.134 1.78 7.768l10.185 10.185c2.634-.898 5.659-.322 7.768 1.78 2.93 2.93 2.93 7.678 0 10.607-2.93 2.93-7.678 2.93-10.607 0-2.21-2.21-2.755-5.458-1.64-8.177L48.73 34.899v29.75c.715.346 1.39.808 1.992 1.41 2.93 2.93 2.93 7.678 0 10.607-2.93 2.93-7.678 2.93-10.607 0-2.93-2.93-2.93-7.678 0-10.607.719-.719 1.545-1.293 2.446-1.722V34.28c-.9-.43-1.727-1.004-2.446-1.722-2.223-2.223-2.762-5.486-1.623-8.214L27.83 13.688 1.848 39.67c-2.467 2.467-2.467 6.47 0 8.937l40.12 40.117c2.467 2.467 6.47 2.467 8.937 0l39.95-39.95c2.468-2.467 2.468-6.47.001-8.937" />
                    </svg>
                    GIT
                  </span>
                </div>
              </div>

              {/* Workspace Content */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xl font-bold text-orange-400 group-hover:text-orange-300 transition-colors line-clamp-2 flex-1 font-mono">
                    <span className="text-orange-600">//</span> {workspace.name}
                  </h3>
                  {workspace.is_dirty && (
                    <span className="ml-2 px-2 py-1 text-xs font-mono bg-yellow-500/20 text-yellow-400 border border-dashed border-yellow-500/50">
                      [ MODIFIED ]
                    </span>
                  )}
                </div>

                {/* Repository Info */}
                <div className="flex flex-wrap gap-2 mt-3">
                  <div className="flex items-center text-sm text-orange-400 bg-orange-900/30 px-3 py-1.5 border border-dashed border-orange-500/30 font-mono">
                    <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"/>
                    </svg>
                    <span>{workspace.branch}</span>
                  </div>
                  <div className="flex items-center text-sm text-orange-500 bg-black px-3 py-1.5 border border-dashed border-orange-500/30 font-mono">
                    <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
                    </svg>
                    <span>{workspace.commit_count} commits</span>
                  </div>
                </div>

                {/* Remote URL */}
                {workspace.remote_url && (
                  <div className="mt-3 text-xs text-orange-600 truncate font-mono bg-black px-3 py-2 border border-dashed border-orange-500/30">
                    {workspace.remote_url}
                  </div>
                )}

                {/* Open Button */}
                <div className="mt-4 pt-4 border-t border-dashed border-orange-500/30">
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-sm text-orange-600">// click_to_open</span>
                    <svg className="w-5 h-5 text-orange-500 group-hover:text-orange-400 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Hover Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-orange-900/10 to-black opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
            </div>
          ))}
        </div>

        {/* No Results State */}
        {filteredSessions.length === 0 && workspaces.length === 0 && sessions.length > 0 && (
          <NoResultsState
            searchQuery={searchQuery}
            filterLanguage={filterLanguage}
            onClear={() => {
              setSearchQuery('');
              setFilterLanguage('all');
            }}
          />
        )}

        {/* Empty State */}
        {sessions.length === 0 && workspaces.length === 0 && (
          <EmptyState
            icon={
              <svg className="w-10 h-10 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
              </svg>
            }
            title="No sessions or repositories yet"
            description="Create your first coding session or clone a Git repository to start collaborating"
            action={{
              label: 'Create Your First Session',
              onClick: () => setShowCreateModal(true),
            }}
          />
        )}
      </main>

      {/* Create Session Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-lg flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-black border-2 border-green-500 shadow-neon max-w-2xl w-full max-h-[92vh] overflow-y-auto relative">
            
            {/* Modal Header - Sticky */}
            <div className="sticky top-0 bg-black z-20 px-8 pt-8 pb-6 border-b border-green-500/50">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="p-3 bg-black border-2 border-green-500 shadow-neon">
                      <svg className="w-7 h-7 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <h3 className="text-4xl font-bold text-green-500 font-mono neon-glow">
                      NEW_SESSION_
                    </h3>
                  </div>
                  <p className="text-green-600 text-sm ml-16 font-mono">// initialize new workspace</p>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-green-500 hover:text-red-500 transition-all p-3 hover:bg-red-500/20 border border-transparent hover:border-red-500"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="px-8 py-6 space-y-7">
              {/* Session Name Input */}
              <div className="group">
                <label htmlFor="sessionName" className="flex items-center text-sm font-bold text-green-400 mb-3 font-mono">
                  <span>SESSION_NAME</span>
                  <span className="text-red-400 ml-1.5">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-green-600 group-focus-within:text-green-400 transition-colors duration-300">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    id="sessionName"
                    value={newSessionName}
                    onChange={(e) => setNewSessionName(e.target.value)}
                    placeholder="python_api_dev"
                    className="w-full pl-12 pr-12 py-4 bg-black border-2 border-green-500/50 text-green-400 placeholder-green-700 focus:outline-none focus:border-green-400 focus:shadow-neon transition-all font-mono"
                    autoFocus
                  />
                  {newSessionName && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <div className="flex items-center space-x-1 animate-fadeIn">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <label htmlFor="sessionDescription" className="block text-sm font-bold text-green-400 mb-3 font-mono">
                  DESCRIPTION: <span className="text-green-700">(optional)</span>
                </label>
                <textarea
                  id="sessionDescription"
                  value={newSessionDescription}
                  onChange={(e) => setNewSessionDescription(e.target.value)}
                  placeholder="building_rest_apis_with_fastapi"
                  rows={3}
                  className="w-full px-5 py-4 bg-black border-2 border-green-500/50 text-green-400 placeholder-green-700 focus:outline-none focus:border-green-400 focus:shadow-neon transition-all font-mono resize-none"
                />
              </div>

              {/* Tags */}
              <div>
                <label htmlFor="sessionTags" className="block text-sm font-bold text-green-400 mb-3 font-mono">
                  TAGS: <span className="text-green-700">(optional)</span>
                </label>
                <div className="space-y-3">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      id="sessionTags"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleTagInputKeyDown}
                      placeholder="web, api, backend"
                      className="flex-1 px-5 py-3 bg-black border-2 border-green-500/50 text-green-400 placeholder-green-700 focus:outline-none focus:border-green-400 focus:shadow-neon transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="px-6 py-3 bg-green-500 hover:bg-green-400 text-black font-mono font-bold transition-all shadow-neon"
                    >
                      [ ADD ]
                    </button>
                  </div>
                  {newSessionTags.length > 0 && (
                    <div className="flex flex-wrap gap-2 animate-fadeIn">
                      {newSessionTags.map((tag, index) => (
                        <div
                          key={index}
                          className="flex items-center space-x-2 px-4 py-2 bg-green-900/30 border border-green-500/50 text-green-400 text-sm font-mono"
                        >
                          <span>#{tag}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="text-green-500 hover:text-red-400 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4 pt-8 sticky bottom-0 bg-black pb-4 border-t border-green-500/30 -mx-8 px-8">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-6 py-4 font-mono font-bold text-green-400 bg-black border-2 border-green-500/50 hover:border-green-400 focus:outline-none transition-all"
                >
                  [ CANCEL ]
                </button>
                <button
                  onClick={handleCreateSession}
                  disabled={!newSessionName.trim()}
                  className="flex-1 px-6 py-4 font-mono font-bold text-black bg-green-500 hover:bg-green-400 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-neon disabled:shadow-none"
                >
                  <span className="flex items-center justify-center space-x-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>[ CREATE ]</span>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Join by Code Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-black border-2 border-green-500 shadow-neon max-w-md w-full p-8 relative overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-3xl font-bold text-green-500 mb-1 font-mono neon-glow">JOIN_SESSION_</h3>
                <p className="text-green-600 text-sm font-mono">// enter 8-character share code</p>
              </div>
              <button
                onClick={() => {
                  setShowJoinModal(false);
                  setJoinCode('');
                  setJoinError('');
                }}
                className="text-green-500 hover:text-red-500 transition-colors p-2 border border-transparent hover:border-red-500"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="space-y-6">
              {/* Share Code Input */}
              <div>
                <label htmlFor="joinCode" className="block text-sm font-mono text-green-400 mb-3">
                  SHARE_CODE: <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
                    </svg>
                  </div>
                  <input
                    type="text"
                    id="joinCode"
                    value={joinCode}
                    onChange={(e) => {
                      setJoinCode(e.target.value.toUpperCase());
                      setJoinError('');
                    }}
                    placeholder="A3B7K9M2"
                    maxLength={8}
                    className="w-full pl-14 pr-5 py-4 bg-black border-2 border-green-500/50 text-green-400 placeholder-green-700 focus:outline-none focus:border-green-400 focus:shadow-neon transition-all text-lg font-mono tracking-wider uppercase"
                    autoFocus
                  />
                  {joinCode.length === 8 && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-neon-sm"></div>
                    </div>
                  )}
                </div>
                <p className="mt-2 text-xs text-green-700 font-mono">
                  // codes are 8 characters (letters and numbers)
                </p>
                {joinError && (
                  <div className="mt-3 p-3 bg-red-500/10 border border-red-500">
                    <p className="text-sm text-red-400 flex items-center font-mono">
                      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      [ ERROR ] {joinError}
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4 pt-6">
                <button
                  onClick={() => {
                    setShowJoinModal(false);
                    setJoinCode('');
                    setJoinError('');
                  }}
                  className="flex-1 px-6 py-4 font-mono font-bold text-green-400 bg-black border-2 border-green-500/50 hover:border-green-400 focus:outline-none transition-all"
                >
                  [ CANCEL ]
                </button>
                <button
                  onClick={handleJoinByCode}
                  disabled={joinCode.length !== 8}
                  className="flex-1 px-6 py-4 font-mono font-bold text-black bg-green-500 hover:bg-green-400 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-neon disabled:shadow-none"
                >
                  [ JOIN ]
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Keyboard Shortcuts Help */}
      {showShortcutsHelp && (
        <KeyboardShortcutsHelp
          shortcuts={shortcuts}
          onClose={() => setShowShortcutsHelp(false)}
        />
      )}
    </div>
  );
};
