/* eslint-disable no-prototype-builtins */
import React, { Component, useState, useEffect, useRef } from "react";
import { withRouter } from "react-router-dom";
import {
  Drawer,
  AppBar,
  Tooltip,
  MenuItem,
  Box,
  withStyles,
  Avatar,
  List,
  Menu,
  CssBaseline,
  Typography,
  IconButton,
  ListItem,
  ListItemText,
  Toolbar,
  Hidden,
  Grow,
  Paper,
  Popper,
  MenuList,
  Button,
  TextField,
  Tabs,
  Tab,
  Badge,
  CircularProgress,
} from "@material-ui/core";
import SearchIcon from "@material-ui/icons/Search";
import ArrowBackIosIcon from "@material-ui/icons/ArrowBackIos";
import AccountCircle from "@material-ui/icons/AccountCircle";
import CloudDownload from "@material-ui/icons/CloudDownload";
import ArrowForwardIosIcon from "@material-ui/icons/ArrowForwardIos";
import ClickAwayListener from "@material-ui/core/ClickAwayListener";
import { ExpandMore, ExpandLess } from "@material-ui/icons";
import MenuIcon from "@material-ui/icons/Menu";
import ChatIcon from "@material-ui/icons/Chat";
import CloseIcon from "@material-ui/icons/Close";
import SendIcon from "@material-ui/icons/Send";

// Custom Robot/Chatbot Icon Component
import { Helmet } from "react-helmet";
import classNames from "classnames";
import PropTypes from "prop-types";
import { getProfileTab, isMobile } from "Includes/functions";

import { getTreeStucturedPermissionHavingMenus } from "Containers/GroupsPermissions/functions";
import {
  getLocalStorageDetails,
  isUserHasPermission,
  logout,
  getSettingValue,
  getAcademicYear,
} from "Includes/functions";
import ForgotPassword from "Components/Loginpage/ForgotPassword";
import { Actions, screenTypes } from "Constants/permissions";
import {
  menuImgType,
  ADMIN_IDS,
  SUPER_ADMIN_ID,
  HIDE_BOARD,
  HIDE_BRANCH,
} from "Constants";
import blankProfile from "images/blank_profile_pic.png";
import eb from "images/eb.png";
import brainova from "images/brainova_new.jpg";
import { AWS_BUCKET_URL } from "Constants";

import LocaleToggle from "Components/LanguageProvider/LocaleToggle";
import "./../Dashboard.scss";
import { DropDownWithSearch } from "Components/DropDownWithSearch";
import DropDownWithSearchApi from "Components/DropDownWithSearchApi";
import { DownloadList } from "./Components/DownloadList";
import Chatbot from "Containers/Chat/Chatbot";
import BrilliantAssistantMessage from "Components/Chat/BrilliantAssistantMessage";
import {
  useChatbotAcademicYearPanel,
  ChatbotAcademicYearBar,
} from "Components/Chat/ChatbotAcademicYearControls";
import { GET_URL, POST_URL, PUT_URL } from "Includes/urls";
import { getRequest, postRequest, putRequest } from "Includes/api/apicall";

const RobotIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width="24"
    height="24"
    fill="currentColor"
  >
    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
    <circle cx="9" cy="10" r="1.5"/>
    <circle cx="15" cy="10" r="1.5"/>
    <path d="M12 14c-1.5 0-2.5.5-2.5 1.5h5c0-1-.9-1.5-2.5-1.5z"/>
  </svg>
);
// Notifications content for drawer
const NotificationDrawerContent = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const listContainerRef = useRef(null);

  const fetchNotifications = (pageNo = 1, append = false) => {
    if (append && (loadingMore || !hasMore)) {
      return;
    }

    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    // The endpoint is 'notification/notification/' based on the router registration
    const url = 'notification/notification/';
    const params = {
      limit: 50,
      pageno: pageNo
    };
    if (showUnreadOnly) {
      params.unread_only = 1;
    }
    
    getRequest(url, params, {}).then((response) => {
      if (response && response.status === 200) {
        // Response structure: { data: { count, next, previous, data_list: [...] } }
        const responseData = response.data?.data || response.data || {};
        const data = responseData.data_list || [];
        const total = responseData.count || data.length;
        const nextPage = responseData.next;
        const mergedData = append ? [...notifications, ...data] : data;
        const unread = mergedData.filter(n => !n.is_read_by_user).length;
        
        // Filter to show only notifications for logged-in user (backend should handle this, but double-check)
        // The backend filters by user=self.request.user.id, so all notifications should be for current user
        setNotifications(mergedData);
        setUnreadCount(unread);
        setTotalCount(total);
        setCurrentPage(pageNo);
        setHasMore(Boolean(nextPage));
        
        // Update parent component's unread count
        if (window.updateNotificationCount) {
          window.updateNotificationCount(unread);
        }
      }
      setLoading(false);
      setLoadingMore(false);
    }).catch((error) => {
      console.error("Error fetching notifications:", error);
      setLoading(false);
      setLoadingMore(false);
    });
  };

  useEffect(() => {
    fetchNotifications(1, false);
    // Set up interval to check for new notifications every 30 seconds
    const interval = setInterval(() => fetchNotifications(1, false), 30000);
    
    // Request notification permission and set up push notifications
    requestNotificationPermission();
    setupPushNotifications();

    // Register refresh hook so parent can request a fresh notification list
    window.refreshNotifications = () => fetchNotifications(1, false);
    
    return () => {
      clearInterval(interval);
      if (window.refreshNotifications) {
        delete window.refreshNotifications;
      }
    };
  }, [showUnreadOnly]);


  const requestNotificationPermission = async () => {
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
  };

  const setupPushNotifications = () => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        // Listen for push notifications
        registration.addEventListener("push", (event) => {
          const data = event.data ? event.data.json() : {};
          showNotification(data);
          fetchNotifications(); // Refresh notifications
        });
      });
    }
  };

  const showNotification = (data) => {
    if (Notification.permission === "granted") {
      new Notification(data.title || "New Notification", {
        body: data.body || data.message || "You have a new notification",
        icon: data.icon || "/favicon.ico",
        badge: "/favicon.ico",
        tag: data.id || Date.now().toString(),
        requireInteraction: false,
      });
    }
  };


  const handleNotificationClick = (e, notification) => {
    e.preventDefault();
    e.stopPropagation();
    // Mark as read when clicked
    if (!notification.is_read_by_user && notification.id) {
      markAsRead(notification.id);
    }
  };

  const markAsRead = (notificationId) => {
    const url = `notification/notification/${notificationId}/`;
    putRequest(url, { is_read_by_user: true }, {}).then((response) => {
      if (response && response.status === 200) {
        // Update local state without refetching to avoid scroll and re-render
        setNotifications(prevNotifications => 
          prevNotifications.map(notif => 
            notif.id === notificationId 
              ? { ...notif, is_read_by_user: true }
              : notif
          )
        );
        setUnreadCount(prev => {
          const newCount = Math.max(0, prev - 1);
          // Update parent component's unread count
          if (window.updateNotificationCount) {
            window.updateNotificationCount(newCount);
          }
          return newCount;
        });
      }
    }).catch((error) => {
      console.error("Error marking notification as read:", error);
    });
  };

  const markAllAsRead = () => {
    // POST to notification/notification/ marks all as read
    const url = 'notification/notification/';
    postRequest(url, {}, {}).then((response) => {
      if (response && response.status === 200) {
        fetchNotifications(1, false);
      }
    }).catch((error) => {
      console.error("Error marking all as read:", error);
    });
  };

  const handleNotificationScroll = (e) => {
    if (loading || loadingMore || !hasMore) {
      return;
    }
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const threshold = 120;
    if (scrollHeight - scrollTop - clientHeight <= threshold) {
      fetchNotifications(currentPage + 1, true);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Box style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#f5f5f5' }}>
      {/* Summary Section */}
      <Box style={{ padding: '16px', borderBottom: '1px solid #e0e0e0', backgroundColor: 'white' }}>
        <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <Typography variant="h6" style={{ fontWeight: 600 }}>
            Notifications Summary
          </Typography>
          <Box style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Button
              size="small"
              variant={showUnreadOnly ? "contained" : "outlined"}
              color={showUnreadOnly ? "primary" : "default"}
              onClick={() => setShowUnreadOnly(!showUnreadOnly)}
              style={{ textTransform: 'none', minWidth: '100px' }}
            >
              {showUnreadOnly ? 'Unread Only' : 'All Messages'}
            </Button>
            {unreadCount > 0 && (
              <Button size="small" onClick={markAllAsRead} style={{ textTransform: 'none' }}>
                Mark all as read
              </Button>
            )}
          </Box>
        </Box>
        <Box style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          <Box>
            <Typography variant="caption" style={{ color: '#999', display: 'block' }}>Total Messages</Typography>
            <Typography variant="h6" style={{ fontWeight: 600, color: '#4680FF' }}>{totalCount}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" style={{ color: '#999', display: 'block' }}>Unread</Typography>
            <Typography variant="h6" style={{ fontWeight: 600, color: '#f44336' }}>{unreadCount}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" style={{ color: '#999', display: 'block' }}>Read</Typography>
            <Typography variant="h6" style={{ fontWeight: 600, color: '#4caf50' }}>{totalCount - unreadCount}</Typography>
          </Box>
        </Box>
      </Box>
      <Box
        ref={listContainerRef}
        onScroll={handleNotificationScroll}
        style={{ flex: 1, overflow: 'auto', padding: '8px' }}
      >
        {loading ? (
          <Box style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress size={24} />
          </Box>
        ) : notifications.length === 0 ? (
          <Box style={{ textAlign: 'center', padding: '40px 20px', color: '#999' }}>
            <Typography variant="body2">No notifications</Typography>
          </Box>
        ) : (
          notifications.map((notification, idx) => {
            const heading = notification.channel_data?.subject || notification.channel_data?.heading || notification.api_name || 'Notification';
            const time = formatDate(notification.created);
            const message = notification.channel_data?.body || notification.channel_data?.message || notification.channel_data?.text || '';
            const attachments = notification.channel_data?.attachmentLinks || [];
            
            return (
              <Box
                key={notification.id || idx}
                onClick={(e) => handleNotificationClick(e, notification)}
                style={{
                  padding: '16px',
                  marginBottom: '12px',
                  backgroundColor: notification.is_read_by_user ? 'white' : '#e3f2fd',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  borderLeft: notification.is_read_by_user ? 'none' : '4px solid #4680FF',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.15)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <Box style={{ flex: 1 }}>
                    <Typography variant="subtitle1" style={{ fontWeight: notification.is_read_by_user ? 500 : 600, marginBottom: '8px' }}>
                      {heading}
                    </Typography>
                    <Typography variant="caption" style={{ color: '#999', display: 'block' }}>
                      {time}
                      {notification.notification_medium && ` • ${notification.notification_medium}`}
                    </Typography>
                  </Box>
                  {!notification.is_read_by_user && (
                    <Box style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#4680FF', marginLeft: '8px', marginTop: '4px' }} />
                  )}
                </Box>
                
                {/* Message Content */}
                {message && (
                  <Box style={{ marginTop: '12px', marginBottom: '12px' }}>
                    <Box 
                      style={{ 
                        padding: '12px', 
                        backgroundColor: '#f9f9f9', 
                        borderRadius: '4px',
                        color: '#333',
                        fontSize: '14px',
                        lineHeight: '1.5'
                      }}
                      dangerouslySetInnerHTML={{ __html: message }}
                    />
                  </Box>
                )}
                
                {/* Documents/Attachments */}
                {attachments && attachments.length > 0 && (
                  <Box style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e0e0e0' }}>
                    <Typography variant="caption" style={{ color: '#666', display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                      Attachments ({attachments.length})
                    </Typography>
                    <Box style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {attachments.map((doc, docIdx) => {
                        const docUrl = doc.url || doc.document_data || doc.file || '';
                        const docName = doc.title || doc.file_name || doc.name || `Document ${docIdx + 1}`;
                        const isImage = docUrl && /\.(jpg|jpeg|png|gif|webp)$/i.test(docUrl);
                        
                        return (
                          <Box
                            key={docIdx}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (docUrl) {
                                window.open(docUrl, '_blank');
                              }
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '8px',
                              backgroundColor: '#f5f5f5',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              '&:hover': {
                                backgroundColor: '#eeeeee'
                              }
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#eeeeee';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#f5f5f5';
                            }}
                          >
                            {isImage ? (
                              <img 
                                src={docUrl} 
                                alt={docName}
                                style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            ) : (
                              <Box style={{ width: '40px', height: '40px', backgroundColor: '#4680FF', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Typography variant="caption" style={{ color: 'white', fontWeight: 600 }}>
                                  📄
                                </Typography>
                              </Box>
                            )}
                            <Typography variant="body2" style={{ flex: 1, color: '#4680FF', textDecoration: 'underline' }}>
                              {docName}
                            </Typography>
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>
                )}
              </Box>
            );
          })
        )}
        {!loading && loadingMore && (
          <Box style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
            <CircularProgress size={20} />
          </Box>
        )}
      </Box>
    </Box>
  );
};

// Chatbot content for drawer (without floating button)
const ChatbotDrawerContent = () => {
  const [suggestions, setSuggestions] = useState([]);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [responseStyle, setResponseStyle] = useState("direct");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const {
    options: academicYearOptions,
    yearId: chatAcademicYear,
    setYearId: setChatAcademicYear,
    effectiveYear: chatEffectiveAcademicYear,
    loading: academicYearLoading,
  } = useChatbotAcademicYearPanel(true);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    fetchSuggestions();
  }, []);

  useEffect(() => {
    if (!loading && inputRef.current) {
      setTimeout(() => {
        if (inputRef.current && !inputRef.current.disabled) {
          inputRef.current.focus();
        }
      }, 100);
    }
  }, [loading]);

  const fetchSuggestions = () => {
    const url = GET_URL.chatbotsuggestions.api;
    const params = {};
    return getRequest(url, params, {})
      .then((response) => {
        if (response && response.status === 200) {
          const data = response.data || {};
          const list = data.suggestions || data.data?.suggestions || [];
          setSuggestions(Array.isArray(list) ? list : []);
        } else {
          setSuggestions([]);
        }
      })
      .catch((error) => {
        console.error("Error loading suggestions:", error);
        setSuggestions([]);
      });
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
          text: "Sorry, I'm having trouble connecting. Check your network or sign in again, then retry.",
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

  const startNewChat = () => {
    setMessages([]);
    setInputValue("");
    setChatAcademicYear(getAcademicYear() || "");
    fetchSuggestions();
  };

  const bubbleStyle = (sender) => {
    const base = {
      alignSelf: sender === "user" ? "flex-end" : "flex-start",
      maxWidth: "92%",
      marginBottom: 10,
      padding: "11px 14px",
      borderRadius: 16,
      fontSize: 14,
      lineHeight: 1.55,
      wordBreak: "break-word",
    };
    if (sender === "user") {
      return {
        ...base,
        background: "linear-gradient(135deg, #1c52c8 0%, #2563eb 100%)",
        color: "#fff",
        borderBottomRightRadius: 6,
        boxShadow: "0 4px 14px rgba(37, 99, 235, 0.25)",
      };
    }
    if (sender === "error") {
      return {
        ...base,
        background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
        color: "#fff",
        borderBottomLeftRadius: 6,
        boxShadow: "0 2px 10px rgba(220, 38, 38, 0.25)",
      };
    }
    return {
      ...base,
      background: "#fff",
      color: "#0f172a",
      border: "1px solid rgba(15, 23, 42, 0.06)",
      borderBottomLeftRadius: 6,
      boxShadow: "0 1px 3px rgba(15, 23, 42, 0.06)",
    };
  };

  return (
    <Box
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(180deg, #f1f5f9 0%, #f8fafc 40%, #fff 100%)",
      }}
    >
      <Box
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "12px 14px",
          borderBottom: "1px solid rgba(15, 23, 42, 0.06)",
          background: "linear-gradient(135deg, #0f3d91 0%, #1c52c8 50%, #2563eb 100%)",
        }}
      >
        <Box style={{ minWidth: 0 }}>
          <Typography variant="subtitle2" style={{ color: "#fff", fontWeight: 700, letterSpacing: "-0.02em" }}>
            Assistant
          </Typography>
          <Typography variant="caption" style={{ color: "rgba(255,255,255,0.88)", display: "block", marginTop: 2 }}>
            School data & workflows
          </Typography>
        </Box>
        {messages.length > 0 && (
          <Button
            size="small"
            onClick={startNewChat}
            style={{
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.4)",
              textTransform: "none",
              fontSize: 12,
              fontWeight: 600,
              padding: "4px 10px",
              minWidth: 0,
            }}
          >
            New chat
          </Button>
        )}
      </Box>

      <ChatbotAcademicYearBar
        options={academicYearOptions}
        value={chatAcademicYear}
        onChange={setChatAcademicYear}
        loading={academicYearLoading}
        disabled={loading}
      />

      <Box style={{ flex: 1, minHeight: 0, overflow: "auto", padding: "14px", display: "flex", flexDirection: "column" }}>
        {suggestions.length > 0 && messages.length === 0 && (
          <Paper
            elevation={0}
            style={{
              marginBottom: 12,
              padding: 14,
              borderRadius: 14,
              border: "1px solid rgba(37, 99, 235, 0.12)",
              background: "#fff",
            }}
          >
            <Typography
              variant="caption"
              style={{
                display: "block",
                fontWeight: 700,
                letterSpacing: "0.06em",
                color: "#64748b",
                marginBottom: 10,
                textTransform: "uppercase",
              }}
            >
              Try asking
            </Typography>
            <Box style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {suggestions.map((q, i) => (
                <Button
                  key={i}
                  variant="outlined"
                  size="small"
                  onClick={() => handleSuggestionClick(q)}
                  disabled={loading}
                  style={{
                    textTransform: "none",
                    justifyContent: "flex-start",
                    textAlign: "left",
                    borderColor: "rgba(37, 99, 235, 0.25)",
                    color: "#0f172a",
                    background: "#f8fafc",
                    borderRadius: 12,
                    padding: "10px 12px",
                  }}
                >
                  {q}
                </Button>
              ))}
            </Box>
          </Paper>
        )}
        {messages.length === 0 && !loading && (
          <Paper
            elevation={0}
            style={{
              textAlign: "center",
              padding: "22px 16px",
              marginBottom: 12,
              borderRadius: 16,
              border: "1px solid rgba(37, 99, 235, 0.1)",
              background: "#fff",
            }}
          >
            <Typography variant="subtitle1" style={{ fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>
              How can I help?
            </Typography>
            <Typography variant="body2" style={{ color: "#475569", lineHeight: 1.55 }}>
              Ask about this academic system or tap a suggestion above.
            </Typography>
          </Paper>
        )}
        {messages.map((msg, idx) => {
          if (msg.sender === "bot") {
            return (
              <Box key={idx} style={bubbleStyle("bot")}>
                <BrilliantAssistantMessage
                  text={msg.text}
                  structured={msg.structured}
                  resumeQuery={msg.resumeQuery}
                  disabled={loading}
                  onSelectExam={({ examId, resumeQuery }) => {
                    sendMessage(resumeQuery || "", { examId });
                  }}
                />
              </Box>
            );
          }
          return (
            <Box
              key={idx}
              style={bubbleStyle(msg.sender)}
              dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, "<br>") }}
            />
          );
        })}
        {loading && (
          <Box
            style={{
              alignSelf: "flex-start",
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              marginBottom: 10,
              background: "#fff",
              borderRadius: 14,
              border: "1px solid rgba(15, 23, 42, 0.06)",
            }}
          >
            <Typography variant="caption" style={{ color: "#64748b", fontWeight: 500 }}>
              Assistant is replying
            </Typography>
            <CircularProgress size={16} style={{ color: "#2563eb" }} />
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Box>

      <Box
        style={{
          flexShrink: 0,
          padding: "12px 14px 10px",
          borderTop: "1px solid rgba(15, 23, 42, 0.06)",
          background: "#fff",
        }}
      >
        <Box
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 8,
            marginBottom: 10,
          }}
          role="group"
          aria-label="How answers are shown"
        >
          <Typography variant="caption" style={{ color: "#64748b", fontWeight: 600 }}>
            Reply as
          </Typography>
          <Button
            size="small"
            variant={responseStyle === "direct" ? "contained" : "outlined"}
            color="primary"
            onClick={() => setResponseStyle("direct")}
            disabled={loading}
            style={{ textTransform: "none", borderRadius: 999, minWidth: 0, fontSize: 12 }}
          >
            Direct answer
          </Button>
          <Button
            size="small"
            variant={responseStyle === "steps" ? "contained" : "outlined"}
            color="primary"
            onClick={() => setResponseStyle("steps")}
            disabled={loading}
            style={{ textTransform: "none", borderRadius: 999, minWidth: 0, fontSize: 12 }}
          >
            With steps
          </Button>
        </Box>
        <Box style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
          <TextField
            inputRef={inputRef}
            fullWidth
            multiline
            minRows={1}
            maxRows={5}
            size="small"
            placeholder={
              loading ? "Please wait…" : "Message… (Enter to send, Shift+Enter for new line)"
            }
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleInputKeyDown}
            disabled={loading}
            variant="outlined"
            InputProps={{
              style: { borderRadius: 14, background: "#f8fafc", fontSize: 14 },
            }}
          />
          <IconButton
            color="primary"
            onClick={() => {
              if (!loading && inputValue.trim()) {
                sendMessage(inputValue);
              }
            }}
            disabled={loading || !inputValue.trim()}
            aria-label="Send message"
            style={{
              background: "linear-gradient(135deg, #1c52c8 0%, #2563eb 100%)",
              color: "#fff",
              width: 44,
              height: 44,
              borderRadius: 14,
              boxShadow: "0 4px 14px rgba(37, 99, 235, 0.35)",
            }}
          >
            <SendIcon style={{ fontSize: 20 }} />
          </IconButton>
        </Box>
        <Typography variant="caption" style={{ display: "block", textAlign: "center", marginTop: 8, color: "#94a3b8" }}>
          Enter sends · Shift+Enter new line
        </Typography>
      </Box>
    </Box>
  );
};

