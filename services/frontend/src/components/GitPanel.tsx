import React, { useState, useEffect } from 'react';
import { gitService, GitStatus, GitBranches } from '../services/gitService';
import { GitUserConfig } from './GitUserConfig';
import { GitCredentialsConfig } from './GitCredentialsConfig';

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
  const [showUserConfig, setShowUserConfig] = useState(false);
  const [showCredentialsConfig, setShowCredentialsConfig] = useState(false);

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
      const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Failed to push changes';
      setError(errorMessage);
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
      const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Failed to pull changes';
      setError(errorMessage);
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
    <div className="h-full bg-black text-orange-400 flex flex-col font-mono">
      {/* Header */}
      <div className="p-4 border-b-2 border-dashed border-orange-500/50">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold flex items-center">
            <span className="text-orange-600 mr-2">//</span>
            <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
            GIT_INTEGRATION_
          </h2>
          {hasRepo && (
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="p-2 hover:bg-orange-500/20 border border-dashed border-transparent hover:border-orange-500 transition-colors disabled:opacity-50"
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
          <div className="mb-3 p-3 bg-red-500/10 border-2 border-dashed border-red-500 text-red-400 text-sm">
            [ ERROR ] {error}
          </div>
        )}
        {success && (
          <div className="mb-3 p-3 bg-orange-500/10 border-2 border-dashed border-orange-500 text-orange-400 text-sm">
            [ SUCCESS ] {success}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {!hasRepo ? (
          /* Clone Repository Form */
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-orange-500"><span className="text-orange-600">//</span> REPOSITORY_URL:</label>
              <input
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/user/repo.git"
                className="w-full px-3 py-2 bg-black border-2 border-dashed border-orange-500/50 text-orange-400 placeholder-orange-700 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-orange-500"><span className="text-orange-600">//</span> BRANCH (optional):</label>
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="master"
                className="w-full px-3 py-2 bg-black border-2 border-dashed border-orange-500/50 text-orange-400 placeholder-orange-700 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-400"
              />
            </div>

            <button
              onClick={handleClone}
              disabled={isCloning}
              className="w-full px-4 py-3 bg-orange-500 hover:bg-orange-400 text-black font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-neon"
            >
              {isCloning ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  CLONING...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  [ CLONE_REPOSITORY ]
                </>
              )}
            </button>
          </div>
        ) : (
          /* Repository Information */
          <div className="p-4 space-y-4">
            {/* Current Branch */}
            <div className="bg-black border border-orange-500/30 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-orange-400">CURRENT_BRANCH:</h3>
                <button
                  onClick={() => setShowBranchInput(!showBranchInput)}
                  className="text-sm px-3 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/50 hover:border-cyan-400 transition-colors"
                >
                  + New Branch
                </button>
              </div>
              
              {gitStatus && (
                <div className="flex items-center text-orange-400 neon-glow">
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
                    className="flex-1 px-3 py-2 bg-black border border-orange-500/50 text-orange-400 placeholder-orange-700 focus:outline-none focus:ring-1 focus:ring-orange-500 text-sm"
                  />
                  <button
                    onClick={handleCreateBranch}
                    disabled={isLoading}
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-400 text-black text-sm font-bold transition-colors disabled:opacity-50"
                  >
                    Create
                  </button>
                </div>
              )}

              {branches && branches.branches.length > 1 && (
                <div className="mt-3">
                  <p className="text-xs text-orange-600 mb-2">// switch to:</p>
                  <div className="space-y-1">
                    {branches.branches
                      .filter(b => b !== gitStatus?.branch)
                      .map(branchName => (
                        <button
                          key={branchName}
                          onClick={() => handleSwitchBranch(branchName)}
                          disabled={isLoading}
                          className="w-full text-left px-3 py-2 bg-black border border-orange-500/30 hover:border-orange-400 hover:bg-orange-500/10 text-sm transition-colors disabled:opacity-50"
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
              <div className="bg-black border border-orange-500/30 p-4">
                <h3 className="font-semibold mb-3 text-orange-400">REPOSITORY_STATUS:</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-orange-600">modified_files:</span>
                    <span className={gitStatus.modified.length > 0 ? 'text-yellow-400' : 'text-orange-700'}>
                      {gitStatus.modified.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-orange-600">untracked_files:</span>
                    <span className={gitStatus.untracked.length > 0 ? 'text-cyan-400' : 'text-orange-700'}>
                      {gitStatus.untracked.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-orange-600">staged_files:</span>
                    <span className={gitStatus.staged.length > 0 ? 'text-orange-400' : 'text-orange-700'}>
                      {gitStatus.staged.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-orange-600">total_commits:</span>
                    <span className="text-orange-400">{gitStatus.commit_count}</span>
                  </div>
                </div>

                {gitStatus.is_dirty && (
                  <div className="mt-3 p-2 bg-yellow-500/10 border border-yellow-500 text-yellow-400 text-xs">
                    [ WARNING ] uncommitted changes detected
                  </div>
                )}
              </div>
            )}

            {/* Commit Section */}
            {gitStatus && gitStatus.is_dirty && (
              <div className="bg-black border border-orange-500/30 p-4">
                <h3 className="font-semibold mb-3 text-orange-400">COMMIT_CHANGES:</h3>
                <textarea
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="// enter commit message..."
                  rows={3}
                  className="w-full px-3 py-2 bg-black border border-orange-500/50 text-orange-400 placeholder-orange-700 focus:outline-none focus:ring-1 focus:ring-orange-500 text-sm resize-none"
                />
                <button
                  onClick={handleCommit}
                  disabled={isLoading || !commitMessage.trim()}
                  className="w-full mt-2 px-4 py-2 bg-orange-500 hover:bg-orange-400 text-black text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  [ COMMIT_ALL_CHANGES ]
                </button>
              </div>
            )}

            {/* Sync Actions */}
            <div className="bg-black border border-orange-500/30 p-4">
              <h3 className="font-semibold mb-3 text-orange-400">SYNC_WITH_REMOTE:</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handlePull}
                  disabled={isLoading}
                  className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/50 hover:border-cyan-400 text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Pull
                </button>
                <button
                  onClick={handlePush}
                  disabled={isLoading}
                  className="px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/50 hover:border-orange-400 text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Push
                </button>
              </div>
            </div>

            {/* Git User Configuration */}
            <div className="bg-black border border-orange-500/30 p-4">
              <h3 className="font-semibold mb-3 text-orange-400">GIT_CONFIGURATION:</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setShowUserConfig(true)}
                  className="w-full px-4 py-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/50 hover:border-orange-400 text-sm font-medium transition-colors flex items-center justify-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Configure Git User
                </button>
                <button
                  onClick={() => setShowCredentialsConfig(true)}
                  className="w-full px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 hover:border-cyan-400 text-sm font-medium transition-colors flex items-center justify-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  Configure Credentials
                </button>
              </div>
              <p className="text-xs text-orange-700 mt-2">
                // set your name, email, and GitHub credentials
              </p>
            </div>
          </div>
        )}

        {/* Git User Config Modal */}
        {showUserConfig && (
          <GitUserConfig
            sessionId={sessionId}
            onClose={() => setShowUserConfig(false)}
            onConfigured={() => {
              setSuccess('Git user configured successfully!');
              setTimeout(() => setSuccess(''), 3000);
            }}
          />
        )}

        {/* Git Credentials Config Modal */}
        {showCredentialsConfig && (
          <GitCredentialsConfig
            sessionId={sessionId}
            onClose={() => setShowCredentialsConfig(false)}
            onConfigured={() => {
              setSuccess('Git credentials configured successfully! You can now push and pull.');
              setTimeout(() => setSuccess(''), 5000);
            }}
          />
        )}
      </div>
    </div>
  );
};
