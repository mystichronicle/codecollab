import React, { useRef, useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import { io, Socket } from 'socket.io-client';

interface CodeEditorProps {
  sessionId: string;
  language?: string;
  onLanguageChange?: (language: string) => void;
}

const SUPPORTED_LANGUAGES = [
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
  { value: 'java', label: 'Java' },
];

const CodeEditor: React.FC<CodeEditorProps> = ({
  sessionId,
  language = 'python',
  onLanguageChange,
}) => {
  const [code, setCode] = useState('# Write your code here\n');
  const [isConnected, setIsConnected] = useState(false);
  const [users, setUsers] = useState<string[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState(language);
  const socketRef = useRef<Socket | null>(null);
  const editorRef = useRef<any>(null);

  useEffect(() => {
    const socket = io('http://localhost:8002', {
      transports: ['websocket'],
      reconnection: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('join', { sessionId, username: localStorage.getItem('username') || 'Anonymous' });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('code_change', (data: { code: string; userId: string }) => {
      if (data.userId !== socket.id) {
        setCode(data.code);
      }
    });

    socket.on('users_update', (data: { users: string[] }) => {
      setUsers(data.users);
    });

    socket.on('language_change', (data: { language: string }) => {
      setSelectedLanguage(data.language);
    });

    return () => {
      socket.disconnect();
    };
  }, [sessionId]);

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setCode(value);
      if (socketRef.current?.connected) {
        socketRef.current.emit('code_change', {
          sessionId,
          code: value,
          userId: socketRef.current.id,
        });
      }
    }
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLanguage = e.target.value;
    setSelectedLanguage(newLanguage);
    if (onLanguageChange) {
      onLanguageChange(newLanguage);
    }
    if (socketRef.current?.connected) {
      socketRef.current.emit('language_change', { sessionId, language: newLanguage });
    }
  };

  const handleRunCode = () => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('execute_code', {
        sessionId,
        code,
        language: selectedLanguage,
      });
    }
  };

  const handleEditorMount = (editor: any) => {
    editorRef.current = editor;
  };

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Toolbar */}
      <div className="bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-300">Language:</label>
            <select
              value={selectedLanguage}
              onChange={handleLanguageChange}
              className="bg-gray-700 text-white px-3 py-1 rounded border border-gray-600 focus:outline-none focus:border-blue-500"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>
          
          <button
            onClick={handleRunCode}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-1 rounded transition-colors"
          >
            ▶ Run Code
          </button>
        </div>

        <div className="flex items-center space-x-4">
          {/* Connection Status */}
          <div className="flex items-center space-x-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className="text-sm text-gray-300">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          {/* Active Users */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-300">Users: {users.length}</span>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1">
        <Editor
          height="100%"
          language={selectedLanguage}
          value={code}
          onChange={handleEditorChange}
          onMount={handleEditorMount}
          theme="vs-dark"
          options={{
            minimap: { enabled: true },
            fontSize: 14,
            lineNumbers: 'on',
            roundedSelection: true,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
            wordWrap: 'on',
          }}
        />
      </div>
    </div>
  );
};

export default CodeEditor;
