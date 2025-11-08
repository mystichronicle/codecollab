import React, { useState, useEffect, useRef } from 'react';
import CodeEditor from './CodeEditor';
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

        {/* Output Panel */}
        <div className="w-96 border-l border-gray-700 flex flex-col bg-gray-900">
          <div className="bg-gray-800 border-b border-gray-700 p-3">
            <h2 className="text-sm font-semibold text-white flex items-center">
              Output
              {isExecuting && (
                <span className="ml-2 inline-block animate-spin">⟳</span>
              )}
            </h2>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap">
              {output || 'Click "Run Code" to see output here'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeSession;
