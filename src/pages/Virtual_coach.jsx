import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { useTheme } from '../theme/ThemeProvider';

let rateLimitUntil = 0;
const VIRTUAL_COACH_ENDPOINT = `${API_BASE_URL}/virtual_coach/chat`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const parseRetryAfterMs = (headerValue) => {
  if (!headerValue) return null;

  const seconds = Number(headerValue);
  if (!Number.isNaN(seconds)) {
    return Math.max(0, seconds * 1000);
  }

  const dateMs = Date.parse(headerValue);
  if (Number.isNaN(dateMs)) return null;

  return Math.max(0, dateMs - Date.now());
};

const Navbar = ({ dark }) => {
  return (
    <nav className={`p-4 rounded-lg mb-8 border shadow-md ${dark ? "bg-slate-800 border-gray-700" : "bg-white border-slate-200"}`}>
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        <a href="#/" className="flex items-center gap-3 group">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-8 h-8 text-cyan-400 group-hover:scale-110 transition-transform"
          >
            <path d="M12 8V4H8" />
            <path d="M16 4h-4" />
            <path d="M12 16h2a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h2" />
            <path d="M12 16v4" />
            <path d="M8 16v4" />
            <path d="M16 16v4" />
            <path d="M10 12h.01" />
            <path d="M14 12h.01" />
          </svg>
          <span className={`text-xl font-bold transition-colors ${dark ? "text-white group-hover:text-cyan-300" : "text-slate-900 group-hover:text-cyan-700"}`}>
            Virtual Coach
          </span>
        </a>
        <div className="flex items-center gap-4">
          <a href="/home" className={dark ? "text-gray-300 hover:text-cyan-400 transition-colors" : "text-slate-600 hover:text-cyan-700 transition-colors"}>
            Home
          </a>
          <a href="/dashboard" className={dark ? "text-gray-300 hover:text-cyan-400 transition-colors" : "text-slate-600 hover:text-cyan-700 transition-colors"}>
            Dashboard
          </a>
          <a href="/profile" className={dark ? "text-gray-300 hover:text-cyan-400 transition-colors" : "text-slate-600 hover:text-cyan-700 transition-colors"}>
            Profile
          </a>
        </div>
      </div>
    </nav>
  );
};


const getChatResponse = async (history) => {
  if (Date.now() < rateLimitUntil) {
    const waitSeconds = Math.ceil((rateLimitUntil - Date.now()) / 1000);
    return `Rate limit reached. Please wait about ${waitSeconds}s and try again.`;
  }

  const payload = { history };

  let retries = 0;
  const maxRetries = 5;
  let delay = 1200;

  while (retries < maxRetries) {
    try {
      const response = await fetch(VIRTUAL_COACH_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        const reply = (result.reply || '').trim();
        if (reply) {
          return reply;
        }
        throw new Error("Invalid response structure from API");
      } else if (response.status === 429) {
        const retryAfterHeader = response.headers.get('retry-after');
        const retryAfterMs = parseRetryAfterMs(retryAfterHeader);
        const jitterMs = Math.floor(Math.random() * 300);
        const waitMs = retryAfterMs ?? delay + jitterMs;

        rateLimitUntil = Date.now() + waitMs;

        if (retries === maxRetries - 1) {
          return `Too many requests (429). Please retry in about ${Math.ceil(waitMs / 1000)}s.`;
        }

        await sleep(waitMs);
        delay = Math.min(delay * 2, 15000);
        retries++;
        continue;
      } else if (response.status === 401) {
        const errorResult = await response.json().catch(() => ({}));
        return `Error: ${errorResult.error || 'Unauthorized request. Check backend GROQ_API_KEY.'}`;
      } else if (response.status === 400) {
        const errorResult = await response.json().catch(() => ({}));
        return `Error: ${errorResult.error || 'Invalid request sent to chatbot service.'}`;
      } else if (response.status >= 500) {
        const errorResult = await response.json().catch(() => ({}));
        const serverMessage = errorResult.error || 'The AI service is temporarily unavailable. Please try again shortly.';

        if (retries === maxRetries - 1) {
          return `Error: ${serverMessage}`;
        }
        const jitterMs = Math.floor(Math.random() * 300);
        await sleep(delay + jitterMs);
        delay = Math.min(delay * 2, 15000);
        retries++;
        continue;
      } else {
        const errorResult = await response.json().catch(() => ({}));
        console.error("API Error:", errorResult);
        return `Error: ${errorResult.error || 'Failed to get response.'}`;
      }

    } catch (error) {
      if (retries === maxRetries - 1) {
        console.error("Max retries reached. Error fetching chat response:", error);
        return "Sorry, I'm having trouble connecting. Please try again later.";
      }
      const jitterMs = Math.floor(Math.random() * 300);
      await sleep(delay + jitterMs);
      delay = Math.min(delay * 2, 15000);
      retries++;
    }
  }
  
  return "Sorry, I ran into an issue and couldn't get a response.";
};

