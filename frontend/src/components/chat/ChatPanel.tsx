/**
 * ChatPanel — slide-out Claude AI crisis analyst panel.
 *
 * Features: streaming response, mode toggle, replay loader,
 * starter prompts, markdown rendering, responsive.
 */
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, X, Zap, Loader2 } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { useRiskStore } from '../../store/useRiskStore';

export type ChatRole = 'user' | 'assistant' | 'system';
export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY || ''; // Provide a fallback if needed
const genAI = new GoogleGenerativeAI(geminiApiKey);

async function fetchGeminiResponse(prompt: string, pastMessages: ChatMessage[]) {
  if (!geminiApiKey) {
    return "Gemini API Key is missing. Please set VITE_GEMINI_API_KEY in your environment.";
  }
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const history = pastMessages.filter(m => m.role !== 'system').map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));
    
    const chat = model.startChat({ history });
    const result = await chat.sendMessage(prompt);
    return result.response.text();
  } catch (err: any) {
    console.error("Gemini Error:", err);
    return "I am currently unable to connect to our predictive models. Please try again later.";
  }
}

const STARTER_PROMPTS = [
  "Why is banking risk elevated right now?",
  "What if the Fed raises rates by 200bps?",
  "Walk me through the 2008 crisis buildup",
  "What should I monitor if liquidity risk spikes?",
];

function formatMarkdown(text: string): string {
  // Simple markdown → HTML conversion for chat
  let html = text
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Tables
    .replace(/\|(.+)\|/g, (match) => {
      if (match.includes('---')) return '';
      const cells = match.split('|').filter(Boolean).map(c => c.trim());
      return `<div class="chat-table-row">${cells.map(c => `<span class="chat-table-cell">${c}</span>`).join('')}</div>`;
    })
    // Headers
    .replace(/^### (.+)$/gm, '<div class="chat-h3">$1</div>')
    .replace(/^## (.+)$/gm, '<div class="chat-h2">$1</div>')
    .replace(/^# (.+)$/gm, '<div class="chat-h1">$1</div>')
    // Bullet points
    .replace(/^- (.+)$/gm, '<div class="chat-bullet">• $1</div>')
    .replace(/^\d+\. (.+)$/gm, '<div class="chat-bullet">$&</div>')
    // Line breaks
    .replace(/\n\n/g, '<div class="chat-gap"></div>')
    .replace(/\n/g, '<br/>');

  return html;
}

export default function ChatPanel() {
  const isChatOpen = useRiskStore((s) => s.isChatOpen);
  const setChatOpen = useRiskStore((s) => s.setChatOpen);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isChatOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isChatOpen]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsStreaming(true);

    const reply = await fetchGeminiResponse(trimmed, messages);
    
    setMessages(prev => [
      ...prev,
      {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: reply,
        timestamp: new Date()
      }
    ]);
    
    setIsStreaming(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleStarter = (prompt: string) => {
    setInput(prompt);
    // Let the user click send, or we could auto-send. Auto-send is nice:
    setTimeout(() => {
       const userMsg: ChatMessage = { id: `user-${Date.now()}`, role: 'user', content: prompt, timestamp: new Date() };
       setMessages(prev => [...prev, userMsg]);
       setIsStreaming(true);
       fetchGeminiResponse(prompt, messages).then((reply) => {
          setMessages(prev => [
            ...prev,
            { id: `asst-${Date.now()}`, role: 'assistant', content: reply, timestamp: new Date() }
          ]);
          setIsStreaming(false);
       });
    }, 100);
  };

  return (
    <>
      {/* Toggle button */}
      <button
        className="chat-toggle-btn"
        onClick={() => setChatOpen(!isChatOpen)}
        aria-label="Toggle AI Analyst"
      >
        {isChatOpen ? <X size={20} /> : <MessageSquare size={20} />}
      </button>

      {/* Panel */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            className="chat-panel"
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            {/* Header */}
            <div className="chat-header">
              <div className="chat-header-title">
                <Zap size={16} style={{ color: 'var(--accent)' }} />
                <span>CrisisLens AI Analyst</span>
                <span className={`chat-status-dot on`} />
              </div>
              <div className="chat-header-controls">
                <button className="chat-close-btn" onClick={() => setChatOpen(false)}>
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="chat-messages">
              {messages.length === 0 ? (
                <div className="chat-empty">
                  <div className="chat-empty-icon">🧠</div>
                  <div className="chat-empty-title">CrisisLens AI Analyst</div>
                  <div className="chat-empty-sub">
                    Ask about current risks, simulate scenarios, or replay historical crises.
                  </div>
                  <div className="chat-starters">
                    {STARTER_PROMPTS.map((prompt, i) => (
                      <button
                        key={i}
                        className="chat-starter-btn"
                        onClick={() => handleStarter(prompt)}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg) => (
                  <ChatBubble key={msg.id} message={msg} />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="chat-input-area">
              <textarea
                ref={inputRef}
                className="chat-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about risks, simulate scenarios..."
                rows={1}
                disabled={isStreaming}
              />
              <button
                className="chat-send-btn"
                onClick={handleSend}
                disabled={!input.trim() || isStreaming}
              >
                {isStreaming ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <div className="chat-system-msg">
        {message.content}
      </div>
    );
  }

  return (
    <div className={`chat-bubble ${isUser ? 'user' : 'agent'}`}>
      {!isUser && <div className="chat-bubble-label">CrisisLens AI</div>}
      <div
        className="chat-bubble-content"
        dangerouslySetInnerHTML={{
          __html: isUser ? message.content : formatMarkdown(message.content),
        }}
      />
      {message.isStreaming && (
        <span className="chat-cursor">▊</span>
      )}
      <div className="chat-bubble-time">
        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  );
}
