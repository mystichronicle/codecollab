import React from 'react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 font-mono">
      <div className="relative inline-flex items-center justify-center mb-6">
        <div className="w-20 h-20 bg-black border border-cyan-500/50 flex items-center justify-center animate-pulse">
          {icon}
        </div>
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-purple-500 flex items-center justify-center shadow-[0_0_10px_rgba(168,85,247,0.5)] animate-bounce">
          <svg className="w-3.5 h-3.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
          </svg>
        </div>
      </div>
      
      <h3 className="text-xl font-bold text-green-400 mb-2">{title}</h3>
      <p className="text-green-600 text-center max-w-md mb-6">{description}</p>
      
      {action && (
        <button
          onClick={action.onClick}
          className="px-6 py-3 text-sm font-semibold text-black bg-green-500 border border-green-400 hover:bg-green-400 focus:outline-none transition-all duration-200 shadow-neon hover:scale-105 transform inline-flex items-center group"
        >
          <svg className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
          </svg>
          {action.label}
        </button>
      )}
    </div>
  );
};

interface NoResultsStateProps {
  searchQuery?: string;
  filterLanguage?: string;
  onClear: () => void;
}

export const NoResultsState: React.FC<NoResultsStateProps> = ({ searchQuery, filterLanguage, onClear }) => {
  return (
    <div className="text-center py-12 font-mono">
      <div className="w-16 h-16 mx-auto mb-4 bg-black border border-cyan-500/30 flex items-center justify-center">
        <svg className="w-8 h-8 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-green-400 mb-2">// no sessions found</h3>
      <p className="text-green-600 mb-4 text-sm">
        {searchQuery && filterLanguage && filterLanguage !== 'all'
          ? `// no sessions matching "${searchQuery}" in ${filterLanguage}`
          : searchQuery
          ? `// no sessions matching "${searchQuery}"`
          : filterLanguage && filterLanguage !== 'all'
          ? `// no ${filterLanguage} sessions available`
          : '// try adjusting your search or filter'}
      </p>
      <button
        onClick={onClear}
        className="px-5 py-2.5 text-sm font-medium text-cyan-400 bg-black border border-cyan-500/50 hover:border-cyan-400 hover:bg-cyan-500/10 transition-colors inline-flex items-center group"
      >
        <svg className="w-4 h-4 mr-2 group-hover:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
        </svg>
        [ CLEAR_FILTERS ]
      </button>
    </div>
  );
};
