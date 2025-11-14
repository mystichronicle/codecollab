import React, { useState, useEffect, useRef } from 'react';
import CodeEditor from './CodeEditor';
import { GitPanel } from './GitPanel';
import GitFileExplorer from './GitFileExplorer';
import { io, Socket } from 'socket.io-client';

interface CodeSessionProps {
  sessionId: string;
  sessionName?: string;
}

interface ExecutionResult {
  output: string;
  error?: string;
  exitCode?: number;
  executionTime?: number;
}

const CodeSession: React.FC<CodeSessionProps> = ({ sessionId, sessionName = 'Untitled Session' }) => {
  const [language, setLanguage] = useState('python');
  const [output, setOutput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState<'output' | 'git' | 'files'>('output');
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Connect to collaboration service for execution results
    const socket = io('http://localhost:8002', {
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('execution_result', (result: ExecutionResult) => {
      setIsExecuting(false);
      if (result.error) {
        setOutput(`Error:\n${result.error}\n\nOutput:\n${result.output}`);
      } else {
        setOutput(
          `Execution Time: ${result.executionTime}ms\nExit Code: ${result.exitCode}\n\nOutput:\n${result.output}`
        );
      }
    });

    socket.on('execution_started', () => {
      setIsExecuting(true);
      setOutput('Executing code...\n');
    });

    return () => {
      socket.disconnect();
    };
  }, [sessionId]);

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    setOutput(''); // Clear output when language changes
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <h1 className="text-xl font-semibold text-white">{sessionName}</h1>
        <p className="text-sm text-gray-400">Session ID: {sessionId}</p>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor Panel */}
        <div className="flex-1 flex flex-col">
          <CodeEditor
            sessionId={sessionId}
            language={language}
            onLanguageChange={handleLanguageChange}
          />
        </div>

        {/* Right Panel with Tabs */}
        <div className="w-[500px] border-l border-gray-700 flex flex-col bg-gray-900">
          {/* Tab Headers */}
          <div className="bg-gray-800 border-b border-gray-700 flex">
            <button
              onClick={() => setRightPanelTab('output')}
              className={`flex-1 px-4 py-3 text-sm font-semibold transition-all ${
                rightPanelTab === 'output'
                  ? 'bg-gray-900 text-white border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Output</span>
                {isExecuting && (
                  <span className="inline-block animate-spin">⟳</span>
                )}
              </div>
            </button>
            <button
              onClick={() => setRightPanelTab('files')}
              className={`flex-1 px-4 py-3 text-sm font-semibold transition-all ${
                rightPanelTab === 'files'
                  ? 'bg-gray-900 text-white border-b-2 border-purple-500'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <span>Files</span>
              </div>
            </button>
            <button
              onClick={() => setRightPanelTab('git')}
              className={`flex-1 px-4 py-3 text-sm font-semibold transition-all ${
                rightPanelTab === 'git'
                  ? 'bg-gray-900 text-white border-b-2 border-green-500'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                <span>Git</span>
              </div>
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden">
            {rightPanelTab === 'output' && (
              <div className="h-full flex flex-col">
                <div className="flex-1 overflow-auto p-4">
                  <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap">
                    {output || 'Click "Run Code" to see output here'}
                  </pre>
                </div>
              </div>
            )}
            
            {rightPanelTab === 'files' && (
              <div className="h-full p-4">
                <GitFileExplorer sessionId={sessionId} />
              </div>
            )}
            
            {rightPanelTab === 'git' && (
              <div className="h-full overflow-auto p-4">
                <GitPanel sessionId={sessionId} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeSession;
