import { useEffect, useRef, useState } from "react";
import Message from "./components/Message";
import PromptForm from "./components/PromptForm";
import Sidebar from "./components/Sidebar";
import { Menu } from "lucide-react";

const App = () => {
  const [isLoading, setIsLoading] = useState(false);
  const typingInterval = useRef(null);
  const messagesContainerRef = useRef(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth > 768);
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) return savedTheme;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  const [conversations, setConversations] = useState(() => {
    try {
      const saved = localStorage.getItem("conversations");
      return saved ? JSON.parse(saved) : [{ id: "default", title: "New Chat", messages: [] }];
    } catch {
      return [{ id: "default", title: "New Chat", messages: [] }];
    }
  });

  const [activeConversation, setActiveConversation] = useState(() => {
    return localStorage.getItem("activeConversation") || "default";
  });

  useEffect(() => {
    localStorage.setItem("activeConversation", activeConversation);
  }, [activeConversation]);

  useEffect(() => {
    localStorage.setItem("conversations", JSON.stringify(conversations));
  }, [conversations]);

  useEffect(() => {
    localStorage.setItem("theme", theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const currentConversation = conversations.find((c) => c.id === activeConversation) || conversations[0];

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversations, activeConversation]);

  const typingEffect = (text, messageId) => {
    let textElement = document.querySelector(`#${messageId} .text`);
    if (!textElement) return;

    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === activeConversation
          ? {
              ...conv,
              messages: conv.messages.map((msg) => (msg.id === messageId ? { ...msg, content: "", loading: true } : msg)),
            }
          : conv
      )
    );

    textElement.textContent = "";
    const words = text.split(" ");
    let wordIndex = 0;
    let currentText = "";
    clearInterval(typingInterval.current);
    typingInterval.current = setInterval(() => {
      if (wordIndex < words.length) {
        currentText += (wordIndex === 0 ? "" : " ") + words[wordIndex++];
        textElement.textContent = currentText;
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === activeConversation
              ? {
                  ...conv,
                  messages: conv.messages.map((msg) => (msg.id === messageId ? { ...msg, content: currentText, loading: true } : msg)),
                }
              : conv
          )
        );
        scrollToBottom();
      } else {
        clearInterval(typingInterval.current);
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === activeConversation
              ? {
                  ...conv,
                  messages: conv.messages.map((msg) => (msg.id === messageId ? { ...msg, content: currentText, loading: false } : msg)),
                }
              : conv
          )
        );
        setIsLoading(false);
      }
    }, 40);
  };

  const generateResponse = async (conversation, botMessageId) => {
    const formattedMessages = [
      {
        role: "system",
        content: `
  You are "Shastra Chatbot", a conversational AI trained to make India's rich philosophical heritage accessible and relevant to modern users, especially youth. 
Your behavior must follow these strict principles:
Always use simple, warm, clear, and encouraging language, avoiding jargon. Never sound robotic. Always show empathy.

Always give actionable, practical advice from Indian philosophical scriptures tailored specifically to the user's question. Start by warmly addressing the user ("Dear User" or similar).


   Always **quote specific scriptural references** (mention book, chapter, verse if available).
   Base advice ONLY on Indian scriptures like Bhagavad Gita, Upanishads, Vedas, Puranas, Ayurveda, Yoga texts etc.
   Never invent fake scriptures. If uncertain, politely say you need more information.
Do not give them validation if they don't deserve it.
You may criticize the user or belittle their problems, if they are the ones at fault. Don't be fake, be like a guru who holds a mirror to the person.

IMPORTANT: If the user uploads a file (like an image), you may politely say you cannot process images unless you are instructed otherwise.

IMPORTANT: Never answer in a purely philosophical manner. Focus on practical, simple, and usable advice with clear steps based on ancient wisdom.
    `
      },
      ...conversation.messages.map((msg) => ({
        role: msg.role, // "user" or "assistant"
        content: msg.content
      }))
    ];

    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer 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`, // ← 🔑 hardcoded key here
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: formattedMessages,
          temperature: 0.7,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error.message);

      const responseText = data.choices[0].message.content.trim();
      typingEffect(responseText, botMessageId);
    } catch (error) {
      setIsLoading(false);
      updateBotMessage(botMessageId, error.message, true);
    }
  };

  return (
    <div className={`app-container ${theme === "light" ? "light-theme" : "dark-theme"}`}>
      <div className={`overlay ${isSidebarOpen ? "show" : "hide"}`} onClick={() => setIsSidebarOpen(false)}></div>
      <Sidebar
        conversations={conversations}
        setConversations={setConversations}
        activeConversation={activeConversation}
        setActiveConversation={setActiveConversation}
        theme={theme}
        setTheme={setTheme}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />
      <main className="main-container">
        <header className="main-header">
          <button onClick={() => setIsSidebarOpen(true)} className="sidebar-toggle">
            <Menu size={18} />
          </button>
        </header>
        {currentConversation.messages.length === 0 ? (
          <div className="welcome-container">
            <img className="welcome-logo" src="chatgpt-logo.svg" alt="ChatGPT Logo" />
            <h1 className="welcome-heading">Message ShastraBot</h1>
            <p className="welcome-text">Ask me anything about any topic on Indian Texts. I'm here to help!</p>
          </div>
        ) : (
          <div className="messages-container" ref={messagesContainerRef}>
            {currentConversation.messages.map((message) => (
              <Message key={message.id} message={message} />
            ))}
          </div>
        )}
        <div className="prompt-container">
          <div className="prompt-wrapper">
            <PromptForm
              conversations={conversations}
              setConversations={setConversations}
              activeConversation={activeConversation}
              generateResponse={generateResponse}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
            />
          </div>
          <p className="disclaimer-text">ShastraBot may produce incorrect information. Always verify important facts.</p>
        </div>
      </main>
    </div>
  );
};

export default App;
