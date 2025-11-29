import React, { useState } from 'react';
import { gitService } from '../services/gitService';

interface GitCredentialsConfigProps {
  sessionId: string;
  onClose: () => void;
  onConfigured?: () => void;
}

export const GitCredentialsConfig: React.FC<GitCredentialsConfigProps> = ({ 
  sessionId, 
  onClose, 
  onConfigured 
}) => {
  const [username, setUsername] = useState('');
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSave = async () => {
    if (!username.trim() || !token.trim()) {
      setError('Please enter both GitHub username and Personal Access Token');
      return;
    }

    // Validate token format (basic check for GitHub PAT format)
    const trimmedToken = token.trim();
    if (!trimmedToken.startsWith('ghp_') && !trimmedToken.startsWith('github_pat_') && !trimmedToken.startsWith('gho_')) {
      setError('Invalid token format. GitHub PATs typically start with ghp_, github_pat_, or gho_');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      await gitService.configureCredentials(sessionId, {
        github_username: username.trim(),
        github_token: trimmedToken,
      });
      
      // Clear sensitive data from state immediately after use
      setToken('');
      setUsername('');
      
      setSuccess('Credentials configured successfully! You can now push and pull.');
      setTimeout(() => {
        if (onConfigured) {
          onConfigured();
        }
        onClose();
      }, 2000);
    } catch (err: any) {
      // Clear token on error as well to minimize exposure time
      setToken('');
      setError(err.response?.data?.error || 'Failed to configure credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-black border-2 border-orange-500 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto font-mono">
        <div className="px-6 py-4 border-b border-orange-500/30 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <svg className="w-6 h-6 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h3 className="text-lg font-semibold text-orange-400 neon-glow">CONFIGURE_GIT_CREDENTIALS_</h3>
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
          <div className="bg-cyan-500/10 border border-cyan-500 p-4">
            <p className="text-sm text-cyan-400 mb-2">
              <span className="font-semibold">// To enable push/pull, you need a GitHub Personal Access Token (PAT)</span>
            </p>
            <ol className="text-xs text-cyan-300 space-y-1 ml-4 list-decimal">
              <li>Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)</li>
              <li>Click "Generate new token (classic)"</li>
              <li>Give it a name and select scopes: <strong>repo</strong> (full control)</li>
              <li>Generate and copy the token</li>
              <li>Paste it below (token is stored securely for this session only)</li>
            </ol>
            <a 
              href="https://github.com/settings/tokens" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center mt-2 text-xs text-orange-400 hover:text-orange-300"
            >
              <span>[ OPEN_GITHUB_TOKEN_SETTINGS ]</span>
              <svg className="w-3 h-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>

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
              GITHUB_USERNAME:
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="your-github-username"
              className="w-full px-3 py-2 bg-black border border-orange-500/50 text-orange-400 placeholder-orange-700 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-orange-500 mb-2">
              PERSONAL_ACCESS_TOKEN (PAT):
            </label>
            <div className="relative">
              <input
                type={showToken ? "text" : "password"}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full px-3 py-2 bg-black border border-orange-500/50 text-orange-400 placeholder-orange-700 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-400 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-orange-500 hover:text-orange-400"
              >
                {showToken ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500 p-3 space-y-2">
            <p><strong>[ WARNING ] SECURITY_NOTES:</strong></p>
            <ul className="ml-4 space-y-1 list-disc text-yellow-300">
              <li>Token is transmitted securely and cleared from memory after use</li>
              <li>Token is NOT stored in any database or logs</li>
              <li>Use tokens with minimal required permissions (repo access only)</li>
              <li>Set token expiration in GitHub settings</li>
              <li>Revoke tokens from GitHub when no longer needed</li>
              <li>Never share your PAT with anyone</li>
            </ul>
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
            <span>{isLoading ? 'CONFIGURING...' : '[ SAVE_CREDENTIALS ]'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
