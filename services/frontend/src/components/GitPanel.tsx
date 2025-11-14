import React, { useState, useEffect } from 'react';
import { gitService, GitStatus, GitBranches } from '../services/gitService';

interface GitPanelProps {
  sessionId: string;
  onCloneSuccess?: () => void;
}

export const GitPanel: React.FC<GitPanelProps> = ({ sessionId, onCloneSuccess }) => {
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('master');
  const [isCloning, setIsCloning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [hasRepo, setHasRepo] = useState(false);
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null);
  const [branches, setBranches] = useState<GitBranches | null>(null);
  
  const [commitMessage, setCommitMessage] = useState('');
  const [newBranchName, setNewBranchName] = useState('');
  const [showBranchInput, setShowBranchInput] = useState(false);

  useEffect(() => {
    checkRepositoryStatus();
  }, [sessionId]);

  const checkRepositoryStatus = async () => {
    try {
      const status = await gitService.getStatus(sessionId);
      setHasRepo(true);
      setGitStatus(status);
      await loadBranches();
    } catch (err) {
      setHasRepo(false);
      setGitStatus(null);
    }
  };

  const loadBranches = async () => {
    try {
      const branchList = await gitService.listBranches(sessionId);
      setBranches(branchList);
    } catch (err) {
      console.error('Failed to load branches:', err);
    }
  };

  const handleClone = async () => {
    if (!repoUrl.trim()) {
      setError('Please enter a repository URL');
      return;
    }

    setIsCloning(true);
    setError('');
    setSuccess('');

    try {
      await gitService.cloneRepository(sessionId, {
        repo_url: repoUrl,
        branch: branch || undefined,
      });
      setSuccess('Repository cloned successfully!');
      setHasRepo(true);
      await checkRepositoryStatus();
      setRepoUrl('');
      if (onCloneSuccess) {
        onCloneSuccess();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to clone repository');
    } finally {
      setIsCloning(false);
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    setError('');
    try {
      await checkRepositoryStatus();
      setSuccess('Status refreshed!');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to refresh status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!commitMessage.trim()) {
      setError('Please enter a commit message');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      await gitService.commitChanges(sessionId, {
        message: commitMessage,
      });
      setSuccess('Changes committed successfully!');
      setCommitMessage('');
      await checkRepositoryStatus();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to commit changes');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePush = async () => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      await gitService.pushChanges(sessionId);
      setSuccess('Changes pushed successfully!');
      await checkRepositoryStatus();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to push changes');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePull = async () => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      await gitService.pullChanges(sessionId);
      setSuccess('Changes pulled successfully!');
      await checkRepositoryStatus();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to pull changes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) {
      setError('Please enter a branch name');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      await gitService.createBranch(sessionId, {
        branch_name: newBranchName,
        checkout: true,
      });
      setSuccess(`Branch '${newBranchName}' created and checked out!`);
      setNewBranchName('');
      setShowBranchInput(false);
      await checkRepositoryStatus();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create branch');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchBranch = async (branchName: string) => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      await gitService.checkoutBranch(sessionId, {
        branch_name: branchName,
      });
      setSuccess(`Switched to branch '${branchName}'`);
      await checkRepositoryStatus();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to switch branch');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold flex items-center">
            <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
            Git Integration
          </h2>
          {hasRepo && (
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh status"
            >
              <svg className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
        </div>
        
        {/* Status Messages */}
        {error && (
          <div className="mb-3 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-3 p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-200 text-sm">
            {success}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {!hasRepo ? (
          /* Clone Repository Form */
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Repository URL</label>
              <input
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/user/repo.git"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Branch (optional)</label>
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="master"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={handleClone}
              disabled={isCloning}
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isCloning ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  Cloning...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Clone Repository
                </>
              )}
            </button>
          </div>
        ) : (
          /* Repository Information */
          <div className="p-4 space-y-4">
            {/* Current Branch */}
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Current Branch</h3>
                <button
                  onClick={() => setShowBranchInput(!showBranchInput)}
                  className="text-sm px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                >
                  New Branch
                </button>
              </div>
              
              {gitStatus && (
                <div className="flex items-center text-green-400 font-mono">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                  {gitStatus.branch}
                </div>
              )}

              {showBranchInput && (
                <div className="mt-3 flex space-x-2">
                  <input
                    type="text"
                    value={newBranchName}
                    onChange={(e) => setNewBranchName(e.target.value)}
                    placeholder="feature/new-branch"
                    className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <button
                    onClick={handleCreateBranch}
                    disabled={isLoading}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm transition-colors disabled:opacity-50"
                  >
                    Create
                  </button>
                </div>
              )}

              {branches && branches.branches.length > 1 && (
                <div className="mt-3">
                  <p className="text-xs text-gray-400 mb-2">Switch to:</p>
                  <div className="space-y-1">
                    {branches.branches
                      .filter(b => b !== gitStatus?.branch)
                      .map(branchName => (
                        <button
                          key={branchName}
                          onClick={() => handleSwitchBranch(branchName)}
                          disabled={isLoading}
                          className="w-full text-left px-3 py-2 bg-gray-900 hover:bg-gray-700 rounded text-sm transition-colors disabled:opacity-50"
                        >
                          {branchName}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Repository Status */}
            {gitStatus && (
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="font-semibold mb-3">Repository Status</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Modified files:</span>
                    <span className={gitStatus.modified.length > 0 ? 'text-yellow-400' : 'text-gray-500'}>
                      {gitStatus.modified.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Untracked files:</span>
                    <span className={gitStatus.untracked.length > 0 ? 'text-blue-400' : 'text-gray-500'}>
                      {gitStatus.untracked.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Staged files:</span>
                    <span className={gitStatus.staged.length > 0 ? 'text-green-400' : 'text-gray-500'}>
                      {gitStatus.staged.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total commits:</span>
                    <span className="text-gray-300">{gitStatus.commit_count}</span>
                  </div>
                </div>

                {gitStatus.is_dirty && (
                  <div className="mt-3 p-2 bg-yellow-500/20 border border-yellow-500/50 rounded text-yellow-200 text-xs">
                    ⚠️ You have uncommitted changes
                  </div>
                )}
              </div>
            )}

            {/* Commit Section */}
            {gitStatus && gitStatus.is_dirty && (
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="font-semibold mb-3">Commit Changes</h3>
                <textarea
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="Enter commit message..."
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                />
                <button
                  onClick={handleCommit}
                  disabled={isLoading || !commitMessage.trim()}
                  className="w-full mt-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Commit All Changes
                </button>
              </div>
            )}

            {/* Sync Actions */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="font-semibold mb-3">Sync with Remote</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handlePull}
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Pull
                </button>
                <button
                  onClick={handlePush}
                  disabled={isLoading}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Push
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