const logoDefault = process.env.REACT_APP_ENV === "edubricz" ? eb : brainova;
const drawerWidth = 250;
const drawerClosedWidth = 75;
const user = localStorage.getItem("user") != "undefined"
? JSON.parse(localStorage.getItem("user"))
: [];
const signupconfig = localStorage.getItem("signupconfig") != "undefined"
? JSON.parse(localStorage.getItem("signupconfig"))
: {};
const { host } = window.location;
// const host = "cambridgepreschool.edubricz.com"
const school_logo = `${AWS_BUCKET_URL}companies-images/logos/${host}.png`;
const Styles = (theme) => ({
  // const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
  },
  drawer: {
    [theme.breakpoints.up("sm")]: {
      width: drawerWidth,
      flexShrink: 0,
    },
  },
  drawerClosed: {
    width: drawerClosedWidth,
    flexShrink: 0,
  },
  appBar: {
    backgroundColor: "var(--headingColor) !important"
  },
  // necessary for content to be below app bar
  toolbar: theme.mixins.toolbar,
  drawerPaper: {
    width: drawerWidth,
    "@media (min-width:980px)": {
      top: "70px!important",
      height: "calc(100% - 70px)",
      zIndex: "1000",
    },
  },
  drawerPaperClosed: {
    width: drawerClosedWidth,
    "@media (min-width:980px)": {
      top: "70px!important",
    },
  },
  content: {
    flexGrow: 1,
  },
  grow: {
    flexGrow: 1,
  },

  sectionMobile: {
    display: "flex",
    [theme.breakpoints.up("md")]: {
      display: "none",
    },
  },
});