const renderInlineBold = (text, keyPrefix) => {
  const parts = [];
  let lastIndex = 0;
  const boldRegex = /\*\*(.*?)\*\*/g;
  let match;
  let segment = 0;

  while ((match = boldRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <span key={`${keyPrefix}-t-${segment++}`}>
          {text.slice(lastIndex, match.index)}
        </span>
      );
    }

    parts.push(
      <strong key={`${keyPrefix}-b-${segment++}`} className="font-semibold">
        {match[1]}
      </strong>
    );

    lastIndex = boldRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(
      <span key={`${keyPrefix}-t-${segment++}`}>
        {text.slice(lastIndex)}
      </span>
    );
  }

  return parts.length ? parts : text;
};

const formatBotMessage = (text) => {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];
  let listItems = [];
  let listType = null;

  const flushList = (baseKey) => {
    if (!listItems.length) return;

    if (listType === 'ol') {
      elements.push(
        <ol key={`${baseKey}-ol`} className="list-decimal list-inside ml-4 my-2 space-y-1">
          {listItems.map((item, idx) => (
            <li key={`${baseKey}-oli-${idx}`}>{renderInlineBold(item, `${baseKey}-oli-${idx}`)}</li>
          ))}
        </ol>
      );
    } else {
      elements.push(
        <ul key={`${baseKey}-ul`} className="list-disc list-inside ml-4 my-2 space-y-1">
          {listItems.map((item, idx) => (
            <li key={`${baseKey}-uli-${idx}`}>{renderInlineBold(item, `${baseKey}-uli-${idx}`)}</li>
          ))}
        </ul>
      );
    }

    listItems = [];
    listType = null;
  };

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();

    if (!line) {
      flushList(`line-${index}`);
      return;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      flushList(`line-${index}`);
      const level = headingMatch[1].length;
      const content = renderInlineBold(headingMatch[2], `h-${index}`);

      if (level === 1) {
        elements.push(<h1 key={`h1-${index}`} className="text-2xl font-bold">{content}</h1>);
      } else if (level === 2) {
        elements.push(<h2 key={`h2-${index}`} className="text-xl font-semibold">{content}</h2>);
      } else {
        elements.push(<h3 key={`h3-${index}`} className="text-lg font-semibold">{content}</h3>);
      }
      return;
    }

    const bulletMatch = line.match(/^[-*]\s+(.*)$/);
    if (bulletMatch) {
      if (listType && listType !== 'ul') flushList(`line-${index}`);
      listType = 'ul';
      listItems.push(bulletMatch[1]);
      return;
    }

    const numberedMatch = line.match(/^\d+\.\s+(.*)$/);
    if (numberedMatch) {
      if (listType && listType !== 'ol') flushList(`line-${index}`);
      listType = 'ol';
      listItems.push(numberedMatch[1]);
      return;
    }

    flushList(`line-${index}`);
    elements.push(
      <p key={`p-${index}`} className="mb-2">
        {renderInlineBold(line, `p-${index}`)}
      </p>
    );
  });

  flushList('final');
  return elements;
};

const CHAT_SESSIONS_STORAGE_KEY = 'virtualCoachChatSessions';
const ACTIVE_CHAT_STORAGE_KEY = 'virtualCoachActiveChatId';

const buildChatTitle = (messages, context) => {
  const firstUserMessage = messages.find((message) => message.sender === 'user' && !message.hidden);
  if (firstUserMessage?.text) {
    return firstUserMessage.text.slice(0, 36);
  }
  if (context?.summary) {
    return context.summary.slice(0, 36);
  }
  if (Array.isArray(context?.issues) && context.issues.length > 0) {
    return `Posture help: ${context.issues[0]}`;
  }
  return 'New chat';
};

