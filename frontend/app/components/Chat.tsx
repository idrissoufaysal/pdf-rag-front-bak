'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import MarkdownRenderer from './MarkdownRenderer';
import { BACKEND_URL } from '../utils/config';

export interface BackendSource {
  file: string;
  page?: number;
  snippet: string;
}

type ChatProps = {
  pdfText: string;
  fileId: string;
  onSourceClick?: (page?: number) => void;
};

type Message = {
  author: {
    username: string;
    id: number;
    avatarUrl: string;
  }
  text: string;
  type: string;
  timestamp: number;
}

const userAuthor = {
  username: 'User',
  id: 1,
  avatarUrl: '/user-avatar.jpg',
};

const aiAuthor = {
  username: 'Dora The Interviewer',
  id: 2,
  avatarUrl: '/oo.jpg',
};

const MAX_MESSAGES_PER_DAY = 20;

const TypingIndicator = () => (
  <div className="flex items-center space-x-1 p-2">
    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
  </div>
);

const Chat: React.FC<ChatProps> = ({ pdfText, fileId, onSourceClick }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const initialMessage = {
    author: aiAuthor,
    text: 'Salut,je m\'appelle Dora Comment puis-je t\'aider ?',
    type: 'text',
    timestamp: +new Date(),
  };
  const [chatMessages, setChatMessages] = useState<Message[]>([initialMessage]);
  const [sources, setSources] = useState<BackendSource[]>([]);
  const [error, setError] = useState<string | null>(null);
  const chatContainer = useRef<HTMLDivElement>(null);
  const aiMessageIndex = useRef<number>(-1);
  const fullResponse = useRef('');

  const scroll = () => {
    const el = chatContainer.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight });
  }

  useEffect(() => {
    scroll();
  }, [chatMessages, sources]);

  const handleOnSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLoading || !input.trim()) return;

    const message = input;
    setInput('');
    setError(null);

    const currentDate = new Date().toISOString().slice(0, 10);
    const storedDate = localStorage.getItem('lastMessageDate');
    const messageCount = parseInt(localStorage.getItem('messageCount') || '0');

    if (storedDate !== currentDate) {
      localStorage.setItem('lastMessageDate', currentDate);
      localStorage.setItem('messageCount', '0');
    } else if (messageCount >= MAX_MESSAGES_PER_DAY) {
      alert('Sorry, you have reached the maximum number of messages for today.');
      return;
    }

    const history = chatMessages.map(m => ({
      role: m.author.username === 'User' ? 'user' : 'assistant',
      content: m.text,
    }));

    setChatMessages(prev => {
      const next = [
        ...prev,
        { author: userAuthor, text: message, type: 'text', timestamp: +new Date() },
        { author: aiAuthor, text: '', type: 'text', timestamp: +new Date() },
      ];
      aiMessageIndex.current = next.length - 1;
      return next;
    });
    setSources([]);
    setIsLoading(true);
    fullResponse.current = '';

    try {
      const res = await fetch(BACKEND_URL+'/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: message, history }),
      });

      if (!res.ok) {
        let errMsg = `Erreur serveur (${res.status})`;
        try {
          const d = await res.json();
          if (d.error) errMsg = d.error;
        } catch {}
        throw new Error(errMsg);
      }

      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const frames = buffer.split('\n\n');
        buffer = frames.pop() || '';

        for (const frame of frames) {
          const dataLine = frame.split('\n').find(l => l.startsWith('data:'));
          if (!dataLine) continue;
          const payload = dataLine.slice(5).trim();
          if (!payload) continue;

          let event: any;
          try {
            event = JSON.parse(payload);
          } catch {
            continue;
          }

          if (event.type === 'token') {
            fullResponse.current += event.data;
            setChatMessages(prev => {
              const copy = [...prev];
              if (copy[aiMessageIndex.current]) {
                copy[aiMessageIndex.current] = { ...copy[aiMessageIndex.current], text: fullResponse.current };
              }
              return copy;
            });
          } else if (event.type === 'sources') {
            setSources(Array.isArray(event.data) ? event.data : []);
          } else if (event.type === 'error') {
            throw new Error(event.data || 'Erreur inconnue du backend');
          }
        }
      }
    } catch (err: any) {
      setChatMessages(prev => {
        const copy = [...prev];
        if (copy[aiMessageIndex.current]) {
          copy[aiMessageIndex.current] = {
            ...copy[aiMessageIndex.current],
            text: `Sorry, an unexpected error occurred: ${err.message}`,
          };
        }
        return copy;
      });
    } finally {
      setIsLoading(false);
      localStorage.setItem('messageCount', (messageCount + 1).toString());
    }
  }

  const renderResponse = () => {
    return (
      <div ref={chatContainer} className="response">
        {chatMessages.map((m, index) => (
          <div key={index} className={`chat-line ${m.author.username === 'User' ? 'user-chat' : 'ai-chat'}`}>
            <Image className="avatar" alt="avatar" src={m.author.avatarUrl} width={32} height={32} />
            <div style={{ width: 592, marginLeft: '16px' }}>
              <div className="message">
                {index === aiMessageIndex.current && isLoading && !m.text ? (
                  <TypingIndicator />
                ) : (
                  <MarkdownRenderer>{m.text}</MarkdownRenderer>
                )}
              </div>
              {/* {index === aiMessageIndex.current && !isLoading && sources.length > 0 && (
                <div className="sources-list" style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Sources :</div>
                  <ul style={{ paddingLeft: 16 }}>
                    {sources.map((src, i) => (
                      <li key={i}>
                        <a
                          href={`#page=${src.page ?? 1}`}
                          onClick={(e) => {
                            e.preventDefault();
                            onSourceClick?.(src.page);
                          }}
                          style={{ color: '#0070f3', textDecoration: 'underline', cursor: 'pointer' }}
                        >
                          [{i + 1}] {src.page ? `Page ${src.page}` : src.file}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )} */}
              {index < chatMessages.length - 1 && <div className="horizontal-line" />}
            </div>
          </div>
        ))}
        {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
      </div>
    );
  };

  return (
    <div className="chat">
      {renderResponse()}
      <form onSubmit={handleOnSendMessage} className="chat-form">
        <input name="input-field" type="text" placeholder={isLoading ? "Waiting for response..." : "Ask anything"}
               onChange={(e) => setInput(e.target.value)} value={input} disabled={isLoading}
               className={isLoading ? "bg-gray-100" : ""} />
        <button type="submit" className="send-button" disabled={isLoading} />
      </form>
    </div>
  );
}

export default Chat;
