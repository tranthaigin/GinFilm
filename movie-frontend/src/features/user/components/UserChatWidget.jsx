import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  MessageCircle,
  X,
  Send,
  ChevronDown,
  AlertCircle,
  Loader2,
  Wifi,
  WifiOff,
  CornerUpLeft,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { chatApi } from '../../staff/api/chatApi';

import axiosClient from '../../../shared/api/client';
import env from '../../../shared/config/env';
import useNotificationStore from '../../../shared/store/notificationStore';
import { useToastStore } from '../store/toastStore';

const WS_URL = env.wsUrl;

// ─── ReplyPreview bar (thanh hiện phía trên input khi đang reply) ─────────────
function ReplyPreviewBar({ replyingTo, onCancel, isUser }) {
  if (!replyingTo) return null;
  return (
    <div
      style={{
        padding: '8px 14px',
        background: 'rgba(220,38,38,0.08)',
        borderTop: '1px solid rgba(220,38,38,0.2)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        flexShrink: 0,
      }}
    >
      <CornerUpLeft size={14} color="#dc2626" style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '11px', color: '#dc2626', fontWeight: 600, marginBottom: '2px' }}>
          {replyingTo.senderRole === 'USER' ? 'Bạn' : replyingTo.senderName || 'Admin'}
        </div>
        <div
          style={{
            fontSize: '12px',
            color: 'rgba(255,255,255,0.5)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {replyingTo.content}
        </div>
      </div>
      <button
        onClick={onCancel}
        style={{
          background: 'none',
          border: 'none',
          color: 'rgba(255,255,255,0.4)',
          cursor: 'pointer',
          padding: '2px',
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}

// ─── Hàm xử lý Markdown Link trong nội dung tin nhắn ───────────────────────
function renderTextWithLinks(text, onCloseWidget) {
  if (!text) return null;
  const parts = text.split(/\[([^\]]+)\]\(([^)]+)\)/g);
  const result = [];
  for (let i = 0; i < parts.length; i++) {
    if (i % 3 === 1) {
      const linkText = parts[i];
      const url = parts[i + 1];
      result.push(
        <Link 
          key={i} 
          to={url} 
          onClick={onCloseWidget}
          style={{ color: '#60a5fa', textDecoration: 'none', fontWeight: 'bold' }}
        >
          {linkText}
        </Link>
      );
      i++; // skip URL
    } else if (parts[i]) {
      result.push(<span key={i}>{parts[i]}</span>);
    }
  }
  return result;
}

// ─── Quoted block hiển thị bên trong tin nhắn ────────────────────────────────
function normalizeAiResponse(data) {
  const response = data && typeof data === 'object' ? data : { reply: data };
  let reply = response.reply;
  let parsedReply = null;

  if (typeof reply === 'string') {
    const candidate = reply
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '');
    const objectStart = candidate.indexOf('{');
    const objectEnd = candidate.lastIndexOf('}');

    if (objectStart >= 0 && objectEnd > objectStart) {
      try {
        parsedReply = JSON.parse(candidate.slice(objectStart, objectEnd + 1));
      } catch {
        parsedReply = null;
      }
    }
  } else if (reply && typeof reply === 'object') {
    parsedReply = reply;
  }

  if (parsedReply && typeof parsedReply === 'object' && !Array.isArray(parsedReply)) {
    reply = parsedReply.reply ?? reply;
  }

  return {
    reply: typeof reply === 'string' ? reply : 'Mình chưa thể xử lý câu trả lời này. Bạn vui lòng thử lại nhé!',
    movies: Array.isArray(response.movies) ? response.movies : [],
  };
}

function QuotedMessage({ replyToSenderName, replyToContent, isUser }) {
  if (!replyToContent) return null;
  return (
    <div
      style={{
        borderLeft: '3px solid rgba(255,255,255,0.3)',
        paddingLeft: '8px',
        marginBottom: '6px',
        opacity: 0.75,
      }}
    >
      <div style={{ fontSize: '10px', fontWeight: 700, color: isUser ? 'rgba(255,255,255,0.8)' : '#dc2626', marginBottom: '2px' }}>
        {replyToSenderName || 'Admin'}
      </div>
      <div
        style={{
          fontSize: '12px',
          color: isUser ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.55)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: '220px',
        }}
      >
        {replyToContent}
      </div>
    </div>
  );
}

