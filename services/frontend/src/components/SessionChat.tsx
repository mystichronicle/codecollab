import React, { useState, useEffect, useRef } from 'react';

interface Message {
  id: string;
  userId: string;
  username: string;
  content: string;
  timestamp: Date;
}

interface SessionChatProps {
  sessionId: string;
  currentUser: { id: string; username: string };
  ws: WebSocket | null;
}

const SessionChat: React.FC<SessionChatProps> = ({ sessionId, currentUser, ws }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!ws) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'chat_message') {
          const message: Message = {
            id: data.message_id || `${Date.now()}-${Math.random()}`,
            userId: data.user_id,
            username: data.username,
            content: data.content,
            timestamp: new Date(data.timestamp || Date.now()),
          };
          
          setMessages((prev) => [...prev, message]);
        }
      } catch (error) {
        console.error('Error parsing chat message:', error);
      }
    };

    ws.addEventListener('message', handleMessage);

    return () => {
      ws.removeEventListener('message', handleMessage);
    };
  }, [ws]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !ws) return;

    const chatMessage = {
      type: 'chat_message',
      session_id: sessionId,
      user_id: currentUser.id,
      username: currentUser.username,
      content: newMessage.trim(),
      timestamp: new Date().toISOString(),
    };

    ws.send(JSON.stringify(chatMessage));
    setNewMessage('');
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="fixed bottom-6 right-6 p-4 bg-purple-500 hover:bg-purple-400 text-black shadow-[0_0_15px_rgba(168,85,247,0.5)] hover:shadow-[0_0_25px_rgba(168,85,247,0.7)] transition-all hover:scale-110 z-50 font-mono"
        title="Open Chat"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        {messages.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-cyan-500 text-black text-xs flex items-center justify-center animate-pulse font-bold">
            {messages.length > 9 ? '9+' : messages.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-black/95 backdrop-blur-xl border-2 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)] flex flex-col z-50 animate-fadeIn font-mono">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-purple-500/30 bg-black">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-500/20 border border-purple-500/50">
            <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div>
            <h3 className="text-purple-400 font-semibold">SESSION_CHAT_</h3>
            <p className="text-xs text-purple-600">{messages.length} messages</p>
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(false)}
          className="p-2 hover:bg-purple-500/20 border border-transparent hover:border-purple-500 transition-colors text-purple-500 hover:text-purple-400"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-black">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-purple-600">
            <svg className="w-16 h-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-sm font-semibold">// no messages yet</p>
            <p className="text-xs">// start a conversation with your team</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.userId === currentUser.id ? 'justify-end' : 'justify-start'} animate-fadeIn`}
            >
              <div
                className={`max-w-[75%] px-4 py-2 border ${
                  message.userId === currentUser.id
                    ? 'bg-green-500/20 border-green-500 text-green-400'
                    : 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400'
                }`}
              >
                {message.userId !== currentUser.id && (
                  <p className="text-xs font-semibold text-cyan-400 mb-1">{message.username}:</p>
                )}
                <p className="text-sm break-words">{message.content}</p>
                <p className={`text-xs mt-1 ${message.userId === currentUser.id ? 'text-green-600' : 'text-cyan-600'}`}>
                  {formatTime(message.timestamp)}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-purple-500/30 bg-black">
        <div className="flex items-end space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="// type a message..."
            className="flex-1 px-4 py-2 bg-black border border-purple-500/50 text-purple-400 placeholder-purple-700 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-400 transition-all"
            maxLength={500}
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim()}
            className="p-2 bg-purple-500 hover:bg-purple-400 text-black disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 disabled:hover:scale-100"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-purple-700 mt-2">// press Enter to send • Shift+Enter for new line</p>
      </div>
    </div>
  );
};

export default SessionChat;
