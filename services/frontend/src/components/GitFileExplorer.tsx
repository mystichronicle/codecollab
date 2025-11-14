import React, { useState, useEffect } from 'react';
import { gitService, FileTreeItem, GitStatus } from '../services/gitService';

interface GitFileExplorerProps {
  sessionId: string;
}

interface FileWithStatus extends FileTreeItem {
  gitStatus?: 'M' | 'A' | 'D' | '??' | 'R';
  children?: FileWithStatus[];
}

const GitFileExplorer: React.FC<GitFileExplorerProps> = ({ sessionId }) => {
  const [fileTree, setFileTree] = useState<FileWithStatus[]>([]);
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'tree' | 'diff'>('tree');

  useEffect(() => {
    loadFileTree();
    loadGitStatus();
  }, [sessionId]);

  const loadFileTree = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const tree = await gitService.getFileTree(sessionId);
      setFileTree(tree.tree as FileWithStatus[]);
    } catch (err: any) {
      setError(err.message || 'Failed to load file tree');
    } finally {
      setIsLoading(false);
    }
  };

  const loadGitStatus = async () => {
    try {
      const status = await gitService.getStatus(sessionId);
      setGitStatus(status);
      
      // Update file tree with git status
      if (fileTree.length > 0) {
        updateFileTreeWithStatus(fileTree, status);
      }
    } catch (err: any) {
      console.error('Failed to load git status:', err);
    }
  };

  const updateFileTreeWithStatus = (tree: FileWithStatus[], status: GitStatus) => {
    const modifiedSet = new Set(status.modified);
    const untrackedSet = new Set(status.untracked);
    const stagedSet = new Set(status.staged);

    const updateNode = (node: FileWithStatus, path: string = '') => {
      const fullPath = path ? `${path}/${node.name}` : node.name;
      
      if (node.type === 'file') {
        if (stagedSet.has(fullPath)) {
          node.gitStatus = 'A';
        } else if (modifiedSet.has(fullPath)) {
          node.gitStatus = 'M';
        } else if (untrackedSet.has(fullPath)) {
          node.gitStatus = '??';
        }
      }
      
      if (node.children) {
        node.children.forEach(child => updateNode(child, fullPath));
      }
    };

    tree.forEach(node => updateNode(node));
    setFileTree([...tree]);
  };

  const handleFileClick = async (filePath: string) => {
    setSelectedFile(filePath);
    setViewMode('diff');
    
    try {
      const content = await gitService.readFile(sessionId, { file_path: filePath });
      setFileContent(content.content);
    } catch (err: any) {
      setError(err.message || 'Failed to read file');
    }
  };

  const toggleDirectory = (dirPath: string) => {
    const newExpanded = new Set(expandedDirs);
    if (newExpanded.has(dirPath)) {
      newExpanded.delete(dirPath);
    } else {
      newExpanded.add(dirPath);
    }
    setExpandedDirs(newExpanded);
  };

  const getStatusBadge = (status?: 'M' | 'A' | 'D' | '??' | 'R') => {
    if (!status) return null;

    const badges = {
      'M': { label: 'M', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40', tooltip: 'Modified' },
      'A': { label: 'A', color: 'bg-green-500/20 text-green-400 border-green-500/40', tooltip: 'Added' },
      'D': { label: 'D', color: 'bg-red-500/20 text-red-400 border-red-500/40', tooltip: 'Deleted' },
      '??': { label: '??', color: 'bg-blue-500/20 text-blue-400 border-blue-500/40', tooltip: 'Untracked' },
      'R': { label: 'R', color: 'bg-purple-500/20 text-purple-400 border-purple-500/40', tooltip: 'Renamed' },
    };

    const badge = badges[status];
    return (
      <span
        className={`px-2 py-0.5 rounded text-xs font-bold border ${badge.color}`}
        title={badge.tooltip}
      >
        {badge.label}
      </span>
    );
  };

  const renderFileTree = (nodes: FileWithStatus[], path: string = '', level: number = 0): React.ReactNode => {
    return nodes.map((node, index) => {
      const fullPath = path ? `${path}/${node.name}` : node.name;
      const isExpanded = expandedDirs.has(fullPath);
      const isSelected = selectedFile === fullPath;

      if (node.type === 'directory') {
        return (
          <div key={`${fullPath}-${index}`} className="animate-fadeIn">
            <div
              onClick={() => toggleDirectory(fullPath)}
              className="flex items-center space-x-2 px-3 py-2 hover:bg-gray-800/50 rounded-lg cursor-pointer transition-all group"
              style={{ paddingLeft: `${level * 20 + 12}px` }}
            >
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <span className="text-gray-300 font-medium group-hover:text-white transition-colors">{node.name}</span>
            </div>
            {isExpanded && node.children && (
              <div className="ml-2">
                {renderFileTree(node.children, fullPath, level + 1)}
              </div>
            )}
          </div>
        );
      }

      return (
        <div
          key={`${fullPath}-${index}`}
          onClick={() => handleFileClick(fullPath)}
          className={`flex items-center justify-between px-3 py-2 hover:bg-gray-800/70 rounded-lg cursor-pointer transition-all group ${
            isSelected ? 'bg-purple-500/20 border-l-2 border-purple-500' : ''
          }`}
          style={{ paddingLeft: `${level * 20 + 32}px` }}
        >
          <div className="flex items-center space-x-2 flex-1">
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className={`text-sm ${isSelected ? 'text-white font-semibold' : 'text-gray-400 group-hover:text-gray-200'} transition-colors`}>
              {node.name}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {node.gitStatus && getStatusBadge(node.gitStatus)}
            {node.size && (
              <span className="text-xs text-gray-600">{formatBytes(node.size)}</span>
            )}
          </div>
        </div>
      );
    });
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const refresh = async () => {
    await Promise.all([loadFileTree(), loadGitStatus()]);
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-gray-700/50 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700/50 bg-gray-900/50 backdrop-blur">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">File Explorer</h3>
            {gitStatus && (
              <p className="text-xs text-gray-400">
                Branch: <span className="text-blue-400 font-semibold">{gitStatus.current_branch}</span>
                {gitStatus.is_dirty && (
                  <span className="ml-2 px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs">
                    Uncommitted changes
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode(viewMode === 'tree' ? 'diff' : 'tree')}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-all"
            title={viewMode === 'tree' ? 'Show diff view' : 'Show tree view'}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {viewMode === 'tree' ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              )}
            </svg>
          </button>
          <button
            onClick={refresh}
            disabled={isLoading}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-all disabled:opacity-50"
            title="Refresh"
          >
            <svg className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Error Toast */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm animate-fadeIn">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'tree' ? (
          <div className="h-full overflow-y-auto p-2">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
              </div>
            ) : fileTree.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <p className="text-lg font-semibold">No repository cloned</p>
                <p className="text-sm">Clone a repository to view files</p>
              </div>
            ) : (
              <div className="space-y-1">
                {renderFileTree(fileTree)}
              </div>
            )}
          </div>
        ) : (
          <div className="h-full overflow-y-auto p-4">
            {selectedFile ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-700/50">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-white font-semibold">{selectedFile}</span>
                  </div>
                  <button
                    onClick={() => setViewMode('tree')}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50">
                  <pre className="text-sm text-gray-300 font-mono overflow-x-auto">
                    <code>{fileContent || 'Loading...'}</code>
                  </pre>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-lg font-semibold">No file selected</p>
                <p className="text-sm">Click a file to view its contents</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status Bar */}
      {gitStatus && (
        <div className="border-t border-gray-700/50 bg-gray-900/50 backdrop-blur px-4 py-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <span className="text-gray-500">Modified:</span>
                <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded font-semibold">
                  {gitStatus.modified.length}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-gray-500">Untracked:</span>
                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded font-semibold">
                  {gitStatus.untracked.length}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-gray-500">Staged:</span>
                <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded font-semibold">
                  {gitStatus.staged.length}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-gray-400">Connected</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GitFileExplorer;
