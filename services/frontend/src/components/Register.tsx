import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../api/client';

export const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      await apiClient.register(email, username, password, fullName);
      await apiClient.login(username, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

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
            NEW_USER_
          </h2>
          <p className="mt-2 text-center text-sm text-green-600 font-mono">
            [ REGISTRATION PROTOCOL ]
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="border border-red-500 bg-red-500/10 p-4">
              <p className="text-sm text-red-500 font-mono">[ ERROR ] {error}</p>
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-mono text-amber-500 mb-2">
                EMAIL:
              </label>
              <input
                type="email"
                required
                className="appearance-none block w-full px-3 py-2 border border-amber-500/50 bg-black text-amber-400 placeholder-amber-700 focus:outline-none focus:border-amber-400 focus:shadow-[0_0_10px_rgba(251,191,36,0.3)] font-mono transition-all"
                placeholder="user@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-mono text-cyan-500 mb-2">
                USERNAME:
              </label>
              <input
                type="text"
                required
                className="appearance-none block w-full px-3 py-2 border border-cyan-500/50 bg-black text-cyan-400 placeholder-cyan-700 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_10px_rgba(34,211,238,0.3)] font-mono transition-all"
                placeholder="hacker_name"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-mono text-green-500 mb-2">
                FULL_NAME: <span className="text-green-700">(optional)</span>
              </label>
              <input
                type="text"
                className="appearance-none block w-full px-3 py-2 border border-green-500/50 bg-black text-green-400 placeholder-green-700 focus:outline-none focus:border-green-400 focus:shadow-neon font-mono transition-all"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-mono text-purple-500 mb-2">
                PASSWORD: <span className="text-purple-700">(min 8 chars)</span>
              </label>
              <input
                type="password"
                required
                className="appearance-none block w-full px-3 py-2 border border-purple-500/50 bg-black text-purple-400 placeholder-purple-700 focus:outline-none focus:border-purple-400 focus:shadow-[0_0_10px_rgba(168,85,247,0.3)] font-mono transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-mono text-purple-500 mb-2">
                CONFIRM_PASSWORD:
              </label>
              <input
                type="password"
                required
                className="appearance-none block w-full px-3 py-2 border border-purple-500/50 bg-black text-purple-400 placeholder-purple-700 focus:outline-none focus:border-purple-400 focus:shadow-[0_0_10px_rgba(168,85,247,0.3)] font-mono transition-all"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group relative w-full flex justify-center py-3 px-4 border border-green-500 text-sm font-mono text-green-400 bg-black hover:bg-green-500 hover:text-black focus:outline-none focus:shadow-neon transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center">
                <span className="animate-pulse">[ CREATING ACCOUNT... ]</span>
              </span>
            ) : (
              '[ INITIALIZE REGISTRATION ]'
            )}
          </button>

          <div className="text-center border-t border-cyan-500/30 pt-4">
            <Link
              to="/login"
              className="font-mono text-cyan-400 hover:text-cyan-300 hover:shadow-[0_0_10px_rgba(34,211,238,0.3)] transition-all"
            >
              EXISTING USER? ACCESS_LOGIN
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
