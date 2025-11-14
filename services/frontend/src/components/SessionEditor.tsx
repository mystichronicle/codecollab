import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { sessionsAPI, Session } from '../services/api';

interface Participant {
  id: string;
  username: string;
  color: string;
  cursor?: { line: number; column: number };
}

const languageMap: Record<string, string> = {
  plaintext: 'plaintext',
  text: 'plaintext',
  python: 'python',
  javascript: 'javascript',
  typescript: 'typescript',
  go: 'go',
  rust: 'rust',
  vlang: 'v',
  zig: 'zig',
  elixir: 'elixir',
  java: 'java',
  cpp: 'cpp',
  c: 'c',
};

const languageColors: Record<string, string> = {
  plaintext: 'from-gray-500 to-gray-600',
  text: 'from-gray-500 to-gray-600',
  python: 'from-blue-500 to-blue-600',
  javascript: 'from-yellow-500 to-yellow-600',
  typescript: 'from-blue-400 to-blue-500',
  go: 'from-cyan-500 to-cyan-600',
  rust: 'from-orange-500 to-orange-600',
  vlang: 'from-purple-500 to-purple-600',
  zig: 'from-amber-500 to-amber-600',
  elixir: 'from-purple-400 to-purple-500',
  cpp: 'from-blue-600 to-blue-700',
  c: 'from-gray-600 to-gray-700',
  java: 'from-red-500 to-red-600',
};