export default function UserChatWidget({
  initialOpen = false,
  initialSupportOptions = false,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const isWatchOnlinePage = location.pathname.includes('/watch-online');
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [open, setOpen] = useState(() => Boolean(initialOpen));
  const [isExpanded, setIsExpanded] = useState(false);
  const [adminMessages, setAdminMessages] = useState([]);
  const [aiMessages, setAiMessages] = useState([]);
  const [chatMode, setChatMode] = useState('AI');
  const [inputText, setInputText] = useState('');
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [sending, setSending] = useState(false);
  const [showSupportOptions, setShowSupportOptions] = useState(
    () => Boolean(initialSupportOptions),
  );
  const [replyingTo, setReplyingTo] = useState(null); // tin nhắn đang được reply
  const [hoveredMsgId, setHoveredMsgId] = useState(null); // id tin nhắn đang hover
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const stompClientRef = useRef(null);
  const connectionAttemptRef = useRef(0);
  const disconnectPromiseRef = useRef(Promise.resolve());
  const hadAuthenticatedSessionRef = useRef(Boolean(isAuthenticated && user));
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const notifications = useNotificationStore(state => state.notifications);
  const markAsRead = useNotificationStore(state => state.markAsRead);
  const showToast = useToastStore(state => state.showToast);

  useEffect(() => {
    if (open) {
      const chatNotifs = notifications.filter(n => n.type === 'CHAT' && !n.isRead);
      chatNotifs.forEach(n => markAsRead(n.id));
    }
  }, [open, notifications, markAsRead]);

  const userId = user?.id;
  const userName = user?.fullName || user?.username || 'Khách hàng';
  const roleStr = user ? (typeof user.role === 'string' ? user.role.toUpperCase() :
    Array.isArray(user.roles) ? user.roles.map(r => typeof r === 'string' ? r : (r.name || r.authority || '')).join(' ').toUpperCase() :
      Array.isArray(user.authorities) ? user.authorities.map(a => a.authority || '').join(' ').toUpperCase() : '') : '';
  const isStaffOrAdmin = roleStr.includes('ADMIN') || roleStr.includes('STAFF');
  const unreadChatNotificationKey = notifications
    .filter((notification) => notification.type === 'CHAT' && !notification.isRead)
    .map((notification) => notification.id)
    .join('|');

  // ─── Scroll to bottom ──────────────────────────────────────────────────────
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [adminMessages, aiMessages, chatMode, showSupportOptions, scrollToBottom]);

  // ─── Listen for open event ───────────────────────────────────────────────
  useEffect(() => {
    const handleOpenSupport = () => {
      setOpen(true);
      setShowSupportOptions(true);
    };
    window.addEventListener('openSupportChat', handleOpenSupport);
    return () => window.removeEventListener('openSupportChat', handleOpenSupport);
  }, []);

  // ─── Clear state on logout ───────────────────────────────────────────────
  useEffect(() => {
    const hasAuthenticatedSession = Boolean(isAuthenticated && user);

    if (!hasAuthenticatedSession) {
      setAdminMessages([]);
      setAiMessages([]);
      if (hadAuthenticatedSessionRef.current) {
        setOpen(false);
      }
      setUnreadCount(0);
      setInputText('');
      setReplyingTo(null);
      setShowSupportOptions(false);
      setConnected(false);
      setConnecting(false);
    }

    hadAuthenticatedSessionRef.current = hasAuthenticatedSession;
  }, [isAuthenticated, user]);

  // Keep the closed-widget badge via REST/global notifications without a chat socket.
  useEffect(() => {
    let cancelled = false;

    if (!isAuthenticated || !userId || isStaffOrAdmin) {
      return undefined;
    }

    if (open) {
      return undefined;
    }

    chatApi.getStaffUnreadCount(userId)
      .then((data) => {
        if (!cancelled) {
          setUnreadCount(data?.count ?? 0);
        }
      })
      .catch(() => { });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, userId, isStaffOrAdmin, open, unreadChatNotificationKey]);

  // ─── Load lịch sử khi mở widget ──────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    if (userId) {
      chatApi.getHistory(userId)
        .then((data) => setAdminMessages(Array.isArray(data) ? data : []))
        .catch(() => { });
      // Đánh dấu đã đọc tin từ admin
      chatApi.markAdminRead(userId).catch(() => { });
      setUnreadCount(0);
    }
    
    // Gửi tin nhắn chào mừng theo ngữ cảnh
    const isOnlyWelcomeMsg = aiMessages.length === 1 && aiMessages[0].id === 'welcome-msg';

    if (aiMessages.length === 0 || isOnlyWelcomeMsg) {
      const path = location.pathname;
      let greeting = "Mình có thể giúp gì cho bạn hôm nay?";
      
      if (path.includes('/movies/online')) {
        greeting = "Bạn đang muốn tìm một bộ phim trực tuyến để xem ngay tại nhà? Hãy cho mình biết thể loại bạn thích nhé!";
      } else if (path.includes('/movies/cinema') || path.includes('/now-showing')) {
        greeting = "Bạn đang tìm suất chiếu rạp hôm nay hay cần hỗ trợ đặt vé rạp nào?";
      } else if (path.includes('/profile')) {
        greeting = "Bạn cần hỗ trợ cập nhật thông tin cá nhân, đổi mật khẩu hay mã PIN không?";
      } else if (path.includes('/ticket')) {
        greeting = "Nếu bạn gặp khó khăn khi tìm lại vé rạp hoặc kích hoạt mã vé xem phim, mình có thể giúp bạn!";
      } else if (path.includes('/payment') || path.includes('/checkout')) {
        greeting = "Bạn đang gặp khó khăn ở bước thanh toán hay cần giải đáp về phương thức thanh toán?";
      }
      
      if (!isAuthenticated) {
        greeting = "Chào mừng bạn đến với RapLoFilm! Xin vui lòng [Đăng nhập tại đây](/login) hoặc [Đăng ký tài khoản mới](/register) để sử dụng đầy đủ các tính năng nhé.\n\n" + greeting;
      } else {
        greeting = `Chào ${userName}! ` + greeting;
      }

      if (aiMessages.length === 0 || (isOnlyWelcomeMsg && aiMessages[0].content !== greeting)) {
        const welcomeMsg = {
          id: 'welcome-msg',
          senderRole: 'AI',
          content: greeting,
          createdAt: new Date().toISOString()
        };
        setAiMessages([welcomeMsg]);
      }
    }
    
    // Focus input
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [open, userId, isAuthenticated, aiMessages.length, location.pathname, userName]);

  // ─── WebSocket connect ───────────────────────────────────────────────────
  useEffect(() => {
    const attemptId = ++connectionAttemptRef.current;
    let disposed = false;
    let client = null;

    const disconnect = (clientToDisconnect) => {
      if (!clientToDisconnect) return;

      if (stompClientRef.current === clientToDisconnect) {
        stompClientRef.current = null;
      }

      disconnectPromiseRef.current = Promise.resolve(clientToDisconnect.deactivate())
        .catch(() => undefined);
    };

    // Chat stays fully dormant until an authenticated customer opens the widget.
    if (!open || !isAuthenticated || !userId || !user || isStaffOrAdmin) {
      disconnect(stompClientRef.current);
      Promise.resolve().then(() => {
        if (connectionAttemptRef.current === attemptId) {
          setConnected(false);
          setConnecting(false);
        }
      });
      return undefined;
    }

    const connect = async () => {
      // Do not overlap a reconnect with the previous widget/session disconnect.
      await disconnectPromiseRef.current;
      if (disposed || connectionAttemptRef.current !== attemptId) return;

      setConnecting(true);

      const [{ Client }, sockJsModule] = await Promise.all([
        import('@stomp/stompjs'),
        import('sockjs-client'),
      ]);

      if (disposed || connectionAttemptRef.current !== attemptId) return;

      const SockJS = sockJsModule.default ?? sockJsModule;
      client = new Client({
        webSocketFactory: () => new SockJS(WS_URL),
        reconnectDelay: 5000,
        onConnect: () => {
          if (disposed || stompClientRef.current !== client) return;

          setConnected(true);
          setConnecting(false);
          // Subscribe kênh riêng của user này
          client.subscribe(`/topic/chat.${userId}`, (frame) => {
            if (disposed || stompClientRef.current !== client) return;

            let msg;
            try {
              msg = JSON.parse(frame.body);
            } catch {
              return;
            }

            setAdminMessages((prev) => {
              // Nếu là tin của chính user → thay thế pending optimistic bằng _tempId
              if (msg.senderRole === 'USER') {
                const pendingIdx = prev.findIndex(
                  (m) => m._pending && m._tempId && m.content === msg.content
                );
                if (pendingIdx !== -1) {
                  const next = [...prev];
                  next[pendingIdx] = { ...msg };
                  return next;
                }
              }
              // Tránh duplicate bằng id thực
              if (msg.id && prev.some((m) => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
            // Widget is open while this socket is active, so acknowledge admin messages.
            if (msg.senderRole === 'ADMIN') {
              chatApi.markAdminRead(userId).catch(() => { });
            }
          });
        },
        onDisconnect: () => {
          if (disposed || stompClientRef.current !== client) return;
          setConnected(false);
          setConnecting(false);
        },
        onStompError: () => {
          if (disposed || stompClientRef.current !== client) return;
          setConnected(false);
          setConnecting(false);
        },
        onWebSocketClose: () => {
          if (disposed || stompClientRef.current !== client) return;
          setConnected(false);
          setConnecting(client.active);
        },
      });

      stompClientRef.current = client;
      client.activate();
    };

    connect().catch(() => {
      if (!disposed && connectionAttemptRef.current === attemptId) {
        setConnected(false);
        setConnecting(false);
      }
    });

    return () => {
      disposed = true;
      if (connectionAttemptRef.current === attemptId) {
        connectionAttemptRef.current += 1;
      }
      disconnect(client);
    };
  }, [open, isAuthenticated, userId, user, isStaffOrAdmin]);

  // ─── Gửi tin nhắn tự động (từ support options) ──────────────────────────
  const sendSupportMessage = (text) => {
    if (!text || !connected || !userId) return;
    const tempId = `${Date.now()}-${Math.random()}`;
    const pendingMsg = {
      id: null,
      _pending: true,
      _tempId: tempId,
      conversationId: userId,
      senderId: userId,
      senderName: userName,
      senderRole: 'USER',
      content: text,
      createdAt: new Date().toISOString(),
    };
    setAdminMessages((prev) => [...prev, pendingMsg]);
    stompClientRef.current?.publish({
      destination: '/app/chat.send',
      body: JSON.stringify({
        conversationId: userId,
        senderId: userId,
        senderName: userName,
        senderRole: 'USER',
        content: text,
      }),
    });
  };

  // ─── Gửi tin nhắn ──────────────────────────────────────────────────────
  
  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || sending) return;

    if (chatMode === 'AI') {
      setSending(true);
      const tempId = `${Date.now()}-temp`;
      const userMsg = { id: tempId, senderRole: 'USER', content: text, createdAt: new Date().toISOString() };
      setAiMessages(prev => [...prev, userMsg]);
      setInputText('');
      
      const botTempId = `${Date.now()}-bot-pending`;
      setAiMessages(prev => [...prev, { id: botTempId, senderRole: 'AI', content: '...', _pending: true }]);
      
      try {
        const res = await axiosClient.post('/chat/ai/send', { message: text });
        const aiResponse = normalizeAiResponse(res.data);
        setAiMessages(prev => prev.map(m => m.id === botTempId ? { 
            id: `${Date.now()}-bot`, 
            senderRole: 'AI', 
            content: aiResponse.reply,
            movies: aiResponse.movies,
            createdAt: new Date().toISOString() 
        } : m));
      } catch (err) {
        setAiMessages(prev => prev.map(m => m.id === botTempId ? { id: `${Date.now()}-bot`, senderRole: 'AI', content: 'Xin lỗi, đã xảy ra lỗi kết nối với AI. Vui lòng thử lại!', createdAt: new Date().toISOString() } : m));
      }
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 100);
      return;
    }

    if (!connected || !userId) return;
    setSending(true);
    const tempId = `${Date.now()}-${Math.random()}`;
    const pendingMsg = {
      id: null, _pending: true, _tempId: tempId,
      conversationId: userId, senderId: userId, senderName: userName, senderRole: 'USER',
      content: text, createdAt: new Date().toISOString(),
      replyToMessageId: replyingTo?.id ?? null,
      replyToContent: replyingTo?.content ?? null,
      replyToSenderName: replyingTo?.senderName ?? null,
    };
    setAdminMessages((prev) => [...prev, pendingMsg]);
    setInputText('');
    const payload = {
      conversationId: userId, senderId: userId, senderName: userName, senderRole: 'USER', content: text,
    };
    if (replyingTo?.id) payload.replyToMessageId = replyingTo.id;
    stompClientRef.current.publish({
      destination: '/app/chat.send',
      body: JSON.stringify(payload),
    });
    setReplyingTo(null);
    setSending(false);
    inputRef.current?.focus();
  }, [inputText, connected, userId, userName, sending, replyingTo, chatMode]);


  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape' && replyingTo) {
      setReplyingTo(null);
    }
  };

  const handleOpen = () => {
    setOpen(true);
    setUnreadCount(0);
  };

  if (isStaffOrAdmin) return null;

  // ─── Render ──────────────────────────────────────────────────────────────
  const activeMessages = chatMode === 'AI' ? aiMessages : adminMessages;

  return (
    <div
      id="user-chat-widget"
      className="fixed bottom-7 right-7 z-[1000] font-sans"
    >
      {/* Chat Panel */}
      {open && (
        <div
          className="absolute bottom-[72px] right-0 flex flex-col overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] animate-[chatSlideUp_0.25s_cubic-bezier(0.34,1.56,0.64,1)] bg-white/95 dark:bg-[#141414]/95 border border-gray-200 dark:border-white/10 shadow-[0_24px_64px_rgba(0,0,0,0.15)] dark:shadow-[0_24px_64px_rgba(0,0,0,0.6)] backdrop-blur-2xl rounded-[20px]"
          style={{
            width: isExpanded ? '80vw' : '380px',
            height: isExpanded ? '80vh' : '520px',
            maxWidth: '1200px',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          {/* Header */}
          <div
            className="border-b border-gray-200 dark:border-white/10 p-[16px_20px] bg-gradient-to-br from-red-50 to-white dark:from-red-900/20 dark:to-black/20 flex items-center justify-between shrink-0"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center text-base shrink-0"
              >
                💬
              </div>
              <div>
                <div className="text-gray-900 dark:text-white text-sm font-bold">
                  Hỗ trợ khách hàng
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-500 shadow-[0_0_6px_#22c55e]' : connecting ? 'bg-amber-500' : 'bg-red-500'}`}
                  />
                  <span className="text-gray-500 dark:text-white/50 text-[11px]">
                    {connected ? 'Đang kết nối' : connecting ? 'Đang kết nối...' : 'Mất kết nối'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {connected ? (
                <Wifi size={15} className="text-green-600 dark:text-green-500" />
              ) : (
                <WifiOff size={15} className="text-red-600 dark:text-red-500" />
              )}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="bg-black/5 dark:bg-white/10 border-none rounded-lg w-8 h-8 flex items-center justify-center cursor-pointer text-gray-600 dark:text-white/70 hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-600 dark:hover:text-white transition-all"
                title={isExpanded ? "Thu nhỏ" : "Phóng to"}
              >
                {isExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="bg-black/5 dark:bg-white/10 border-none rounded-lg w-8 h-8 flex items-center justify-center cursor-pointer text-gray-600 dark:text-white/70 hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-600 dark:hover:text-white transition-all"
                title="Đóng chat"
              >
                <ChevronDown size={16} />
              </button>
            </div>
          </div>

          
          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-white/10 flex">
            <button
              onClick={() => { setChatMode('AI'); setTimeout(() => scrollToBottom(false), 50); }}
              className={`${chatMode === 'AI' ? 'text-cyan-600 dark:text-cyan-400 border-cyan-600 dark:border-cyan-400' : 'text-gray-500 dark:text-white/50 border-transparent'}`}
              style={{
                flex: 1, padding: '12px', background: 'transparent',
                borderBottomWidth: '2px', borderBottomStyle: 'solid',
                fontWeight: 600, fontSize: '13px', cursor: 'pointer', transition: 'all 0.3s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
              }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>smart_toy</span>
              Trợ lý AI
            </button>
            <button
              onClick={() => { 
                if (!isAuthenticated) {
                  setShowLoginPrompt(true);
                  return;
                }
                setChatMode('CSKH'); setTimeout(() => scrollToBottom(false), 50); 
              }}
              className={`${chatMode === 'CSKH' ? 'text-red-600 dark:text-red-500 border-red-600 dark:border-red-500' : 'text-gray-500 dark:text-white/50 border-transparent'}`}
              style={{
                flex: 1, padding: '12px', background: 'transparent',
                borderBottomWidth: '2px', borderBottomStyle: 'solid',
                fontWeight: 600, fontSize: '13px', cursor: 'pointer', transition: 'all 0.3s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
              }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>support_agent</span>
              Nhân viên CSKH
              {unreadCount > 0 && chatMode !== 'CSKH' && (
                <span className="bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded-full ml-1">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Notice Banner */}
          <div
            className="bg-red-50 dark:bg-red-900/10 border-b border-red-100 dark:border-white/5 p-[10px_16px] flex items-center gap-2 shrink-0"
          >
            <AlertCircle size={13} className="text-red-500" />
            <span className="text-red-700 dark:text-white/55 text-[11.5px] leading-tight">
              {chatMode === 'AI' ? 'Trợ lý ảo AI sẽ tự động phản hồi bạn ngay lập tức.' : 'Kênh hỗ trợ trực tuyến. Admin sẽ phản hồi trong giây lát.'}
            </span>
          </div>

          {/* Messages */}
          <div
            className="flex-1 overflow-y-auto overflow-x-hidden p-4 flex flex-col gap-4"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(255,255,255,0.1) transparent',
            }}
          >
            {activeMessages.length === 0 && (
              <div
                className="flex flex-col items-center justify-center h-full gap-3 text-gray-400 dark:text-white/30"
              >
                <MessageCircle size={40} strokeWidth={1} />
                <p className="text-[13px] text-center m-0">
                  Chưa có tin nhắn nào.<br />
                  Hãy gửi câu hỏi để được hỗ trợ.
                </p>
              </div>
            )}

            {activeMessages.map((msg, idx) => {
              const isUser = msg.senderRole === 'USER';
              const msgKey = msg.id ?? msg._tempId ?? idx;
              const time = msg.createdAt
                ? new Date(msg.createdAt.endsWith('Z') ? msg.createdAt : `${msg.createdAt}Z`).toLocaleTimeString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
                : '';

              return (
                <div
                  key={msgKey}
                  className={`flex flex-col gap-1.5 relative max-w-full ${isUser ? 'items-end' : 'items-start'}`}
                  onMouseEnter={() => setHoveredMsgId(msgKey)}
                  onMouseLeave={() => setHoveredMsgId(null)}
                >
                  {!isUser && (
                    <span className="text-white/50 text-[11px] font-semibold pl-1">
                      {chatMode === 'AI' ? 'Chatbot AI' : 'Admin'}
                    </span>
                  )}

                  {/* Row: reply button + bubble */}
                  <div
                    className={`flex items-end gap-1.5 max-w-full w-full ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {/* Reply button */}
                    {!msg._pending && chatMode === 'CSKH' && (
                      <button
                        onClick={() => {
                          setReplyingTo(msg);
                          setTimeout(() => inputRef.current?.focus(), 50);
                        }}
                        title="Trả lời tin nhắn này"
                        className="border-none rounded-full w-7 h-7 flex items-center justify-center cursor-pointer text-white/50 shrink-0 transition-all mb-1"
                        style={{
                          background: hoveredMsgId === msgKey ? 'rgba(255,255,255,0.08)' : 'transparent',
                          opacity: hoveredMsgId === msgKey ? 1 : 0,
                          pointerEvents: hoveredMsgId === msgKey ? 'auto' : 'none',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(220,38,38,0.2)';
                          e.currentTarget.style.color = '#dc2626';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                          e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
                        }}
                      >
                        <CornerUpLeft size={13} />
                      </button>
                    )}

                    {/* Message bubble */}
                    <div
                      className={`max-w-[82%] text-sm leading-[1.6] overflow-wrap-anywhere word-break-break-word whitespace-pre-wrap transition-opacity ${isUser ? 'rounded-[16px_16px_4px_16px] bg-gradient-to-br from-red-600 to-red-800 text-white shadow-xl' : 'rounded-[16px_16px_16px_4px] bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white/90 border border-gray-200 dark:border-white/5 shadow-md'}`}
                      style={{
                        padding: '10px 14px',
                        opacity: msg._pending ? 0.7 : 1,
                      }}
                    >
                      {/* Quoted block nếu là reply */}
                      {msg.replyToContent && (
                        <QuotedMessage
                          replyToSenderName={msg.replyToSenderName}
                          replyToContent={msg.replyToContent}
                          isUser={isUser}
                        />
                      )}
                      {msg._pending && chatMode === 'AI' ? (
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', height: '16px', padding: '0 4px' }}>
                          <style>
                            {`
                              @keyframes bounce {
                                0%, 100% { transform: translateY(0); }
                                50% { transform: translateY(-4px); }
                              }
                            `}
                          </style>
                          <div style={{ width: '6px', height: '6px', background: 'currentColor', borderRadius: '50%', animation: 'bounce 0.6s infinite 0s' }} />
                          <div style={{ width: '6px', height: '6px', background: 'currentColor', borderRadius: '50%', animation: 'bounce 0.6s infinite 0.15s' }} />
                          <div style={{ width: '6px', height: '6px', background: 'currentColor', borderRadius: '50%', animation: 'bounce 0.6s infinite 0.3s' }} />
                        </div>
                      ) : (
                        renderTextWithLinks(msg.content, () => setOpen(false))
                      )}

                      {/* Movie Grid cho AI Suggestions */}
                      {msg.movies && msg.movies.length > 0 && (
                        <div className="mt-3 flex flex-col gap-4">
                          {(() => {
                            const onlineMovies = msg.movies.filter(m => m.type === 'online');
                            const cinemaMovies = msg.movies.filter(m => m.type === 'now_showing' || m.type === 'upcoming');
                            return (
                              <>
                                {onlineMovies.length > 0 && (
                                  <div>
                                    <div className="mb-2">
                                      <Link to="/movies/online" onClick={() => setOpen(false)} className="inline-block text-cyan-500 hover:text-white border-2 border-transparent hover:border-white transition-all duration-300 px-3 py-1 text-[20px] font-black uppercase tracking-[2px] no-underline">PHIM TRỰC TUYẾN</Link>
                                    </div>
                                    <div className={`grid gap-2 ${isExpanded ? 'grid-cols-4' : 'grid-cols-2'}`}>
                                      {onlineMovies.map((m) => (
                                        <Link 
                                          key={m.id} 
                                          to={`/movie-details?id=${m.id}`}
                                          onClick={() => setOpen(false)}
                                          className="group no-underline cursor-pointer flex flex-col gap-1.5 min-w-0"
                                        >
                                           <div className="relative w-full aspect-[2/3] rounded-lg overflow-hidden shadow-lg">
                                              <img 
                                                  src={m.posterUrl} 
                                                  alt={m.title} 
                                                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" 
                                              />
                                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                              <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-[9px] font-black tracking-[0.5px]">
                                                 TRỰC TUYẾN
                                              </div>
                                              {m.basePrice && (
                                                <div className="absolute bottom-1 right-1 bg-black/85 p-[3px_8px] rounded-md flex flex-col items-end leading-[1.2]">
                                                  {m.salePrice < m.basePrice ? (
                                                    <>
                                                      <span className="text-[10px] text-gray-500 line-through">
                                                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(m.basePrice)}
                                                      </span>
                                                      <span className="text-[13px] font-black text-red-500">
                                                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(m.salePrice)}
                                                      </span>
                                                    </>
                                                  ) : (
                                                    <span className="text-[13px] font-black text-red-500">
                                                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(m.basePrice)}
                                                    </span>
                                                  )}
                                                </div>
                                              )}
                                           </div>
                                           <div className="min-w-0">
                                              <h4 className="text-[11px] font-bold text-gray-900 dark:text-white m-0 line-clamp-2">
                                                  {m.title}
                                              </h4>
                                              {m.genres && <p className="text-[9px] text-gray-500 dark:text-white/50 m-0 truncate">{m.genres}</p>}
                                           </div>
                                        </Link>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {cinemaMovies.length > 0 && (
                                  <div>
                                    <div className="mb-2">
                                      <Link to="/movies/now-showing" onClick={() => setOpen(false)} className="inline-block text-blue-500 hover:text-white border-2 border-transparent hover:border-white transition-all duration-300 px-3 py-1 text-[20px] font-black uppercase tracking-[2px] no-underline">PHIM CHIẾU RẠP</Link>
                                    </div>
                                    <div className={`grid gap-2 ${isExpanded ? 'grid-cols-4' : 'grid-cols-2'}`}>
                                      {cinemaMovies.map((m) => (
                                        <Link 
                                          key={m.id} 
                                          to={`/movie-details?id=${m.id}`}
                                          onClick={() => setOpen(false)}
                                          className="group no-underline cursor-pointer flex flex-col gap-1.5 min-w-0"
                                        >
                                           <div className="relative w-full aspect-[2/3] rounded-lg overflow-hidden shadow-lg">
                                              <img 
                                                  src={m.posterUrl} 
                                                  alt={m.title} 
                                                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" 
                                              />
                                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                              <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-white text-[9px] font-black tracking-[0.5px]" style={{ background: m.type === 'upcoming' ? '#f97316' : '#10b981' }}>
                                                 {m.type === 'upcoming' ? 'SẮP CHIẾU' : 'ĐANG CHIẾU'}
                                              </div>
                                           </div>
                                           <div className="min-w-0">
                                              <h4 className="text-[11px] font-bold text-white m-0 line-clamp-2">
                                                  {m.title}
                                              </h4>
                                              {m.genres && <p className="text-[9px] text-white/50 m-0 truncate">{m.genres}</p>}
                                           </div>
                                        </Link>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>

                  <span
                    className="text-[10px] text-gray-400 dark:text-white/25 px-1"
                  >
                    {msg._pending ? 'Đang gửi...' : time}
                  </span>
                </div>
              );
            })}

            {showSupportOptions && (
              <div className="flex flex-col items-start gap-1.5 animate-[chatSlideUp_0.3s_ease]">
                <span className="text-[11px] font-semibold text-gray-500 dark:text-white/50 pl-1">
                  Hệ thống hỗ trợ
                </span>
                <div
                  className="max-w-[85%] p-[12px_16px] rounded-[16px_16px_16px_4px] bg-red-50 dark:bg-white/5 text-gray-900 dark:text-white/90 text-sm leading-[1.6] shadow-md border border-red-200 dark:border-red-900/30"
                >
                  Rất xin lỗi vì vấn đề bạn gặp phải. Vui lòng cho chúng tôi biết vấn đề, chúng tôi sẽ cố gắng khắc phục sớm nhất có thể.
                </div>
                <div className="flex flex-col gap-2 mt-2 w-full pl-1">
                  {['Lỗi thanh toán không nhận được vé', 'Không thể áp dụng mã khuyến mãi', 'Vấn đề khác'].map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setShowSupportOptions(false);
                        if (opt !== 'Vấn đề khác') {
                          sendSupportMessage(opt);
                        } else {
                          setTimeout(() => inputRef.current?.focus(), 100);
                        }
                      }}
                      className="p-[8px_12px] rounded-xl bg-white dark:bg-red-900/10 border border-gray-200 dark:border-red-900/40 text-gray-700 dark:text-white text-[13px] cursor-pointer text-left transition-all w-fit hover:bg-gray-50 dark:hover:bg-red-900/25"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Reply Preview Bar */}
          <ReplyPreviewBar
            replyingTo={replyingTo}
            onCancel={() => setReplyingTo(null)}
          />

          {/* Input */}
          <div
            className="p-4 border-t border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-black/20 flex gap-2.5 items-end shrink-0"
          >
            <textarea
              ref={inputRef}
              className="bg-white dark:bg-white/5 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-white/30 border border-gray-200 dark:border-transparent focus:border-red-400 dark:focus:border-red-500/50"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={chatMode === 'AI' ? 'Hỏi AI...' : (connected ? 'Nhập tin nhắn... (Enter để gửi)' : 'Đang kết nối...')}
              disabled={chatMode === 'CSKH' && !connected}
              rows={1}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '12px',
                fontSize: '13.5px',
                lineHeight: 1.5,
                resize: 'none',
                outline: 'none',
                maxHeight: '80px',
                overflowY: 'auto',
                transition: 'border-color 0.2s',
              }}
            />
            <button
              onClick={handleSend}
              disabled={(chatMode === 'CSKH' && !connected) || !inputText.trim() || sending}
              className={`w-[42px] h-[42px] rounded-xl border-none flex items-center justify-center shrink-0 transition-all ${
                (chatMode === 'AI' || connected) && inputText.trim()
                  ? 'bg-gradient-to-br from-red-600 to-red-800 text-white shadow-[0_4px_16px_rgba(220,38,38,0.4)] cursor-pointer'
                  : 'bg-gray-200 dark:bg-white/5 text-gray-400 dark:text-white/20 cursor-not-allowed'
              }`}
              title="Gửi (Enter)"
            >
              {sending ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
            </button>
          </div>
        </div>
      )}

      {/* Floating Bubble */}
      <button
        onClick={open ? () => setOpen(false) : handleOpen}
        className={`w-[58px] h-[58px] rounded-full border-none flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] relative backdrop-blur-md cursor-pointer ${
          open 
            ? 'bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-white shadow-[0_4px_20px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)] scale-95' 
            : 'bg-gradient-to-br from-red-600 to-red-900 text-white shadow-[0_8px_32px_rgba(220,38,38,0.5),0_2px_8px_rgba(0,0,0,0.3)] scale-100 hover:scale-110'
        }`}
        style={{
          opacity: open ? 1 : (isWatchOnlinePage ? 0.4 : 1),
        }}
        onMouseEnter={(e) => {
          if (!open) e.currentTarget.style.opacity = '1';
        }}
        onMouseLeave={(e) => {
          if (!open) e.currentTarget.style.opacity = isWatchOnlinePage ? '0.4' : '1';
        }}
        title={open ? 'Đóng chat' : 'Hỗ trợ khách hàng'}
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}

        {/* Unread Badge */}
        {!open && unreadCount > 0 && (
          <div
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              minWidth: '20px',
              height: '20px',
              borderRadius: '10px',
              background: '#fff',
              color: '#dc2626',
              fontSize: '11px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
              border: '2px solid #0c0c0c',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}

        {/* Online Indicator */}
        {connected && (
          <div
            style={{
              position: 'absolute',
              bottom: '2px',
              right: '2px',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: '#22c55e',
              border: '2px solid #0c0c0c',
              boxShadow: '0 0 6px #22c55e',
            }}
          />
        )}
      </button>

      {/* Require Login Modal */}
      {showLoginPrompt && (
        <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-[toast-slide-down_300ms_ease-out]">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Yêu cầu đăng nhập</h3>
                <p className="text-[13px] text-gray-400 mt-1">
                  Vui lòng đăng nhập để có thể nhắn tin trực tiếp với Nhân viên CSKH của chúng tôi.
                </p>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button 
                onClick={() => setShowLoginPrompt(false)}
                className="px-4 py-2 rounded-xl text-[13px] font-semibold text-white bg-white/10 hover:bg-white/20 transition-all"
              >
                Để sau
              </button>
              <button 
                onClick={() => {
                  setShowLoginPrompt(false);
                  navigate('/login');
                }}
                className="px-4 py-2 rounded-xl text-[13px] font-semibold text-white bg-red-600 hover:bg-red-500 transition-all shadow-[0_0_15px_rgba(220,38,38,0.3)]"
              >
                Đăng nhập ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes chatSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
