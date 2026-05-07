import React, { useState, useEffect, useRef, useCallback } from "react";
import "./styles.scss";
import ChatbotIcon from "images/chatbot.png";
import { getRequest, postRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL } from "Includes/urls";
import { getAcademicYear } from "Includes/functions";
import BrilliantAssistantMessage from "Components/Chat/BrilliantAssistantMessage";
import {
  useChatbotAcademicYearPanel,
  ChatbotAcademicYearBar,
} from "Components/Chat/ChatbotAcademicYearControls";

const SendIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
  </svg>
);

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [responseStyle, setResponseStyle] = useState("direct");
  const [chatWide, setChatWide] = useState(true);
  const [loading, setLoading] = useState(false);
  const {
    options: academicYearOptions,
    yearId: chatAcademicYear,
    setYearId: setChatAcademicYear,
    effectiveYear: chatEffectiveAcademicYear,
    loading: academicYearLoading,
  } = useChatbotAcademicYearPanel(isOpen);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const [position, setPosition] = useState({
    x: window.innerWidth - 72,
    y: window.innerHeight - 128,
  });
  const [dragging, setDragging] = useState(false);
  const [rel, setRel] = useState(null);
  const [dragStartPos, setDragStartPos] = useState(null);
  const justDraggedRef = useRef(false);

  const layoutMetrics = useCallback(() => {
    const winW = window.innerWidth;
    const winH = window.innerHeight;
    const margin = 20;
    const maxW = winW - margin * 2;
    let chatWidth;
    if (chatWide) {
      // ~50% of viewport, clamped so the panel stays usable on small screens.
      chatWidth = Math.round(winW * 0.5);
      const minW = winW < 480 ? Math.min(280, maxW) : Math.min(360, maxW);
      chatWidth = Math.min(Math.max(chatWidth, minW), maxW);
    } else {
      chatWidth = Math.min(380, maxW);
    }
    const chatHeight = Math.min(Math.floor(winH * 0.9), 680);
    return { chatWidth, chatHeight, winW, winH };
  }, [chatWide]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading, suggestions]);

  useEffect(() => {
    if (isOpen) {
      fetchSuggestions();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!loading && isOpen && inputRef.current) {
      const t = setTimeout(() => {
        if (inputRef.current && !inputRef.current.disabled) {
          inputRef.current.focus();
        }
      }, 80);
      return () => clearTimeout(t);
    }
  }, [loading, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  const fetchSuggestions = () => {
    const url = GET_URL.chatbotsuggestions.api;
    return getRequest(url, {}, {})
      .then((response) => {
        if (response && response.status === 200) {
          const data = response.data || {};
          const list = data.suggestions || data.data?.suggestions || [];
          setSuggestions(Array.isArray(list) ? list : []);
        } else {
          setSuggestions([]);
        }
      })
      .catch(() => {
        setSuggestions([]);
      });
  };

  const onMouseDown = (e) => {
    if (e.target.classList.contains("close-icon") || isOpen) {
      return;
    }
    if (e.button !== 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const startX = e.pageX;
    const startY = e.pageY;

    setDragStartPos({ x: startX, y: startY });
    setDragging(true);
    setRel({
      x: e.pageX - rect.left,
      y: e.pageY - rect.top,
    });
    e.stopPropagation();
    e.preventDefault();
  };

  const onMouseMove = (e) => {
    if (!dragging || !rel) return;

    if (dragStartPos) {
      const moveDistance = Math.sqrt(
        Math.pow(e.pageX - dragStartPos.x, 2) + Math.pow(e.pageY - dragStartPos.y, 2)
      );
      if (moveDistance < 5) {
        return;
      }
    }

    let newX = e.pageX - rel.x;
    let newY = e.pageY - rel.y;

    const maxX = window.innerWidth - 48;
    const maxY = window.innerHeight - 48;
    if (newX < 0) newX = 0;
    else if (newX > maxX) newX = maxX;
    if (newY < 0) newY = 0;
    else if (newY > maxY) newY = maxY;

    setPosition({ x: newX, y: newY });
    e.stopPropagation();
    e.preventDefault();
  };

  const onMouseUp = (e) => {
    if (dragging) {
      const wasDrag =
        dragStartPos &&
        (Math.abs(e.pageX - dragStartPos.x) > 5 || Math.abs(e.pageY - dragStartPos.y) > 5);

      if (wasDrag) {
        justDraggedRef.current = true;
        setTimeout(() => {
          justDraggedRef.current = false;
        }, 200);
        e.stopPropagation();
        e.preventDefault();
      }

      setDragging(false);
      setDragStartPos(null);
      setRel(null);
    }
  };

  useEffect(() => {
    if (dragging) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    } else {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [dragging, rel, dragStartPos]);

  const toggleChat = () => {
    if (justDraggedRef.current) {
      return;
    }
    setIsOpen(!isOpen);
    if (!isOpen) {
      setMessages([]);
      setInputValue("");
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setInputValue("");
    setChatAcademicYear(getAcademicYear() || "");
    fetchSuggestions();
  };

  const sendMessage = async (message, options = {}) => {
    if (!message.trim()) return;

    setMessages((prev) => [...prev, { text: message, sender: "user" }]);
    setInputValue("");
    setLoading(true);

    try {
      const url = POST_URL.chatbot.api;
      const year = chatEffectiveAcademicYear || getAcademicYear();
      const postData = {
        query: message,
        message: message,
        ...(year ? { academic_year: year } : {}),
        ...(options.examId ? { exam_id: options.examId } : {}),
        response_style: options.responseStyle || responseStyle,
      };

      const response = await postRequest(url, postData, { return_error: true });

      if (response && response.status === 200) {
        const data = response.data || {};
        const botResponse =
          data.response ||
          data.message ||
          data.data?.response ||
          data.data?.message ||
          "I received your message, but I'm still learning. Please try again later.";
        const structured = data.structured || data.data?.structured || null;
        const resumeQuery =
          structured?.followup_context?.original_query != null
            ? structured.followup_context.original_query
            : message;

        setMessages((prev) => [
          ...prev,
          {
            text: botResponse,
            sender: "bot",
            structured,
            resumeQuery: structured ? resumeQuery : undefined,
          },
        ]);
      } else if (response && response.data) {
        const err = response.data.detail || response.data.error || response.data.message;
        const msg =
          typeof err === "string"
            ? err
            : Array.isArray(err)
            ? err.join(" ")
            : err
            ? JSON.stringify(err)
            : "The assistant could not complete that request.";
        setMessages((prev) => [...prev, { text: msg, sender: "error" }]);
      } else {
        throw new Error("Invalid response");
      }
    } catch (error) {
      console.error("Chatbot error:", error);
      setMessages((prev) => [
        ...prev,
        {
          text: "Sorry, I'm having trouble connecting right now. Check your network or sign in again, then retry.",
          sender: "error",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputKeyDown = (e) => {
    if (e.key !== "Enter" || loading) return;
    if (e.shiftKey) return;
    e.preventDefault();
    sendMessage(inputValue);
  };

  const handleSuggestionClick = (suggestion) => {
    if (!loading) {
      sendMessage(suggestion);
    }
  };

  const getChatboxPosition = () => {
    const { chatWidth, chatHeight, winW, winH } = layoutMetrics();
    const buttonHeight = 48;
    const margin = 16;

    let top;
    if (position.y - chatHeight > margin) {
      top = position.y - chatHeight - 12;
    } else if (position.y + buttonHeight + chatHeight + 12 < winH) {
      top = position.y + buttonHeight + 12;
    } else {
      top = winH - chatHeight - margin;
      if (top < margin) top = margin;
    }

    let left = position.x;
    if (left + chatWidth > winW - margin) left = winW - margin - chatWidth;
    if (left < margin) left = margin;

    return { top, left, chatWidth, chatHeight };
  };

  const chatboxPos = getChatboxPosition();

  return (
    <>
      <button
        type="button"
        className="chatbot-button"
        onClick={toggleChat}
        onMouseDown={onMouseDown}
        style={{
          left: position.x,
          top: position.y,
          position: "fixed",
          cursor: dragging ? "grabbing" : "grab",
        }}
        aria-label={isOpen ? "Close assistant" : "Open assistant"}
        aria-expanded={isOpen}
      >
        <img
          src={ChatbotIcon}
          width="28"
          height="28"
          alt=""
          draggable="false"
          style={{ pointerEvents: "none" }}
        />
        {isOpen && <span className="close-icon" aria-hidden="true">×</span>}
      </button>

      {isOpen && (
        <div
          className="chatbot-container"
          style={{
            left: chatboxPos.left,
            top: chatboxPos.top,
            position: "fixed",
            width: chatboxPos.chatWidth,
            height: chatboxPos.chatHeight,
          }}
          role="dialog"
          aria-label="AI assistant"
        >
          <div className="chat-header">
            <div className="chat-header-brand">
              <span className="chat-header-title">Assistant</span>
              <span className="chat-header-sub">Ask about exams, attendance, students, and more</span>
            </div>
            <div className="chat-header-actions">
              <button
                type="button"
                className="chat-header-secondary"
                onClick={() => setChatWide((w) => !w)}
                aria-pressed={chatWide}
                title={chatWide ? "Use a smaller chat width" : "Expand chat to about half the screen"}
              >
                {chatWide ? "Compact" : "Wide (~50%)"}
              </button>
              {messages.length > 0 && (
                <button type="button" className="chat-header-secondary" onClick={startNewChat}>
                  New chat
                </button>
              )}
              <button
                type="button"
                className="close-chat-button"
                onClick={toggleChat}
                aria-label="Close assistant"
              >
                ×
              </button>
            </div>
          </div>

          <ChatbotAcademicYearBar
            options={academicYearOptions}
            value={chatAcademicYear}
            onChange={setChatAcademicYear}
            loading={academicYearLoading}
            disabled={loading}
          />

          <div className="chat-messages">
            {suggestions.length > 0 && messages.length === 0 && (
              <div className="suggestions-box">
                <div className="suggestions-label">Try asking</div>
                {suggestions.map((q, i) => (
                  <button
                    key={i}
                    type="button"
                    className="suggested-question"
                    onClick={() => handleSuggestionClick(q)}
                    disabled={loading}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {messages.length === 0 && !loading && (
              <div className="chat-welcome">
                <div className="chat-welcome-icon" aria-hidden="true" />
                <div className="chat-welcome-title">How can I help?</div>
                <p className="chat-welcome-text">
                  I answer questions about this academic system. Pick a suggestion above or type your own question below.
                </p>
              </div>
            )}

            {messages.map((msg, idx) => {
                if (msg.sender === "user") {
                  return (
                    <div
                      key={idx}
                      className="user-message"
                      dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, "<br>") }}
                    />
                  );
                }
                if (msg.sender === "error") {
                  return (
                    <div
                      key={idx}
                      className="error-message"
                      dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, "<br>") }}
                    />
                  );
                }
                return (
                  <div key={idx} className="bot-message">
                    <BrilliantAssistantMessage
                      text={msg.text}
                      structured={msg.structured}
                      resumeQuery={msg.resumeQuery}
                      disabled={loading}
                      onSelectExam={({ examId, resumeQuery }) => {
                        sendMessage(resumeQuery || "", { examId });
                      }}
                    />
                  </div>
                );
              })}

            {loading && (
              <div className="chat-typing" role="status" aria-live="polite">
                <span className="chat-typing-label">Assistant is replying</span>
                <span className="chat-typing-dots" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-response-mode" role="group" aria-label="How answers are shown">
            <span className="chat-response-mode-label">Reply as</span>
            <button
              type="button"
              className={`chat-response-mode-btn${responseStyle === "direct" ? " is-active" : ""}`}
              onClick={() => setResponseStyle("direct")}
              disabled={loading}
            >
              Direct answer
            </button>
            <button
              type="button"
              className={`chat-response-mode-btn${responseStyle === "steps" ? " is-active" : ""}`}
              onClick={() => setResponseStyle("steps")}
              disabled={loading}
            >
              With steps
            </button>
          </div>

          <div className="chat-input">
            <textarea
              ref={inputRef}
              className="chat-textarea"
              rows={1}
              placeholder={loading ? "Please wait…" : "Message… (Enter to send, Shift+Enter for new line)"}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleInputKeyDown}
              disabled={loading}
            />
            <button
              type="button"
              className="chat-send-button"
              onClick={() => {
                if (!loading && inputValue.trim()) {
                  sendMessage(inputValue);
                }
              }}
              disabled={loading || !inputValue.trim()}
              aria-label="Send message"
            >
              <SendIcon />
            </button>
          </div>
          <p className="chat-input-hint">Enter sends · Shift+Enter new line · Esc closes</p>
        </div>
      )}
    </>
  );
};

export default Chatbot;