export const SessionEditor: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  
  const [session, setSession] = useState<Session | null>(null);
  const [code, setCode] = useState('');
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('plaintext');
  
  const socketRef = useRef<WebSocket | null>(null);
  const editorRef = useRef<any>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cursorDecorationsRef = useRef<Map<string, string[]>>(new Map());
  const codeRef = useRef<string>('');
  const languageRef = useRef<string>('plaintext');
  const sessionIdRef = useRef<string | undefined>(sessionId);
  const hasLoadedRef = useRef<boolean>(false); // Track if session has been loaded

  // Keep refs in sync with state
  useEffect(() => {
    codeRef.current = code;
    // Once we have code, mark as loaded
    if (code && code.length > 0) {
      hasLoadedRef.current = true;
    }
  }, [code]);

  useEffect(() => {
    languageRef.current = currentLanguage;
    // If language is not plaintext, we've loaded real data
    if (currentLanguage !== 'plaintext') {
      hasLoadedRef.current = true;
    }
  }, [currentLanguage]);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  // Cleanup on unmount - save any pending changes
  useEffect(() => {
    const saveOnUnmount = () => {
      const currentSessionId = sessionIdRef.current;
      const currentCode = codeRef.current;
      const currentLang = languageRef.current;
      
      if (!currentSessionId) {
        return;
      }
      
      const isInitialState = !currentCode && currentLang === 'plaintext';
      if (isInitialState && !hasLoadedRef.current) {
        return;
      }
      
      const token = localStorage.getItem('access_token');
      const url = `http://localhost:8000/api/v1/sessions/${currentSessionId}`;
      const data = JSON.stringify({ 
        code: currentCode || '', 
        language: currentLang 
      });
      
      fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: data,
        keepalive: true,
      }).catch(err => {
        console.error('Failed to save on unmount:', err);
      });
    };
    
    window.addEventListener('beforeunload', saveOnUnmount);
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      window.removeEventListener('beforeunload', saveOnUnmount);
      saveOnUnmount();
    };
  }, []);

  useEffect(() => {
    if (sessionId) {
      loadSession();
    }
  }, [sessionId]);

  useEffect(() => {
    if (session && sessionId) {
      if (socketRef.current && socketRef.current.readyState !== WebSocket.CLOSED) {
        socketRef.current.close();
      }
      connectWebSocket();
    }
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [session?.id, sessionId]);

  // Update cursor decorations when participants change
  useEffect(() => {
    if (!editorRef.current) return;
    
    const editor = editorRef.current;
    const decorations: any[] = [];
    
    participants.forEach((participant) => {
      if (participant.cursor && participant.id !== 'self') {
        // Create a cursor decoration with user's name and color
        decorations.push({
          range: {
            startLineNumber: participant.cursor.line,
            startColumn: participant.cursor.column,
            endLineNumber: participant.cursor.line,
            endColumn: participant.cursor.column,
          },
          options: {
            className: `remote-cursor`,
            glyphMarginClassName: 'remote-cursor-glyph',
            hoverMessage: { value: `${participant.username} is here` },
            stickiness: 1,
            zIndex: 1000,
          },
        });
      }
    });
    
    // Apply decorations
    const oldDecorations = Array.from(cursorDecorationsRef.current.values()).flat();
    const newDecorationIds = editor.deltaDecorations(oldDecorations, decorations);
    
    // Update decoration refs
    cursorDecorationsRef.current.clear();
    newDecorationIds.forEach((decorationId: string, index: number) => {
      const participant = participants.filter(p => p.cursor && p.id !== 'self')[index];
      if (participant) {
        cursorDecorationsRef.current.set(participant.id, [decorationId]);
      }
    });
  }, [participants]);

  const loadSession = async () => {
    try {
      const data = await sessionsAPI.get(sessionId!);
      
      setSession(data);
      
      // Set code - make sure it's not undefined
      const loadedCode = data.code || '';
      setCode(loadedCode);
      
      // Set language
      const loadedLanguage = data.language || 'plaintext';
      setCurrentLanguage(loadedLanguage);
      
      // If editor is already mounted, set the value directly
      if (editorRef.current && loadedCode) {
        editorRef.current.setValue(loadedCode);
      }
      
      // Mark that we've successfully loaded the session
      hasLoadedRef.current = true;
      
      setLoading(false);
    } catch (err: any) {
      console.error('Failed to load session:', err);
      setError(err.response?.data?.detail || 'Failed to load session');
      setLoading(false);
    }
  };

  const connectWebSocket = () => {
    if (socketRef.current) {
      const state = socketRef.current.readyState;
      if (state === WebSocket.OPEN || state === WebSocket.CONNECTING) {
        return;
      }
    }
    
    const token = localStorage.getItem('access_token');
    const wsUrl = `ws://localhost:8002/ws/${sessionId}`;
    
    let username = 'Anonymous';
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        username = payload.sub || payload.username || 'User';
      } catch (e) {
        console.error('Failed to decode token:', e);
      }
    }
    
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      socket.send(JSON.stringify({
        type: 'join-session',
        sessionId: sessionId,
        token: token,
        username: username,
      }));
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case 'code-update':
            if (message.userId !== 'self') {
              setCode(message.code);
            }
            break;
          case 'participants-update':
            setParticipants(message.participants);
            break;
          case 'cursor-update':
            setParticipants(prev =>
              prev.map(p => (p.id === message.userId ? { ...p, cursor: message.cursor } : p))
            );
            break;
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    socket.onclose = (event) => {
      if (event.code !== 1000) {
        console.error('WebSocket closed unexpectedly:', event.code, event.reason);
      }
    };

    socketRef.current = socket;
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setCode(value);
      
      // Emit code change to other participants
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: 'code-change',
          sessionId: sessionId,
          code: value,
        }));
      }

      // Auto-save after 1 second of no typing
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        saveCode(value, currentLanguage);
      }, 1000);
    }
  };

  const saveCode = async (codeToSave: string, languageToSave?: string) => {
    if (!sessionId) return;
    
    setIsSaving(true);
    try {
      const updateData: any = { code: codeToSave };
      if (languageToSave !== undefined) {
        updateData.language = languageToSave;
      }
      await sessionsAPI.update(sessionId, updateData);
    } catch (err) {
      console.error('Failed to save code:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLanguageChange = async (newLanguage: string) => {
    setCurrentLanguage(newLanguage);
    if (sessionId) {
      try {
        await sessionsAPI.update(sessionId, { language: newLanguage });
      } catch (err) {
        console.error('Failed to update language:', err);
      }
    }
  };

  const handleRunCode = async () => {
    if (!session) return;
    
    setIsRunning(true);
    setShowOutput(true);
    setOutput('Running code...\n');

    try {
      const response = await fetch('http://localhost:8004/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          language: currentLanguage,
          code: code,
          timeout: 10,
        }),
      });

      const result = await response.json();
      
      if (result.exit_code === 0) {
        // Success - show stdout, and stderr only if present (as warnings)
        let output = '';
        if (result.stdout) {
          output += `Output:\n${result.stdout}`;
        }
        if (result.stderr) {
          output += output ? '\n\n' : '';
          output += `Warnings:\n${result.stderr}`;
        }
        output += `\n\nExecution time: ${result.execution_time.toFixed(2)}ms`;
        setOutput(output || 'No output');
      } else {
        // Error - show error message
        setOutput(`Error:\n${result.stderr || result.stdout || 'Unknown error'}\n\nExit code: ${result.exit_code}\nExecution time: ${result.execution_time.toFixed(2)}ms`);
      }
    } catch (err: any) {
      console.error('Execution error:', err);
      setOutput(`Error: ${err.message || 'Failed to execute code'}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleEditorMount = (editor: any) => {
    editorRef.current = editor;
    
    // If code is already loaded (from session data), set it in the editor
    if (code) {
      editor.setValue(code);
    }
    
    // Listen for cursor position changes
    editor.onDidChangeCursorPosition((e: any) => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: 'cursor-move',
          sessionId: sessionId,
          cursor: {
            line: e.position.lineNumber,
            column: e.position.column,
          },
        }));
      }
    });
  };

  const handleLeaveSession = () => {
    if (confirm('Are you sure you want to leave this session?')) {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      navigate('/dashboard');
    }
  };

  const handleExport = async () => {
    if (!session || !sessionId) return;
    
    try {
      const blob = await sessionsAPI.export(sessionId);
      
      // Determine file extension
      const extensions: Record<string, string> = {
        python: 'py',
        javascript: 'js',
        typescript: 'ts',
        go: 'go',
        rust: 'rs',
        cpp: 'cpp',
        c: 'c',
        java: 'java',
        vlang: 'v',
        zig: 'zig',
        elixir: 'ex'
      };
      
      const ext = extensions[session.language] || 'txt';
      const filename = `${session.name.replace(/\s+/g, '_')}.${ext}`;
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setOutput(`Code exported successfully as ${filename}`);
      setShowOutput(true);
    } catch (error) {
      console.error('Failed to export session:', error);
      setOutput('Failed to export code. Please try again.');
      setShowOutput(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-400 text-lg">Loading session...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-white mb-2">Session Not Found</h2>
          <p className="text-gray-400 mb-6">{error || 'The session you are looking for does not exist.'}</p>
          <button
            onClick={() => {
              // Clean up WebSocket before navigating
              if (socketRef.current) {
                socketRef.current.close();
                socketRef.current = null;
              }
              navigate('/dashboard');
            }}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800/50 backdrop-blur-xl border-b border-gray-700/50">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleLeaveSession}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${languageColors[currentLanguage] || 'from-gray-600 to-gray-700'} flex items-center justify-center`}>
                <span className="text-2xl">
                  {currentLanguage === 'plaintext' || currentLanguage === 'text' ? '📄' :
                   currentLanguage === 'python' ? '🐍' : 
                   currentLanguage === 'javascript' ? '📜' :
                   currentLanguage === 'typescript' ? '🔷' :
                   currentLanguage === 'go' ? '🐹' :
                   currentLanguage === 'rust' ? '🦀' :
                   currentLanguage === 'vlang' ? '⚡' :
                   currentLanguage === 'zig' ? '⚡' :
                   currentLanguage === 'elixir' ? '💧' :
                   currentLanguage === 'cpp' ? '⚙️' :
                   currentLanguage === 'c' ? '🔧' :
                   currentLanguage === 'java' ? '☕' : '📝'}
                </span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">{session.name}</h1>
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  <select
                    value={currentLanguage}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                    className="text-sm font-medium text-white bg-gray-800/80 backdrop-blur px-4 py-1.5 rounded-lg border border-gray-600/50 hover:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all cursor-pointer shadow-lg"
                  >
                    <option value="plaintext">📄 Plain Text</option>
                    <optgroup label="Popular Languages">
                      <option value="python">🐍 Python</option>
                      <option value="javascript">📜 JavaScript</option>
                      <option value="typescript">🔷 TypeScript</option>
                      <option value="java">☕ Java</option>
                    </optgroup>
                    <optgroup label="Systems Programming">
                      <option value="c">🔧 C</option>
                      <option value="cpp">⚙️ C++</option>
                      <option value="rust">🦀 Rust</option>
                      <option value="go">🐹 Go</option>
                    </optgroup>
                    <optgroup label="Modern Languages">
                      <option value="vlang">⚡ V Lang</option>
                      <option value="zig">⚡ Zig</option>
                      <option value="elixir">💧 Elixir</option>
                    </optgroup>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Share Code */}
            <div className="bg-gray-700/50 px-4 py-2 rounded-lg border border-gray-600/50">
              <div className="flex items-center space-x-2">
                <span className="text-gray-400 text-sm">Share Code:</span>
                <code className="text-green-400 font-mono text-lg font-bold tracking-wider">
                  {session.share_code || 'N/A'}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(session.share_code || '');
                    alert('Share code copied to clipboard!');
                  }}
                  className="text-gray-400 hover:text-white transition-colors p-1"
                  title="Copy share code"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Participants */}
            <div className="flex items-center space-x-3">
              {/* Online participants (WebSocket) */}
              <div className="flex items-center space-x-2">
                <div className="flex -space-x-2">
                  {participants.slice(0, 5).map((participant) => (
                    <div
                      key={participant.id}
                      className="w-8 h-8 rounded-full border-2 border-gray-800 flex items-center justify-center text-white text-sm font-bold"
                      style={{ backgroundColor: participant.color }}
                      title={`${participant.username} (online)`}
                    >
                      {participant.username.charAt(0).toUpperCase()}
                    </div>
                  ))}
                  {participants.length > 5 && (
                    <div className="w-8 h-8 rounded-full border-2 border-gray-800 bg-gray-700 flex items-center justify-center text-white text-xs font-bold">
                      +{participants.length - 5}
                    </div>
                  )}
                </div>
                <div className="text-sm">
                  <div className="flex items-center text-green-400">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-1.5 animate-pulse"></div>
                    <span className="font-semibold">{participants.length} online</span>
                  </div>
                  {session && session.participants && (
                    <div className="text-gray-500 text-xs">
                      {session.participants.length} total member{session.participants.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Save Status */}
            {isSaving && (
              <div className="flex items-center space-x-2 text-blue-400">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-blue-400"></div>
                <span className="text-sm">Saving...</span>
              </div>
            )}

            {/* Export Button */}
            <button
              onClick={handleExport}
              className="px-4 py-2 rounded-lg font-semibold transition-all flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30"
              title="Download code"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Export</span>
            </button>

            {/* Run Button - Hidden for plain text */}
            {currentLanguage !== 'plaintext' && currentLanguage !== 'text' && (
              <button
                onClick={handleRunCode}
                disabled={isRunning}
                className={`px-6 py-2 rounded-lg font-semibold transition-all flex items-center space-x-2 ${
                  isRunning
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/30'
                }`}
              >
                {isRunning ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div>
                    <span>Running</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                    </svg>
                    <span>Run</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Editor and Output */}
      <div className="flex-1 flex overflow-hidden">
        {/* Code Editor */}
        <div className={`${showOutput ? 'w-2/3' : 'w-full'} transition-all duration-300`}>
          <Editor
            key={sessionId} // Force remount when session changes
            height="100%"
            language={languageMap[currentLanguage] || currentLanguage}
            value={code}
            onChange={handleEditorChange}
            onMount={handleEditorMount}
            theme="vs-dark"
            options={{
              fontSize: 14,
              minimap: { enabled: true },
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              automaticLayout: true,
              tabSize: 2,
              insertSpaces: true,
              formatOnPaste: true,
              formatOnType: true,
            }}
          />
        </div>

        {/* Output Panel */}
        {showOutput && (
          <div className="w-1/3 border-l border-gray-700 bg-gray-900 flex flex-col">
            <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-semibold text-white">Output</span>
                {isRunning && (
                  <div className="flex items-center space-x-2 text-blue-400">
                    <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-blue-400"></div>
                    <span className="text-xs">Running...</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowOutput(false)}
                className="text-gray-400 hover:text-white transition-colors p-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap">
                {output || 'Click "Run Code" to see output here'}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
