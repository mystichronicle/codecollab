import React from 'react';
import { Session } from '../services/api';

interface SessionStatsProps {
  sessions: Session[];
}

export const SessionStats: React.FC<SessionStatsProps> = ({ sessions }) => {
  const totalSessions = sessions.length;
  const activeSessions = sessions.filter(s => s.is_active).length;
  const totalParticipants = sessions.reduce((sum, s) => sum + s.participants.length, 0);
  
  const languageStats = sessions.reduce((acc, session) => {
    acc[session.language] = (acc[session.language] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const topLanguage = Object.entries(languageStats).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      {/* Total Sessions - Green (primary) */}
      <div className="bg-black border border-green-500/50 p-4 hover:border-green-400 transition-colors">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-green-600 font-mono">TOTAL_SESSIONS</p>
            <p className="text-3xl font-bold text-green-400 mt-1 font-mono">{totalSessions}</p>
          </div>
          <div className="w-12 h-12 border border-green-500/30 flex items-center justify-center">
            <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
        </div>
      </div>

      {/* Active Now - Cyan (energy/live) */}
      <div className="bg-black border border-cyan-500/50 p-4 hover:border-cyan-400 transition-colors">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-cyan-600 font-mono">ACTIVE_NOW</p>
            <p className="text-3xl font-bold text-cyan-400 mt-1 font-mono">{activeSessions}</p>
          </div>
          <div className="w-12 h-12 border border-cyan-500/30 flex items-center justify-center">
            <svg className="w-6 h-6 text-cyan-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Participants - Purple (people/social) */}
      <div className="bg-black border border-purple-500/50 p-4 hover:border-purple-400 transition-colors">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-purple-600 font-mono">PARTICIPANTS</p>
            <p className="text-3xl font-bold text-purple-400 mt-1 font-mono">{totalParticipants}</p>
          </div>
          <div className="w-12 h-12 border border-purple-500/30 flex items-center justify-center">
            <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Top Language - Amber (achievement/trophy) */}
      <div className="bg-black border border-amber-500/50 p-4 hover:border-amber-400 transition-colors">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-amber-600 font-mono">TOP_LANGUAGE</p>
            <p className="text-2xl font-bold text-amber-400 mt-1 font-mono uppercase">{topLanguage?.[0] || 'N/A'}</p>
          </div>
          <div className="w-12 h-12 border border-amber-500/30 flex items-center justify-center">
            <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};