class DrawerBar extends Component {
  constructor(props) {
    super(props);
    this.state = {
      menus: [],
      treeStructuredMenus: [],
      treeStructuredUrls: [],
      openDrawer: true,
      menuStatus: {},
      openDrawerSubmenu: [],
      urlHeaderMap: {},
      urlDataMap: {},
      associatedUrls: {},
      isMenuOpen: false,
      isDownloadOpen: false,
      anchorEl: null,
      forgotPasswordPopup: false,
      mobileOpen: false,
      showTopInd: false,
      hideBranchUrls: [],
      hideBoardUrls: [],
      isSearchOpen: false,
      anchorSearchRef: null,
      searchText: "",
      urlDataList: [],
      schoolLogoPresent: false,
      showSchoolLogo: false,
      chatDrawerOpen: false,
      drawerTabValue: 0,
      unreadNotificationCount: 0
    };
    this.menus =
      localStorage.getItem("menu") != "undefined"
        ? JSON.parse(localStorage.getItem("menu"))
        : [];
    this.anchorRef = React.createRef();
    this.anchorDownloadRef = React.createRef();
    this.anchorSearchRef = React.createRef();
    this.resultsDiv = React.createRef();
  }

  componentDidMount() {
    this.getPermissionList();
    this.getAssociatedUrls();
    this.checkLogo();
    window.addEventListener("scroll", this.handleScroll);
    
    // Set up global function to update notification count
    window.updateNotificationCount = (count) => {
      this.setState({ unreadNotificationCount: count });
    };
    
    // Set up push notification listener
    this.setupPushNotifications();
  }
  
