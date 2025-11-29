import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { sessionsAPI, Session } from '../services/api';
import SessionChat from './SessionChat';
import CodeTemplates from './CodeTemplates';
import { validateCode, ValidationResult } from '../utils/syntaxValidator';
import { LanguageIcon, languageConfig } from './LanguageIcons';

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
  plaintext: 'from-green-700 to-green-800',
  text: 'from-green-700 to-green-800',
  python: 'from-green-500 to-green-600',
  javascript: 'from-green-400 to-green-500',
  typescript: 'from-cyan-500 to-cyan-600',
  go: 'from-green-500 to-cyan-600',
  rust: 'from-green-600 to-green-700',
  vlang: 'from-cyan-500 to-green-500',
  zig: 'from-green-500 to-green-600',
  elixir: 'from-cyan-400 to-cyan-500',
  cpp: 'from-green-600 to-green-700',
  c: 'from-green-700 to-green-800',
  java: 'from-green-500 to-green-600',
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
  const [showTemplates, setShowTemplates] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showValidationModal, setShowValidationModal] = useState(false);
  
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

  // Close language dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const dropdown = document.getElementById('session-language-dropdown-container');
      if (dropdown && !dropdown.contains(e.target as Node)) {
        setShowLanguageDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    
    // Validate code before execution
    const validation = validateCode(code, currentLanguage);
    
    // If there are errors, show validation modal and don't execute
    if (!validation.isValid || validation.errors.length > 0) {
      setValidationResult(validation);
      setShowValidationModal(true);
      return;
    }
    
    // If there are only warnings, show them but allow execution
    if (validation.warnings.length > 0) {
      setValidationResult(validation);
      setShowValidationModal(true);
      return;
    }
    
    // No errors or warnings, proceed with execution
    executeCode();
  };

  const executeCode = async () => {
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
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-green-500 mx-auto shadow-neon"></div>
          <p className="mt-4 text-green-500 text-lg font-mono neon-glow">LOADING_SESSION_</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center border-2 border-red-500 p-8 bg-black">
          <div className="text-red-500 text-6xl mb-4 font-mono">[ ! ]</div>
          <h2 className="text-2xl font-bold text-red-500 mb-2 font-mono">SESSION_NOT_FOUND_</h2>
          <p className="text-green-600 mb-6 font-mono">{error || '// the session you are looking for does not exist.'}</p>
          <button
            onClick={() => {
              // Clean up WebSocket before navigating
              if (socketRef.current) {
                socketRef.current.close();
                socketRef.current = null;
              }
              navigate('/dashboard');
            }}
            className="px-6 py-3 bg-green-500 hover:bg-green-400 text-black font-mono font-bold transition-colors shadow-neon"
          >
            [ RETURN_TO_DASHBOARD ]
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-black">
      {/* Header */}
      <header className="bg-black/90 backdrop-blur-xl border-b-2 border-green-500/50 relative z-50">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleLeaveSession}
              className="text-green-500 hover:text-green-400 transition-colors p-2 border border-transparent hover:border-green-500"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 bg-gradient-to-br ${languageColors[currentLanguage] || 'from-green-600 to-green-700'} flex items-center justify-center border border-green-400/30`}>
                <span className={`${languageConfig[currentLanguage]?.color || 'text-green-400'}`}>
                  <LanguageIcon language={currentLanguage} className="w-6 h-6" />
                </span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-green-400 font-mono neon-glow">{session.name}</h1>
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  <div className="relative" id="session-language-dropdown-container">
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowLanguageDropdown(!showLanguageDropdown); }}
                      className="text-sm font-mono font-medium text-green-400 bg-black px-4 py-1.5 border border-green-500/50 hover:border-green-400 focus:outline-none transition-all cursor-pointer flex items-center gap-2"
                    >
                      <LanguageIcon language={currentLanguage} className={`w-4 h-4 ${languageConfig[currentLanguage]?.color || 'text-green-400'}`} />
                      <span>{currentLanguage === 'plaintext' ? 'Plain Text' : currentLanguage.charAt(0).toUpperCase() + currentLanguage.slice(1)}</span>
                      <svg className={`w-4 h-4 transition-transform ${showLanguageDropdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                      </svg>
                    </button>
                    {showLanguageDropdown && (
                      <div className="absolute top-full left-0 mt-1 bg-black border border-green-500 shadow-lg shadow-green-500/20 min-w-[220px] max-h-80 overflow-y-auto z-[9999]">
                        <div className="py-1">
                          {['plaintext', 'python', 'javascript', 'typescript', 'java', 'c', 'cpp', 'rust', 'go', 'vlang', 'zig', 'elixir'].map((lang) => (
                            <button
                              key={lang}
                              onClick={() => { handleLanguageChange(lang); setShowLanguageDropdown(false); }}
                              className={`w-full px-4 py-2 text-left flex items-center gap-2 font-mono text-sm hover:bg-green-500/20 transition-colors ${currentLanguage === lang ? 'bg-green-500/20 text-green-400' : 'text-green-500'}`}
                            >
                              <LanguageIcon language={lang} className={`w-4 h-4 ${languageConfig[lang]?.color || 'text-green-400'}`} />
                              <span>{lang === 'plaintext' ? 'Plain Text' : lang === 'cpp' ? 'C++' : lang === 'vlang' ? 'V Lang' : lang.charAt(0).toUpperCase() + lang.slice(1)}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Share Code */}
            <div className="bg-black px-4 py-2 border border-green-500/50">
              <div className="flex items-center space-x-2">
                <span className="text-green-600 text-sm font-mono">SHARE_CODE:</span>
                <code className="text-green-400 font-mono text-lg font-bold tracking-wider neon-glow">
                  {session.share_code || 'N/A'}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(session.share_code || '');
                    alert('Share code copied to clipboard!');
                  }}
                  className="text-green-500 hover:text-green-400 transition-colors p-1 border border-transparent hover:border-green-500"
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
                      className="w-8 h-8 border-2 border-purple-500 flex items-center justify-center text-black text-sm font-bold font-mono"
                      style={{ backgroundColor: participant.color }}
                      title={`${participant.username} (online)`}
                    >
                      {participant.username.charAt(0).toUpperCase()}
                    </div>
                  ))}
                  {participants.length > 5 && (
                    <div className="w-8 h-8 border-2 border-purple-500 bg-black flex items-center justify-center text-purple-400 text-xs font-bold font-mono">
                      +{participants.length - 5}
                    </div>
                  )}
                </div>
                <div className="text-sm">
                  <div className="flex items-center text-purple-400 font-mono">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mr-1.5 animate-pulse shadow-[0_0_5px_rgba(168,85,247,0.5)]"></div>
                    <span className="font-semibold">{participants.length} online</span>
                  </div>
                  {session && session.participants && (
                    <div className="text-purple-700 text-xs font-mono">
                      {session.participants.length} total member{session.participants.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Save Status */}
            {isSaving && (
              <div className="flex items-center space-x-2 text-amber-400 font-mono">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-amber-400"></div>
                <span className="text-sm">SAVING...</span>
              </div>
            )}

            {/* Templates Button */}
            <button
              onClick={() => setShowTemplates(true)}
              className="px-4 py-2 font-mono font-semibold transition-all flex items-center space-x-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/50 hover:border-cyan-400 hover:shadow-[0_0_10px_rgba(34,211,238,0.3)]"
              title="Browse code templates"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
              <span className="hidden sm:inline">Templates</span>
            </button>

            {/* Export Button */}
            <button
              onClick={handleExport}
              className="px-4 py-2 font-mono font-semibold transition-all flex items-center space-x-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/50 hover:border-amber-400 hover:shadow-[0_0_10px_rgba(251,191,36,0.3)]"
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
                className={`px-6 py-2 font-mono font-semibold transition-all flex items-center space-x-2 ${
                  isRunning
                    ? 'bg-black text-green-700 cursor-not-allowed border border-green-700'
                    : 'bg-green-500 hover:bg-green-400 text-black shadow-neon'
                }`}
              >
                {isRunning ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-green-400"></div>
                    <span>RUNNING...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                    </svg>
                    <span>[ RUN ]</span>
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
          <div className="w-1/3 border-l-2 border-green-500/50 bg-black flex flex-col">
            <div className="bg-black border-b border-green-500/30 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-semibold text-green-400 font-mono">OUTPUT_</span>
                {isRunning && (
                  <div className="flex items-center space-x-2 text-green-400">
                    <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-green-400"></div>
                    <span className="text-xs font-mono">RUNNING...</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowOutput(false)}
                className="text-green-500 hover:text-red-500 transition-colors p-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-black">
              <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap">
                {output || '// click "RUN" to see output here'}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Session Chat */}
      {session && socketRef.current && participants.length > 0 && (
        <SessionChat
          sessionId={sessionId!}
          currentUser={{
            id: participants[0].id,
            username: participants[0].username
          }}
          ws={socketRef.current}
        />
      )}

      {/* Code Templates */}
      {showTemplates && (
        <CodeTemplates
          onSelectTemplate={(templateCode, language) => {
            setCode(templateCode);
            setCurrentLanguage(language);
            setShowTemplates(false);
          }}
        />
      )}

      {/* Validation Modal */}
      {showValidationModal && validationResult && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-black border-2 border-green-500 max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
            <div className="px-6 py-4 border-b border-green-500/30 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {validationResult.errors.length > 0 ? (
                  <>
                    <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="text-lg font-semibold text-red-500 font-mono">SYNTAX_ERRORS_DETECTED_</h3>
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <h3 className="text-lg font-semibold text-yellow-500 font-mono">WARNINGS_</h3>
                  </>
                )}
              </div>
              <button
                onClick={() => {
                  setShowValidationModal(false);
                  setValidationResult(null);
                }}
                className="text-green-500 hover:text-red-500 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-auto px-6 py-4">
              {validationResult.errors.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-red-400 mb-2 font-mono">// errors:</h4>
                  <ul className="space-y-2">
                    {validationResult.errors.map((error, idx) => (
                      <li key={idx} className="text-sm text-red-400 bg-red-500/10 px-3 py-2 border border-red-500/50 font-mono">
                        {error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {validationResult.warnings.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-yellow-400 mb-2 font-mono">// warnings:</h4>
                  <ul className="space-y-2">
                    {validationResult.warnings.map((warning, idx) => (
                      <li key={idx} className="text-sm text-yellow-400 bg-yellow-500/10 px-3 py-2 border border-yellow-500/50 font-mono">
                        {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 border-t border-green-500/30 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowValidationModal(false);
                  setValidationResult(null);
                }}
                className="px-4 py-2 bg-black hover:bg-green-500/10 text-green-400 border border-green-500/50 hover:border-green-400 transition-colors font-mono"
              >
                [ CANCEL ]
              </button>
              {validationResult.errors.length === 0 && (
                <button
                  onClick={() => {
                    setShowValidationModal(false);
                    setValidationResult(null);
                    executeCode();
                  }}
                  className="px-4 py-2 bg-green-500 hover:bg-green-400 text-black transition-colors font-mono font-bold shadow-neon"
                >
                  [ RUN_ANYWAY ]
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