const createChatSession = (context = null) => {
  const now = new Date().toISOString();
  const messages = buildInitialMessages(context);
  return {
    id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: buildChatTitle(messages, context),
    messages,
    postureContext: context,
    createdAt: now,
    updatedAt: now,
  };
};

const loadStoredChatSessions = () => {
  try {
    const raw = localStorage.getItem(CHAT_SESSIONS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveStoredChatSessions = (sessions) => {
  try {
    localStorage.setItem(CHAT_SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
  } catch {}
};

const buildPostureContextText = (context) => {
  if (!context) return '';

  const lines = ['Posture analysis context for this conversation:'];

  if (typeof context.score === 'number') {
    lines.push(`- Posture score: ${context.score}%`);
  }
  if (context.uploadType) {
    lines.push(`- Upload type: ${context.uploadType}`);
  }
  if (context.summary) {
    lines.push(`- Summary: ${context.summary}`);
  }
  if (Array.isArray(context.issues) && context.issues.length > 0) {
    lines.push(`- Areas needing correction: ${context.issues.join(', ')}`);
  }
  if (Array.isArray(context.aligned) && context.aligned.length > 0) {
    lines.push(`- Areas already aligned: ${context.aligned.join(', ')}`);
  }
  if (Array.isArray(context.feedback) && context.feedback.length > 0) {
    lines.push('- Detailed feedback:');
    context.feedback.slice(0, 6).forEach((item, index) => {
      lines.push(`  ${index + 1}. ${item.joint}: ${item.tip}`);
    });
  }
  if (Array.isArray(context.steps) && context.steps.length > 0) {
    lines.push('- Improvement steps:');
    context.steps.slice(0, 6).forEach((step, index) => {
      const area = step.joint ? ` (${step.joint})` : '';
      lines.push(`  ${index + 1}. ${step.title}${area}: ${step.detail}`);
    });
  }

  return lines.join('\n');
};

const buildInitialMessages = (context) => {
  if (!context) {
    return [
      { sender: 'bot', text: 'Welcome! I am your Health & Fitness AI Coach. Ask me about diet plans, exercises, or food calories!' }
    ];
  }

  const issuesLine =
    Array.isArray(context.issues) && context.issues.length > 0
      ? context.issues.join(', ')
      : 'No major issue areas were listed.';
  const topSteps =
    Array.isArray(context.steps) && context.steps.length > 0
      ? context.steps
          .slice(0, 3)
          .map((step, index) => `${index + 1}. ${step.detail}`)
          .join('\n')
      : 'Ask me how to improve your posture based on this scan.';

  return [
    {
      sender: 'bot',
      text: `I have your posture analysis ready. Your latest posture score is ${context.score ?? 'N/A'}%.`
    },
    {
      sender: 'bot',
      text:
        `Here is the posture context I can use for this chat:\n` +
        `- Areas needing correction: ${issuesLine}\n` +
        `${context.summary ? `- Summary: ${context.summary}\n` : ''}` +
        `- Best next questions to ask me:\n${topSteps}`
    }
  ];
};


export default function FitnessChatbot() {
  const { theme } = useTheme();
  const dark = theme === "dark";
  const location = useLocation();
  const [postureContext, setPostureContext] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [chatSessions, setChatSessions] = useState(() => {
    const storedSessions = loadStoredChatSessions();
    if (storedSessions.length > 0) {
      return storedSessions;
    }
    return [createChatSession(null)];
  });
  const [activeChatId, setActiveChatId] = useState(() => {
    try {
      const stored = localStorage.getItem(ACTIVE_CHAT_STORAGE_KEY);
      return stored || null;
    } catch {
      return null;
    }
  });
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef(null);

  const activeChat =
    chatSessions.find((session) => session.id === activeChatId) || chatSessions[0] || null;
  const chatHistory = activeChat?.messages || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  useEffect(() => {
    if (!activeChatId && chatSessions[0]?.id) {
      setActiveChatId(chatSessions[0].id);
    }
  }, [activeChatId, chatSessions]);

  useEffect(() => {
    saveStoredChatSessions(chatSessions);
  }, [chatSessions]);

  useEffect(() => {
    if (!activeChatId) return;
    try {
      localStorage.setItem(ACTIVE_CHAT_STORAGE_KEY, activeChatId);
    } catch {}
  }, [activeChatId]);

  useEffect(() => {
    if (activeChat?.postureContext) {
      setPostureContext(activeChat.postureContext);
    } else {
      setPostureContext(null);
    }
  }, [activeChat]);

  useEffect(() => {
    const routeContext = location.state?.postureContext;
    if (!routeContext) return;

    const analysisChat = createChatSession(routeContext);
    setChatSessions((prev) => [analysisChat, ...prev]);
    setActiveChatId(analysisChat.id);
    setUserInput('');
  }, [location.state]);

  const updateActiveChat = (updater) => {
    if (!activeChat) return;
    setChatSessions((prev) =>
      prev.map((session) => {
        if (session.id !== activeChat.id) return session;
        const nextMessages =
          typeof updater === 'function' ? updater(session.messages) : updater;
        return {
          ...session,
          messages: nextMessages,
          title: buildChatTitle(nextMessages, session.postureContext),
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  const handleStartNewChat = () => {
    const newSession = createChatSession(null);
    setChatSessions((prev) => [newSession, ...prev]);
    setActiveChatId(newSession.id);
    setUserInput('');
  };

  const handleOpenChat = (chatId) => {
    setActiveChatId(chatId);
    setUserInput('');
    setIsSidebarOpen(false);
  };

  const handleDeleteChat = (chatId) => {
    setChatSessions((prev) => {
      const remaining = prev.filter((session) => session.id !== chatId);

      if (!remaining.length) {
        const fallbackChat = createChatSession(null);
        setActiveChatId(fallbackChat.id);
        return [fallbackChat];
      }

      if (chatId === activeChatId) {
        setActiveChatId(remaining[0].id);
      }

      return remaining;
    });
    setUserInput('');
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  /**
   * Handles sending a new message.
   * @param {React.FormEvent<HTMLFormElement>} e - The form submission event.
   */
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading) return;

    const userMessage = userInput.trim();

    const contextMessage = postureContext
      ? [{ sender: 'user', text: buildPostureContextText(postureContext), hidden: true }]
      : [];

    const newHistory = [...chatHistory, { sender: 'user', text: userMessage }];
    updateActiveChat(newHistory);
    setUserInput('');
    setIsLoading(true);

    try {
      const botResponse = await getChatResponse([...contextMessage, ...newHistory]);

      updateActiveChat((prev) => [...prev, { sender: 'bot', text: botResponse }]);

    } catch (error) {
      console.error("Chatbot API Error:", error);
      updateActiveChat((prev) => [...prev, { sender: 'bot', text: 'Sorry, I ran into an error. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Renders an individual chat message bubble.
   * @param {{ message: { sender: string, text: string } }} props - The message object.
   */
  const MessageBubble = ({ message }) => {
    const isBot = message.sender === 'bot';

    return (
      <div className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} mb-3`}>
        <div className={`max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-xl shadow-md ${
          message.sender === 'user'
            ? 'bg-indigo-500 text-white rounded-br-none' 
            : 'bg-gray-200 text-gray-800 rounded-tl-none' 
        }`}>
          {isBot ? (
            <div className="text-sm leading-6 space-y-1">{formatBotMessage(message.text)}</div>
          ) : (
            message.text
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`min-h-screen p-4 md:p-8 font-sans ${dark ? "bg-slate-900 text-gray-200" : "bg-slate-100 text-slate-800"}`}>
      <Navbar dark={dark} />

      <div className={`max-w-6xl mx-auto h-[78vh] overflow-hidden rounded-xl shadow-2xl ${dark ? "border border-gray-700 bg-slate-800" : "border border-slate-200 bg-white"}`}>
        <div className="relative flex h-full">
          {isSidebarOpen && (
            <button
              type="button"
              aria-label="Close sidebar overlay"
              className="absolute inset-0 z-20 bg-black/50"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}

          <aside
            className={`absolute inset-y-0 left-0 z-30 w-80 max-w-[85vw] p-4 transition-transform duration-300 ${
              dark ? "border-r border-gray-700 bg-slate-900/95" : "border-r border-slate-200 bg-white/95"
            } ${
              isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <div className="flex h-full flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className={`text-xl font-semibold ${dark ? "text-white" : "text-slate-900"}`}>Health & Fitness AI Coach</h3>
                  <p className={`mt-1 text-sm ${dark ? "text-gray-400" : "text-slate-500"}`}>
                    Saved chats and fresh conversations live here.
                  </p>
                  {postureContext ? (
                    <p className="mt-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-300">
                      Posture analysis loaded for this chat
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(false)}
                  className={dark ? "rounded-lg border border-slate-700 p-2 text-gray-300 transition hover:bg-slate-800" : "rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100"}
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleStartNewChat}
                className="rounded-lg bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
              >
                New Chat
              </button>

              <div className="min-h-0 flex-1">
                <div className={`mb-3 text-sm font-semibold ${dark ? "text-gray-200" : "text-slate-700"}`}>Chat History</div>
                <div className="flex max-h-full flex-col gap-3 overflow-y-auto pr-1">
                  {chatSessions.map((session) => (
                    <div
                      key={session.id}
                      className={`rounded-xl border px-4 py-3 text-left transition ${
                        session.id === activeChat?.id
                          ? dark ? 'border-cyan-400 bg-cyan-500/10 text-white' : 'border-cyan-500 bg-cyan-50 text-slate-900'
                          : dark ? 'border-gray-700 bg-slate-800 text-gray-300 hover:border-cyan-500/50' : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-cyan-400'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => handleOpenChat(session.id)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <div className="truncate text-sm font-semibold">
                            {session.title}
                          </div>
                          <div className={`mt-1 text-xs ${dark ? "text-gray-400" : "text-slate-500"}`}>
                            {new Date(session.updatedAt).toLocaleString()}
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteChat(session.id)}
                          className="rounded-md px-2 py-1 text-xs font-semibold text-red-300 transition hover:bg-red-500/10 hover:text-red-200"
                          aria-label={`Delete chat ${session.title}`}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          <section className="flex min-h-0 flex-1 flex-col">
            <div className={dark ? "border-b border-gray-700 bg-slate-800/80 px-5 py-4" : "border-b border-slate-200 bg-slate-50 px-5 py-4"}>
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(true)}
                  className={dark ? "rounded-lg border border-slate-700 p-2 text-gray-200 transition hover:bg-slate-700" : "rounded-lg border border-slate-200 p-2 text-slate-700 transition hover:bg-slate-100"}
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5" />
                </button>
                <div>
                  <h4 className={`text-lg font-semibold ${dark ? "text-white" : "text-slate-900"}`}>
                    {activeChat?.title || "New chat"}
                  </h4>
                  <p className={`mt-1 text-sm ${dark ? "text-gray-400" : "text-slate-500"}`}>
                    Ask follow-up questions, training tips, or recovery guidance.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {chatHistory.map((message, index) => (
                <MessageBubble key={index} message={message} />
              ))}

              {isLoading ? (
                <div className="mb-3 flex justify-start">
                  <div className={dark ? "flex max-w-xs items-center space-x-2 rounded-xl rounded-tl-none bg-gray-700 p-3 text-gray-300" : "flex max-w-xs items-center space-x-2 rounded-xl rounded-tl-none bg-slate-200 p-3 text-slate-600"}>
                    <div className="h-2.5 w-2.5 animate-bounce rounded-full bg-indigo-500 delay-100"></div>
                    <div className="h-2.5 w-2.5 animate-bounce rounded-full bg-indigo-500 delay-200"></div>
                    <div className="h-2.5 w-2.5 animate-bounce rounded-full bg-indigo-500 delay-300"></div>
                  </div>
                </div>
              ) : null}

              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className={dark ? "border-t border-gray-700 bg-slate-800 p-4" : "border-t border-slate-200 bg-white p-4"}>
              <div className="mx-auto flex w-full space-x-2">
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Ask about exercises, diet plans, or food..."
                  className={dark ? "flex-1 rounded-lg border border-gray-600 bg-slate-700 p-3 text-white placeholder-gray-400 transition duration-150 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500" : "flex-1 rounded-lg border border-slate-300 bg-slate-50 p-3 text-slate-900 placeholder-slate-400 transition duration-150 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"}
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  className={`rounded-lg p-3 font-semibold text-white transition-colors duration-200 ${
                    userInput.trim() && !isLoading
                      ? 'bg-indigo-500 hover:bg-indigo-600'
                      : 'cursor-not-allowed bg-gray-500'
                  }`}
                  disabled={!userInput.trim() || isLoading}
                  aria-label="Send Message"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