  setupPushNotifications = () => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      navigator.serviceWorker.ready.then((registration) => {
        // Listen for push events
        navigator.serviceWorker.addEventListener("message", (event) => {
          if (event.data && event.data.type === "NOTIFICATION") {
            // Refresh notifications when push is received
            if (this.state.chatDrawerOpen && this.state.drawerTabValue === 0) {
              // Trigger refresh in NotificationDrawerContent
              window.refreshNotifications && window.refreshNotifications();
            }
            // Update count
            if (event.data.unreadCount !== undefined) {
              this.setState({ unreadNotificationCount: event.data.unreadCount });
            }
          }
        });
      });
    }
  };

  componentWillUnmount() {
    window.removeEventListener("scroll", this.handleScroll);
  }

  checkLogo = () => {
    if (host.includes("localhost") || host.includes("127.0.0.1")) {
      return;
    }
    var request = new XMLHttpRequest();
    request.open("GET", school_logo, true);
    request.send();
    request.onload = () => {
      if (request.status === 200) {
        this.setState({
          schoolLogoPresent: true
        });
      }
    };
  };

  handleScroll = () => {
    var scroll = this.resultsDiv.current.scrollTop;
    if (scroll > 200) this.setState({ showTopInd: true });
    else this.setState({ showTopInd: false });
  };
  getAssociatedUrls = () => {
    let associatedUrls = {};
    let permissionNames = { ...Actions };
    let urlHeaderMap = {};
    let hideBranchUrls = HIDE_BRANCH;
    let hideBoardUrls = HIDE_BOARD;
    for (const action in permissionNames) {
      for (const type in permissionNames[action]) {
        if (
          screenTypes.includes(type) &&
          permissionNames[action][type]["action"] === "sub-menu"
        ) {
          let associated_urls = [permissionNames[action][type]["url"]];
          if (permissionNames[action][type].hasOwnProperty("associated_urls")) {
            associated_urls = associated_urls.concat(
              permissionNames[action][type]["associated_urls"]
            );
          }
          associatedUrls[permissionNames[action][type]["url"]] =
            associated_urls;
          urlHeaderMap[permissionNames[action][type]["url"]] =
            permissionNames[action].name;
        }
        if (permissionNames[action][type].hide_branch_dropdown) {
          hideBranchUrls.push(permissionNames[action][type].url);
        }
        if (permissionNames[action][type].hide_board_dropdown) {
          hideBoardUrls.push(permissionNames[action][type].url);
        }
      }
    }
    this.setState({
      associatedUrls,
      urlHeaderMap,
      hideBranchUrls,
      hideBoardUrls,
    });
  };

  static getDerivedStateFromProps(props) {
    return {
      tableData: props.data,
    };
  }

  getMappedMenus = () => {
    const treeStructuredMenus = getTreeStucturedPermissionHavingMenus(
      this.menus,
      this.state.urlDataMap
    );
    this.setState({ menus: this.menus, treeStructuredMenus }, () => {
      this.getChildrenParentMap(treeStructuredMenus);
    });
  };

  getChildrenParentMap = (treeStructuredMenus) => {
    let children_parent_map = {};
    let pathAlias = {};
    const { associatedUrls } = this.state;
    for (const parent of treeStructuredMenus) {
      for (const child of parent.children) {
        children_parent_map[child.data.path] = parent.data.alias_name;
        pathAlias[child.data.path] = child.data.alias_name;
        if (associatedUrls.hasOwnProperty(child.data.path)) {
          for (const associates_ind in associatedUrls[child.data.path]) {
            children_parent_map[
              associatedUrls[child.data.path][associates_ind]
            ] = parent.data.alias_name;
          }
        }
      }
    }
    localStorage.setItem("pathAlias", JSON.stringify(pathAlias));
    this.setState({ children_parent_map });
  };

  getPermissionList = () => {
    const user = getLocalStorageDetails("user", "object");
    if (user) {
      let permissions = user ? user["user_permissions"] : "";
      permissions = permissions.concat(user["groups"]);
      this.setState({ permissions, userInfo: user }, () =>
        this.getPermissionHavingUrls()
      );
    }
  };

  getPermissionHavingUrls = () => {
    const { permissions, userInfo } = this.state;
    let permissionNames = { ...Actions };
    let urlDataMap = {};
    let urlDataList = [];
    let isAdmin = false;
    let isSuperAdmin = false;
    for (let id of ADMIN_IDS) {
      if (userInfo.group_id.includes(parseInt(id))) {
        isAdmin = true;
        break;
      }
    }
    if (userInfo.group_id.includes(parseInt(SUPER_ADMIN_ID))) {
      isSuperAdmin = true;
    }
    for (const action in permissionNames) {
      for (const type in permissionNames[action]) {
        if (
          screenTypes.includes(type) &&
          permissionNames[action][type]["action"] === "sub-menu"
        ) {
          let { action_code } = permissionNames[action][type];
          if (
            (!permissions.includes(action_code) &&
              permissionNames[action][type].is_superuser_action &&
              !isAdmin) ||
            (permissionNames[action][type].is_superuser_action_only &&
              !isSuperAdmin)
          ) {
            continue;
          }
          if (
            !permissionNames[action][type].is_superuser_action &&
            !permissionNames[action][type].is_superuser_action_only &&
            !permissions.includes(action_code)
          ) {
            continue;
          }
          if (
            !permissionNames[action][type].is_superuser_action &&
            permissionNames[action][type]["is_depend_on_setting"]
          ) {
            let isPermission = false;
            permissionNames[action][type]["setting"].forEach((key) => {
              let returnValue = getSettingValue(key.name);
              if (key.value.includes(returnValue)) {
                isPermission = true;
              }
            });
            if (!isPermission) {
              continue;
            }
          }
          urlDataMap[permissionNames[action][type]["url"]] =
            permissionNames[action][type];
        }
      }
    }
    Object.keys(urlDataMap).map((data) => {
      urlDataMap[data]["name"] = urlDataMap[data]["name"];
      urlDataList.push(urlDataMap[data]);
    });
    this.setState({ urlDataMap, urlDataList }, () => {
      this.getMappedMenus();
    });
  };

  handleMenuOpen = (parent_alias, index) => {
    let tempOpenSub = [...this.state.openDrawerSubmenu];
    if (tempOpenSub.includes(parent_alias)) {
      tempOpenSub = tempOpenSub.filter((e) => e !== parent_alias);
    } else {
      tempOpenSub.push(parent_alias);
    }
    // let openDrawerSubmenu = this.state.openDrawerSubmenu === parent_alias ? "" : parent_alias;

    this.setState({ openDrawerSubmenu: [...tempOpenSub], openDrawer: true });
  };

  getUserProfile = () => {
    const { userInfo } = this.state;
    let img = blankProfile;
    let fullName = "";
    if (userInfo && userInfo.is_staff && userInfo.staff) {
      if (
        userInfo.staff.profile_pic_details &&
        userInfo.staff.profile_pic_details.file
      ) {
        img = userInfo.staff.profile_pic_details.file;
      }
      if (userInfo.staff.full_name) {
        fullName = userInfo.staff.full_name;
      }
    } else if (userInfo && !userInfo.is_staff && userInfo.student) {
      if (
        userInfo.student.profile_pic_details &&
        userInfo.student.profile_pic_details.file
      ) {
        img = userInfo.student.profile_pic_details.file;
      }
      if (userInfo.student.full_name) {
        fullName = userInfo.student.full_name;
      }
    } else if (userInfo) {
      fullName = userInfo.username;
    }
    return (
      <Box textAlign="center">
        <Box display="flex" justifyContent="center">
          <Avatar alt="profile-img" src={img} className={"user-profile"} />
        </Box>
        <Box style={{ textTransform: "capitalize" }}>
          <Typography variant="subtitle1" noWrap={true}>
            {fullName}
          </Typography>
          <Box>
            {userInfo &&
              userInfo.group_name.length > 0 &&
              userInfo.group_name[0]}
          </Box>
          <hr className="profile-hr-line" />
        </Box>
        <Box m={1}></Box>
      </Box>
    );
  };

  handlerDrawer = (treeStructuredMenus, isChildren) => {
    const {
      openDrawer,
      children_parent_map,
      openDrawerSubmenu,
      associatedUrls,
    } = this.state;
    const { classes, location } = this.props;
    const pathname = location.pathname;
    return treeStructuredMenus.map((menu, index) => {
      const theme = localStorage.getItem("theme");
      let imageUrl = null;
      if (menu.data.image_url) {
        imageUrl = theme
          ? `${menu.data.image_url}/${theme}.${menuImgType}`
          : `${menu.data.image_url}/blue.${menuImgType}`;
      }
      let listItemClass = "menu-head p-5px";
      if (openDrawerSubmenu.includes(menu.title)) {
        listItemClass = "opened-menu";
      }
      if (
        children_parent_map &&
        pathname &&
        children_parent_map[pathname] === menu.data.alias_name
      ) {
        listItemClass = "menu-selected-head menu-head p-5px";
      }
      if (
        menu.hasOwnProperty("children") &&
        menu.children.length > 0 &&
        children_parent_map &&
        pathname
      ) {
        return (
          <React.Fragment key={index}>
            <Tooltip
              title={menu.data.alias_name}
              enterDelay={400}
              enterNextDelay={400}
              placement="top-start"
              classes={{ tooltip: "tooltip-show-data" }}
              disableHoverListener={openDrawer}
            >
              <div className="drawer-element" id={menu.title}>
                <ListItem
                  button
                  onClick={() =>
                    this.handleMenuOpen(menu.data.alias_name, index)
                  }
                  className={listItemClass}
                >
                  {/* {!openDrawer && imageUrl && (
                    <img src={imageUrl} alt="menu-icon" className="menu-icon" />
                  )} */}
                  {openDrawer && (
                    <>
                      <div className="d-flex align-items-center">
                        {/* {imageUrl && (
                          <img
                            src={imageUrl}
                            alt="menu-icon"
                            className="menu-icon"
                          />
                        )} */}
                        <Box className={imageUrl ? "ml-10" : "ml-10"}>
                          <ListItemText>
                            <Typography
                              variant={isChildren ? "subtitle2" : "subtitle1"}
                              className={
                                !isChildren ? "font-weight-400" : "fs-12"
                              }
                            >
                              {menu.data.alias_name}
                            </Typography>
                          </ListItemText>
                        </Box>
                      </div>
                      {children_parent_map[pathname] !==
                        menu.data.alias_name && (
                        <Box className={classes.expondIcon}>
                          {openDrawerSubmenu.includes(menu.data.alias_name) ? (
                            <ExpandLess />
                          ) : (
                            <ExpandMore />
                          )}
                        </Box>
                      )}
                    </>
                  )}
                </ListItem>
                {openDrawerSubmenu.includes(menu.data.alias_name) && (
                  <List>
                    <Box className={classes.nested}>
                      {this.handlerDrawer(menu.children, true)}
                    </Box>
                  </List>
                )}
              </div>
            </Tooltip>
          </React.Fragment>
        );
      } else if (!menu.hasOwnProperty("children")) {
        const alias =
          menu.data.alias_name.length > 24
            ? `${menu.data.alias_name.substr(0, 21)}...`
            : menu.data.alias_name;
        return (
          <MenuItem
            key={index}
            // target={menu.data.new_window ? "_blank" : "_self"}
            target={menu.data.new_window ? "_blank" : "_self"}
            id={menu.data.alias_name}
            className={
              associatedUrls.hasOwnProperty(menu.data.path) &&
              associatedUrls[menu.data.path].includes(pathname)
                ? "sublist-item sublist-selected sublistSelected"
                : "sublist-item sublist-unselected"
            }
            onClick={(e) => {
              this.routeToSubmenuPath(e, menu.data);
            }}
          >
            {menu.data.alias_name.length > 24 ? (
              <Tooltip
                title={`${menu.data.alias_name}`}
                placement="top-start"
                arrow
              >
                <ListItemText primary={alias} />
              </Tooltip>
            ) : (
              <ListItemText primary={alias} />
            )}
          </MenuItem>
        );
      }
    });
  };
  routeToSubmenuPath = (event, menu_data) => {
    if (event.ctrlKey) {
      window.open(menu_data.url, "_blank");
    } else {
      this.props.history.push(menu_data.url);
    }
  };
  forgotPassword = (flag) => {
    this.setState({ forgotPasswordPopup: flag, isMenuOpen: false });
  };
  handleDrawerOpenClose = (openDrawer) => {
    let { openDrawerSubmenu } = this.state;
    if (!openDrawer) {
      openDrawerSubmenu = "";
    }
    this.setState({ openDrawer, openDrawerSubmenu });
  };

  logoutFromScreen = () => {
    logout();
  };

  handleDrawerToggle = () => {
    this.setState({ mobileOpen: !this.state.mobileOpen });
  };
  handleMenuClose = (e, action) => {
    let anchorEl = null;
    let isMenuOpen = !this.state.isMenuOpen;
    if (action === "close") {
      isMenuOpen = false;
    }
    if (isMenuOpen) {
      anchorEl = e.currentTarget;
    }
    this.setState({ isMenuOpen, anchorEl });
  };

  handleDownloadClose = (e, action) => {
    let anchorEl = null;
    let isDownloadOpen = !this.state.isDownloadOpen;
    if (action === "close") {
      isDownloadOpen = false;
    }
    if (isDownloadOpen) {
      anchorEl = e.currentTarget;
    }
    this.setState({ isDownloadOpen, anchorEl });
  };

  handleSearchClose = (e, action) => {
    let anchorSearchRef = null;
    let isSearchOpen = !this.state.isSearchOpen;
    if (action === "close") {
      isSearchOpen = false;
    }
    if (isSearchOpen) {
      anchorSearchRef = e.currentTarget;
    }
    this.setState({ isSearchOpen, anchorSearchRef });
  };

  handleChatDrawerToggle = () => {
    this.setState((prevState) => ({
      chatDrawerOpen: !prevState.chatDrawerOpen
    }));
  };

  handleChatDrawerClose = () => {
    this.setState({ chatDrawerOpen: false });
  };

  renderMenu = () => {
    const { anchorEl, isMenuOpen, userInfo } = this.state;
    return (
      <Menu
        anchorEl={anchorEl}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        id={"primary-search-account-menu-mobile"}
        keepMounted
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        open={isMenuOpen}
        onClose={(e) => this.handleMenuClose(e, "close")}
      >
        {userInfo &&
          !userInfo.is_superuser &&
          isUserHasPermission("staff", "view") && (
            <MenuItem
              onClick={() => this.props.history.push(Actions.staff.view)}
            >
              Profile
            </MenuItem>
          )}
        <MenuItem onClick={() => this.logoutFromScreen()}>Logout</MenuItem>
      </Menu>
    );
  };
  scrollToTop = () => {
    this.resultsDiv.current.scrollIntoView({ behavior: "smooth" });
  };

  setTheme=()=>{
    
  }

  handleProfileView = () => {
    const { userInfo } = this.state;
    if (userInfo.is_staff && userInfo.staff) {
      this.props.history.push({
        pathname: Actions.general_staff.view.url,
        state: { detail: userInfo.staff.id },
      });
    } else if (userInfo.student) {
      let currentSelectedList = {
        studentId: userInfo.student.id,
      };
      let searchParam =
        "?" + new URLSearchParams(currentSelectedList).toString();
      this.props.history.push({
        pathname: Actions.general_student.view.url,
        search: searchParam,
        state: { detail: userInfo.student.id },
      });
    }
    this.setState({
      isMenuOpen: false,
      isDownloadOpen: false,
    });
  };

  handleSearch = (e, action) => {
    let anchorSearchRef = null;
    let isSearchOpen = !this.state.isSearchOpen;
    if (action === "close") {
      isSearchOpen = false;
    }
    if (isSearchOpen) {
      anchorSearchRef = e.currentTarget;
    }
    this.setState({ isSearchOpen, anchorSearchRef });
  };

  handleDropDownWithSearchChange = (e, newValue) => {
    this.props.history.push(newValue.url);
    this.setState({
      isSearchOpen: false,
      anchorSearchRef: null,
    });
  };

  onStudentChange = (student) => {
    let currentSelectedList = {
      studentId: student.id,
    };
    let searchParam = "?" + new URLSearchParams(currentSelectedList).toString();
    let url = Actions.general_student.view.url;
    if (getProfileTab() === "feeCollection") {
      url = Actions.fee_collection_student.view.url;
    } else if (getProfileTab() === "feeHistory") {
      url = Actions.fee_history_student.view.url;
    }
    this.props.history.push({
      pathname: url,
      search: searchParam,
      state: { detail: student.id },
    });
  };

  handleSetting=()=>{ 
    this.setState({
      isMenuOpen: false 
    })
    this.props.history.push({
      pathname: Actions.settings.view.url
    });
  }

  handlePrivacyPolicy = () => {
    this.props.history.push({
      pathname: Actions.privacypolicy.view.url
    });
  }

  render() {
    const {
      openDrawer,
      treeStructuredMenus,
      mobileOpen,
      urlHeaderMap,
      isMenuOpen,
      userInfo,
      forgotPasswordPopup,
      hideBranchUrls,
      hideBoardUrls,
      showTopInd,
      isSearchOpen,
      searchText,
      urlDataList,
      isDownloadOpen,
      schoolLogoPresent,
      showSchoolLogo
    } = this.state;
    const { classes, children, location } = this.props;
    const container = window !== undefined ? window.document.body : undefined;
    const hideBranch = hideBranchUrls.includes(location.pathname)
      ? true
      : false;
    const hideBoard = hideBoardUrls.includes(location.pathname) ? true : false;
    localStorage.setItem("hideBranch", hideBranch);
    localStorage.setItem("hideBoard", hideBoard);
    
    let dashboardClass = "menu-head p-5px";
    if (location.pathname === "/dashboard") {
      dashboardClass = "menu-selected-head p-5px menu-head";
    }
    let dashImageUrl = null;
    for (let i = 0; i < treeStructuredMenus.length; i++) {
      if (
        treeStructuredMenus[i]["title"] === "Dashboard" &&
        treeStructuredMenus[i]["data"]["image_url"]
      ) {
        dashImageUrl = treeStructuredMenus[i]["data"]["image_url"];
        break;
      }
    }
    // Add pulse animation for NEW badge
    const pulseStyle = `
      @keyframes pulse {
        0% {
          transform: scale(1);
          opacity: 1;
        }
        50% {
          transform: scale(1.1);
          opacity: 0.8;
        }
        100% {
          transform: scale(1);
          opacity: 1;
        }
      }
      .chatbot-new-badge .MuiBadge-badge {
        animation: pulse 2s infinite;
        font-size: 0.5rem !important;
        height: 14px !important;
        min-width: 28px !important;
        padding: 0 4px !important;
        font-weight: 600 !important;
      }
    `;
    
    return (
      <div className={classes.root}>
        <Helmet>
          <style>{pulseStyle}</style>
          {urlHeaderMap.hasOwnProperty(location.pathname) && (
            <title>{urlHeaderMap[location.pathname]}</title>
          )}
        </Helmet>
        <CssBaseline />
        <div ref={this.resultsDiv}></div>
        
        <AppBar position="fixed" className={classes.appBar}>
          <Toolbar style={{ minHeight: 64, display: "flex", alignItems: "center" }}>
            <Box className="menu-button display-md-down">
              <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="start"
                onClick={() => this.handleDrawerToggle()}
                className="menu-button display-md-down"
              >
                <MenuIcon />
              </IconButton>
            </Box>
            <div className="profile-img-div hidden-md-down d-flex" style={{placeItems: "center"}}>
              {!(schoolLogoPresent && signupconfig && signupconfig.hide_eb_logo_in_header) &&
                <img
                  src={logoDefault}
                  alt="logo"
                  className="logo-img pointer"
                  width={
                    process.env.REACT_APP_ENV === "edubricz" ? "50px" : "30px"
                  }
                  onClick={(event) =>
                    event.ctrlKey
                      ? window.open("/dashboard", "_blank")
                      : this.props.history.push("/dashboard")
                  }
                />
              }
              {schoolLogoPresent && signupconfig?.show_school_logo_in_header ?
              <>
                <img
                    src={school_logo}
                    alt="logo"
                    className="profile-img-div hidden-md-down"
                    width={
                      process.env.REACT_APP_ENV === "edubricz" ? "40px" : "30px"
                    }
                    style={{marginTop: '5px', marginBottom: '5px'}}
                    onClick={(event) =>
                      event.ctrlKey
                        ? window.open("/dashboard", "_blank")
                        : this.props.history.push("/dashboard")
                    }
                  />
                  <Box ml={2}>{signupconfig.institute_details.name}</Box>
              </>
              : (user && 
                  <Box ml={2}>{user.institute_details.name}</Box>
              )
              }
              </div>
            <div className={classes.grow} />
            {isUserHasPermission("general_student", "view") && (
              <div className="">
                <DropDownWithSearchApi
                  userInfo={userInfo}
                  onStudentChange={this.onStudentChange}
                  className="width-400px"
                />
              </div>
            )}
            <div className={"language-dropdown"}>
              <LocaleToggle
                updateComponent={this.props.updateComponent}
                hideBranch={hideBranch}
                hideBoard={hideBoard}
              />
            </div>
            {(() => {
              const iconBtnStyle = {
                width: 40,
                height: 40,
                padding: 8,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                verticalAlign: "middle",
              };
              const iconStyle = { fontSize: 22, display: "block" };
              return (
            <Box
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginLeft: 16,
                height: 48,
              }}
            >
              <Tooltip
                title={"Search Menus"}
                enterDelay={400}
                enterNextDelay={400}
                placement="top-start"
                classes={{ tooltip: "tooltip-show-data" }}
              >
                <IconButton
                  color="inherit"
                  onClick={this.handleSearch}
                  ref={this.anchorSearchRef}
                  style={iconBtnStyle}
                >
                  <SearchIcon style={iconStyle} />
                </IconButton>
              </Tooltip>
              <Popper
                open={isSearchOpen}
                anchorEl={this.anchorSearchRef.current}
                role={undefined}
                transition
                disablePortal
              >
                {({ TransitionProps, placement }) => (
                  <Grow
                    {...TransitionProps}
                    style={{
                      transformOrigin:
                        placement === "bottom" ? "center top" : "center bottom",
                    }}
                  >
                    <Paper>
                      <ClickAwayListener
                        onClickAway={(e) => {
                          this.handleSearchClose(e, "close");
                        }}
                      >
                        <MenuList autoFocusItem={isMenuOpen} id="menu-list-grow">
                          <MenuItem>
                            <DropDownWithSearch
                              autoFocus
                              id="combo-box-demo"
                              options={urlDataList}
                              value={searchText}
                              onChange={(e, newValue) =>
                                this.handleDropDownWithSearchChange(e, newValue)
                              }
                              optionValue="name"
                              label={"Search Menus"}
                              autoCompleteClassName="width-400px"
                              className="width-inherit bg-white"
                              size="small"
                            />
                          </MenuItem>
                        </MenuList>
                      </ClickAwayListener>
                    </Paper>
                  </Grow>
                )}
              </Popper>
              <Tooltip
                title={"AI Assistant"}
                enterDelay={400}
                enterNextDelay={400}
                placement="top-start"
                classes={{ tooltip: "tooltip-show-data" }}
              >
                <Box style={{ position: 'relative', display: 'inline-block' }}>
                  <IconButton
                    edge="end"
                    aria-label="open chatbot"
                    onClick={this.handleChatDrawerToggle}
                    color="inherit"
                    style={iconBtnStyle}
                  >
                    <RobotIcon style={iconStyle} />
                  </IconButton>
                 
                </Box>
              </Tooltip>
              <Tooltip
                title={"My Profile"}
                enterDelay={400}
                enterNextDelay={400}
                placement="top-start"
                classes={{ tooltip: "tooltip-show-data" }}
              >
                <IconButton
                  edge="end"
                  aria-label="account of current user"
                  aria-controls={"primary-search-account-menu"}
                  aria-haspopup="true"
                  onClick={(e) => {
                    this.handleMenuClose(e, "check");
                  }}
                  color="inherit"
                  ref={this.anchorRef}
                  style={iconBtnStyle}
                >
                  <AccountCircle style={iconStyle} />
                </IconButton>
              </Tooltip>
            </Box>
              );
            })()}
            <div className={classes.sectionDesktop}>
              <Popper
                open={isMenuOpen}
                anchorEl={this.anchorRef.current}
                role={undefined}
                transition
                disablePortal
              >
                {({ TransitionProps, placement }) => (
                  <Grow
                    {...TransitionProps}
                    style={{
                      transformOrigin:
                        placement === "bottom" ? "center top" : "center bottom",
                    }}
                  >
                    <Paper>
                      <ClickAwayListener
                        onClickAway={(e) => {
                          this.handleMenuClose(e, "close");
                        }}
                      >
                        <MenuList
                          autoFocusItem={isMenuOpen}
                          id="menu-list-grow"
                        >
                          {userInfo &&
                            Boolean(userInfo.is_staff) &&
                            isUserHasPermission("student", "view") && (
                              <MenuItem
                                onClick={() => this.handleProfileView()}
                              >
                                Profile
                              </MenuItem>
                            )}
                          {userInfo &&
                            !userInfo.is_superuser &&
                            !userInfo.is_staff &&
                            isUserHasPermission("staff", "view") && (
                              <MenuItem
                                onClick={() =>
                                  this.props.history.push(Actions.staff.url)
                                }
                              >
                                Profile
                              </MenuItem>
                            )}
                          <MenuItem onClick={() => this.forgotPassword(true)}>
                            Change Password
                          </MenuItem>
                          <MenuItem onClick={() => this.handleSetting()}>
                            Settings
                          </MenuItem>
                          <MenuItem onClick={() => this.logoutFromScreen()}>
                            Logout
                          </MenuItem>
                          <MenuItem onClick={() =>
                            this.handlePrivacyPolicy()
                          }>
                            Privacy Policy
                          </MenuItem>
                        </MenuList>
                      </ClickAwayListener>
                    </Paper>
                  </Grow>
                )}
              </Popper>
            </div>
            {/* <div className={classes.sectionDesktop}>
              <Tooltip
                title={"My Downloads"}
                enterDelay={400}
                enterNextDelay={400}
                placement="top-start"
                classes={{ tooltip: "tooltip-show-data" }}
              >
                <IconButton
                  edge="end"
                  aria-label="account of current user"
                  aria-controls={"primary-search-account-menu"}
                  aria-haspopup="true"
                  onClick={(e) => {
                    this.handleDownloadClose(e, "check");
                  }}
                  color="inherit"
                  ref={this.anchorDownloadRef}
                >
                  <CloudDownload />
                </IconButton>
              </Tooltip>
              <Popper
                open={isDownloadOpen}
                anchorEl={this.anchorDownloadRef.current}
                role={undefined}
                transition
                disablePortal
              >
                {({ TransitionProps, placement }) => (
                  <Grow
                    {...TransitionProps}
                    style={{
                      transformOrigin:
                        placement === "bottom" ? "center top" : "center bottom",
                        position:"absolute",
                        left:"-300px",
                        width:"330px",
                        maxHeight:"60vh",
                        overflow:"auto",
                    }}
                  >
                    <Paper>
                      <ClickAwayListener
                        onClickAway={(e) => {
                          this.handleDownloadClose(e, "close");
                        }}
                      >
                        <DownloadList isDownloadOpen={isDownloadOpen} />
                      </ClickAwayListener>
                    </Paper>
                  </Grow>
                )}
              </Popper>
            </div> */}
          </Toolbar>
        </AppBar>
        <nav
          className={openDrawer ? classes.drawer : classes.drawerClosed}
          aria-label="mailbox folders"
        >
          {/* The implementation can be swapped with js to avoid SEO duplication of links. */}
          <Hidden smUp implementation="css">
            <Drawer
              container={container}
              variant="temporary"
              anchor={"left"}
              open={mobileOpen}
              onClose={() => this.handleDrawerToggle()}
              className="menu-button display-md-down"
              classes={{
                paper: openDrawer
                  ? classNames(classes.drawerPaper, "scrollbar")
                  : classNames(classes.drawerPaperClosed, "scrollbar"),
              }}
              ModalProps={{
                keepMounted: true, // Better open performance on mobile.
              }}
            >
              {openDrawer && this.getUserProfile()}
              {this.handlerDrawer(treeStructuredMenus)}
            </Drawer>
          </Hidden>
          <Hidden xsDown implementation="css">
            <Drawer
              classes={{
                paper: openDrawer
                  ? classNames(classes.drawerPaper, "scrollbar")
                  : classNames(classes.drawerPaperClosed, "scrollbar"),
              }}
              variant="permanent"
              open
            >
              <Box position="relative" mb={2}>
                {openDrawer ? (
                  <Box
                    className={"close-button"}
                    boxShadow={4}
                    onClick={() => this.handleDrawerOpenClose(false)}
                  >
                    <ArrowBackIosIcon
                      style={{
                        marginTop: "60px",
                        color: "#4680FF",
                        marginLeft: "4px",
                      }}
                    />
                  </Box>
                ) : (
                  <Box
                    className={"open-button"}
                    boxShadow={4}
                    onClick={() => this.handleDrawerOpenClose(true)}
                  >
                    <ArrowForwardIosIcon
                      style={{ marginTop: "12px", color: "#4680FF" }}
                    />
                  </Box>
                )}
              </Box>
              {openDrawer && this.getUserProfile()}
              <div className="drawer-element" id={"dashboard"}>
                <ListItem
                  button
                  onClick={(event) =>
                    event.ctrlKey
                      ? window.open("/dashboard", "_blank")
                      : this.props.history.push("/dashboard")
                  }
                  className={dashboardClass}
                >
                  <Tooltip
                    title={"Dashboard"}
                    enterDelay={400}
                    enterNextDelay={400}
                    placement="top-start"
                    classes={{ tooltip: "tooltip-show-data" }}
                  >
                    <div className="d-flex align-items-center">
                      {/* {dashImageUrl ? (
                        openDrawer ? (
                          <img
                            src={dashImageUrl}
                            alt="menu-icon"
                            className="menu-icon"
                          />
                        ) : (
                          <img
                            src={dashImageUrl}
                            alt="menu-icon"
                            className="menu-icon"
                          />
                        )
                      ) : (
                        ""
                      )} */}
                      {openDrawer && (
                        <Box className="ml-10">
                          <ListItemText>
                            <Typography
                              variant="subtitle1"
                              className="font-weight-400"
                            >
                              {"Dashboard"}
                            </Typography>
                          </ListItemText>
                        </Box>
                      )}
                    </div>
                  </Tooltip>
                </ListItem>
              </div>
              {this.handlerDrawer(treeStructuredMenus)}
            </Drawer>
          </Hidden>
          {forgotPasswordPopup && (
            <ForgotPassword closeForgotPassword={this.forgotPassword} />
          )}
          {/* Chatbot Drawer */}
          <Drawer
            anchor="right"
            open={this.state.chatDrawerOpen}
            onClose={this.handleChatDrawerClose}
            PaperProps={{
              style: {
                width: window.innerWidth > 768 ? '50vw' : '100%',
                minWidth: window.innerWidth > 768 ? 360 : undefined,
                maxWidth: '100%',
                zIndex: 1200,
              }
            }}
          >
            <Box style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box style={{ padding: '16px', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--headingColor)' }}>
                <Typography variant="h6" style={{ color: 'white' }}>Notifications & AI</Typography>
                <IconButton onClick={this.handleChatDrawerClose} style={{ color: 'white' }}>
                  <CloseIcon />
                </IconButton>
              </Box>
              <Tabs
                value={this.state.drawerTabValue}
                onChange={(e, newValue) => this.setState({ drawerTabValue: newValue })}
                indicatorColor="primary"
                textColor="primary"
                variant="fullWidth"
                style={{ borderBottom: '1px solid #e0e0e0' }}
              >
                <Tab 
                  label={
                    <Badge badgeContent={this.state.unreadNotificationCount || 0} color="error">
                      Notifications
                    </Badge>
                  } 
                />
                <Tab label="AI Assistant" />
              </Tabs>
              <Box style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {this.state.drawerTabValue === 0 ? (
                  <NotificationDrawerContent />
                ) : (
                  <ChatbotDrawerContent />
                )}
              </Box>
            </Box>
          </Drawer>
        </nav>
        <main className={classes.content} style={{ overflow: "auto" }}>
          <Box>
            {/* <Box className={openDrawer ? "open-drawer-width DrawerChildren" : "close-drawer-width DrawerChildren"}>{children}</Box> */}
            <Box className={"DrawerChildren"}>{children}</Box>
          </Box>
          {/* <div className="footer">
            <span>&copy; Edubricz - {(new Date()).getFullYear()}
            <div
              className={`scroll-to-top ${
                showTopInd ? "show-top-ind" : "no-show-top-ind"
              }`}
              onClick={this.scrollToTop}
            >
              <i className="fa fa-2x fa-angle-up scroll-top-icon"></i>
            </div>
            </span>
          </div> */}
        </main>
        {/* {this.renderMenu()} */}
      </div>
    );
  }
}

DrawerBar.propTypes = {
  data: PropTypes.any,
  classes: PropTypes.object.isRequired,
  location: PropTypes.object.isRequired,
  history: PropTypes.object.isRequired,
};

export default withRouter(withStyles(Styles)(DrawerBar));
