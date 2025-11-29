import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import { authAPI } from '../services/api';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  // Check if already logged in with valid token
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          // Verify token is valid
          await authAPI.getCurrentUser();
          // Token is valid, redirect to dashboard
          navigate('/dashboard', { replace: true });
        } catch (err) {
          // Token is invalid, clear it
          localStorage.removeItem('access_token');
        }
      }
      setChecking(false);
    };
    
    checkAuth();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await apiClient.login(username, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto shadow-neon"></div>
          <p className="mt-4 text-green-500 font-mono">[ AUTHENTICATING... ]</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden">
      {/* Matrix-like background effect */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 0, 0.03) 2px, rgba(0, 255, 0, 0.03) 4px)`
        }}></div>
      </div>
      
      <div className="max-w-md w-full space-y-8 p-8 bg-black border border-green-500 rounded-none shadow-neon relative z-10">
        {/* Terminal-style header */}
        <div className="border-b border-green-500 pb-4">
          <div className="flex items-center space-x-2 mb-2">
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
            <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
          </div>
          <h2 className="text-center text-3xl font-bold text-green-500 font-mono neon-glow">
            CodeCollab_
          </h2>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="border border-red-500 bg-red-500/10 p-4">
              <p className="text-sm text-red-500 font-mono">[ ERROR ] {error}</p>
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-mono text-cyan-500 mb-2">
                USERNAME:
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="appearance-none block w-full px-3 py-2 border border-cyan-500/50 bg-black text-cyan-400 placeholder-cyan-700 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_10px_rgba(34,211,238,0.3)] font-mono transition-all"
                placeholder="enter_username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-mono text-purple-500 mb-2">
                PASSWORD:
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none block w-full px-3 py-2 border border-purple-500/50 bg-black text-purple-400 placeholder-purple-700 focus:outline-none focus:border-purple-400 focus:shadow-[0_0_10px_rgba(168,85,247,0.3)] font-mono transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-green-500 text-sm font-mono text-green-400 bg-black hover:bg-green-500 hover:text-black focus:outline-none focus:shadow-neon transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center">
                  <span className="animate-pulse">[ ACCESSING... ]</span>
                </span>
              ) : (
                '[ INITIALIZE LOGIN ]'
              )}
            </button>
          </div>

          <div className="text-center border-t border-purple-500/30 pt-4">
            <Link
              to="/register"
              className="font-mono text-purple-400 hover:text-purple-300 hover:shadow-[0_0_10px_rgba(168,85,247,0.3)] transition-all"
            >
              NEW USER? CREATE_ACCOUNT
            </Link>
          </div>
        </form>
        
        {/* Blinking cursor effect */}
        <div className="text-green-500 font-mono text-sm">
          <span className="terminal-cursor">█</span>
        </div>
      </div>
    </div>
  );
};
