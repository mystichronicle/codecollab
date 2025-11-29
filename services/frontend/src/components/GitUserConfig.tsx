import React, { useState, useEffect } from 'react';
import { gitService, GitUserConfig as GitUserConfigType } from '../services/gitService';

interface GitUserConfigProps {
  sessionId: string;
  onClose: () => void;
  onConfigured?: () => void;
}

export const GitUserConfig: React.FC<GitUserConfigProps> = ({ sessionId, onClose, onConfigured }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [globalConfig, setGlobalConfig] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentConfig, setCurrentConfig] = useState<GitUserConfigType | null>(null);

  useEffect(() => {
    loadCurrentConfig();
  }, [sessionId]);

  const loadCurrentConfig = async () => {
    try {
      const config = await gitService.getUserConfig(sessionId);
      if (config.success) {
        setCurrentConfig(config);
        setName(config.name || '');
        setEmail(config.email || '');
      } else {
        // Config not set yet, that's okay
        console.log('Git user not configured yet:', config.message || config.error);
      }
    } catch (err: any) {
      // Network or other error, that's okay
      console.log('Could not load Git config:', err.message);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !email.trim()) {
      setError('Please enter both name and email');
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      await gitService.configureUser(sessionId, {
        name: name.trim(),
        email: email.trim(),
        global_config: globalConfig,
      });
      
      setSuccess('Git user configured successfully!');
      setTimeout(() => {
        if (onConfigured) {
          onConfigured();
        }
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to configure Git user');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-black border-2 border-orange-500 max-w-md w-full mx-4 font-mono">
        <div className="px-6 py-4 border-b border-orange-500/30 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <svg className="w-6 h-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <h3 className="text-lg font-semibold text-orange-400 neon-glow">CONFIGURE_GIT_USER_</h3>
          </div>
          <button
            onClick={onClose}
            className="text-orange-500 hover:text-red-500 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          {currentConfig && (
            <div className="bg-cyan-500/10 border border-cyan-500 p-3">
              <p className="text-sm text-cyan-400">
                <span className="font-semibold">CURRENT: </span>
                {currentConfig.name} &lt;{currentConfig.email}&gt;
                <span className="ml-2 text-xs text-cyan-500">({currentConfig.scope})</span>
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500 p-3">
              <p className="text-sm text-red-400">[ ERROR ] {error}</p>
            </div>
          )}

          {success && (
            <div className="bg-orange-500/10 border border-orange-500 p-3">
              <p className="text-sm text-orange-400">[ SUCCESS ] {success}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-orange-500 mb-2">
              FULL_NAME:
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              className="w-full px-3 py-2 bg-black border border-orange-500/50 text-orange-400 placeholder-orange-700 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-orange-500 mb-2">
              EMAIL_ADDRESS:
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john.doe@example.com"
              className="w-full px-3 py-2 bg-black border border-orange-500/50 text-orange-400 placeholder-orange-700 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-400"
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="global-config"
              checked={globalConfig}
              onChange={(e) => setGlobalConfig(e.target.checked)}
              className="w-4 h-4 text-orange-600 bg-black border-orange-500 focus:ring-orange-500"
            />
            <label htmlFor="global-config" className="text-sm text-orange-400">
              configure_globally (applies to all repositories)
            </label>
          </div>

          <div className="text-xs text-orange-600 bg-orange-500/5 border border-orange-500/30 p-3">
            <p className="mb-1">// TIP:</p>
            <p>Your Git identity is used to sign commits. This information will appear in commit history.</p>
          </div>
        </div>
        
        <div className="px-6 py-4 border-t border-orange-500/30 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-black hover:bg-orange-500/10 text-orange-400 border border-orange-500/50 hover:border-orange-400 transition-colors"
          >
            [ CANCEL ]
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-400 text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 font-bold shadow-neon"
          >
            {isLoading && (
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-black"></div>
            )}
            <span>{isLoading ? 'SAVING...' : '[ SAVE_CONFIG ]'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
