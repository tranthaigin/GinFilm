import { useState, useEffect, useRef, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
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
  UserCircle,
  ArrowLeft
} from 'lucide-react';
import { useAuthStore } from '../../user/store/authStore';
import { chatApi } from '../api/chatApi';

import env from '../../../shared/config/env';
import useNotificationStore from '../../../shared/store/notificationStore';

const WS_URL = env.wsUrl;

// ─── ReplyPreview bar ─────────────────────────────────────────────────────────
function ReplyPreviewBar({ replyingTo, onCancel }) {
  if (!replyingTo) return null;
  return (
    <div className="p-[8px_14px] bg-red-50 dark:bg-red-900/10 border-t border-red-100 dark:border-white/5 flex items-center gap-2.5 shrink-0">
      <CornerUpLeft size={14} className="text-red-600 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[11px] text-red-600 font-semibold mb-[2px]">
          {replyingTo.senderRole === 'STAFF' ? 'Bạn' : replyingTo.senderName || 'Admin'}
        </div>
        <div className="text-[12px] text-gray-500 dark:text-white/50 overflow-hidden text-ellipsis whitespace-nowrap">
          {replyingTo.content}
        </div>
      </div>
      <button
        onClick={onCancel}
        className="bg-transparent border-none text-gray-400 dark:text-white/40 cursor-pointer p-[2px] flex items-center shrink-0 hover:text-gray-600 dark:hover:text-white/70 transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
}

// ─── Quoted block bên trong tin nhắn ─────────────────────────────────────────
function QuotedMessage({ replyToSenderName, replyToContent, isStaff }) {
  if (!replyToContent) return null;
  return (
    <div className={`border-l-[3px] pl-2 mb-1.5 opacity-75 ${isStaff ? 'border-white/30' : 'border-gray-300 dark:border-white/30'}`}>
      <div className={`text-[10px] font-bold mb-[2px] ${isStaff ? 'text-white/80' : 'text-red-600 dark:text-red-500'}`}>
        {replyToSenderName || 'Admin'}
      </div>
      <div className={`text-[12px] overflow-hidden text-ellipsis whitespace-nowrap max-w-[220px] ${isStaff ? 'text-white/70' : 'text-gray-500 dark:text-white/55'}`}>
        {replyToContent}
      </div>
    </div>
  );
}

export default function StaffChatWidget() {
  const user = useAuthStore((s) => s.user);
  
  const [open, setOpen] = useState(false);
  const [admins, setAdmins] = useState([]);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [hoveredMsgId, setHoveredMsgId] = useState(null);

  const stompClientRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const staffId = user?.id;
  const staffName = user?.fullName || user?.username || 'Nhân viên';

  // ─── Scroll to bottom ──────────────────────────────────────────────────────
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const notifications = useNotificationStore(state => state.notifications);
  const markAsRead = useNotificationStore(state => state.markAsRead);

  // ─── Load Admins ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (open && !selectedAdmin) {
      chatApi.getAdmins().then(data => {
        setAdmins(data || []);
      }).catch(err => console.error("Lỗi tải danh sách admin:", err));
    }
  }, [open, selectedAdmin]);

  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
    if (open) {
      const chatNotifs = notifications.filter(n => n.type === 'CHAT' && !n.isRead);
      chatNotifs.forEach(n => markAsRead(n.id));
    }
  }, [open, notifications, markAsRead]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // ─── Select Admin & Load Conversation ───────────────────────────────────────
  const handleSelectAdmin = async (admin) => {
    setSelectedAdmin(admin);
    setConnecting(true);
    setMessages([]);
    try {
      const res = await chatApi.getConversationId(staffId, admin.id);
      setConversationId(res.conversationId);
    } catch (error) {
      console.error("Lỗi lấy conversation ID", error);
      setConnecting(false);
    }
  };

  const handleBackToList = () => {
    setSelectedAdmin(null);
    setConversationId(null);
    if (stompClientRef.current) {
      stompClientRef.current.deactivate();
    }
    setConnected(false);
  };

  // ─── Load lịch sử và connect WebSocket ──────────────────────────────────────
  useEffect(() => {
    if (!open || !staffId || !conversationId) return;

    // Load history
    chatApi.getHistory(conversationId)
      .then((data) => setMessages(Array.isArray(data) ? data : []))
      .catch(() => {});
    chatApi.markAdminRead(conversationId).catch(() => {});
    setUnreadCount(0);
    setTimeout(() => inputRef.current?.focus(), 100);

    // Connect WebSocket
    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      reconnectDelay: 5000,
      onConnect: () => {
        setConnected(true);
        setConnecting(false);
        client.subscribe(`/topic/chat.${conversationId}`, (frame) => {
          const msg = JSON.parse(frame.body);
          setMessages((prev) => {
            if (msg.senderRole === 'STAFF') {
              const pendingIdx = prev.findIndex(
                (m) => m._pending && m._tempId && m.content === msg.content
              );
              if (pendingIdx !== -1) {
                const next = [...prev];
                next[pendingIdx] = { ...msg };
                return next;
              }
            }
            if (msg.id && prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          if (msg.senderRole === 'ADMIN') {
            setOpen((isOpen) => {
              if (!isOpen) setUnreadCount((c) => c + 1);
              else chatApi.markAdminRead(conversationId).catch(() => {});
              return isOpen;
            });
          }
        });
      },
      onDisconnect: () => {
        setConnected(false);
        setConnecting(false);
      },
      onStompError: () => {
        setConnected(false);
        setConnecting(false);
      },
    });

    client.activate();
    stompClientRef.current = client;

    return () => {
      client.deactivate();
    };
  }, [open, staffId, conversationId]);

  // ─── Gửi tin nhắn ──────────────────────────────────────────────────────
  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text || !connected || !conversationId || !selectedAdmin || sending) return;

    setSending(true);
    const tempId = `${Date.now()}-${Math.random()}`;
    const pendingMsg = {
      id: null,
      _pending: true,
      _tempId: tempId,
      conversationId: conversationId,
      senderId: staffId,
      senderName: staffName,
      senderRole: 'STAFF',
      content: text,
      createdAt: new Date().toISOString(),
      replyToMessageId: replyingTo?.id ?? null,
      replyToContent: replyingTo?.content ?? null,
      replyToSenderName: replyingTo?.senderName ?? null,
    };
    setMessages((prev) => [...prev, pendingMsg]);
    setInputText('');
    const payload = {
      conversationId: conversationId,
      senderId: staffId,
      senderName: staffName,
      senderRole: 'STAFF',
      recipientId: selectedAdmin.id,
      content: text,
    };
    if (replyingTo?.id) payload.replyToMessageId = replyingTo.id;
    stompClientRef.current.publish({
      destination: '/app/chat.send',
      body: JSON.stringify(payload),
    });
    setReplyingTo(null);
    setSending(false);
    inputRef.current?.focus();
  }, [inputText, connected, conversationId, selectedAdmin, staffId, staffName, sending, replyingTo]);

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

  if (!user) return null;

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div id="staff-chat-widget" className="fixed bottom-[28px] right-[28px] z-[9999] font-sans">
      {open && (
        <div
          className="absolute bottom-[72px] right-0 flex flex-col overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] animate-[chatSlideUp_0.25s_cubic-bezier(0.34,1.56,0.64,1)] bg-white/95 dark:bg-[#141414]/95 border border-gray-200 dark:border-white/10 shadow-[0_24px_64px_rgba(0,0,0,0.15)] dark:shadow-[0_24px_64px_rgba(0,0,0,0.6)] backdrop-blur-2xl rounded-[20px]"
          style={{ width: '380px', height: '600px' }}
        >
          {/* Header */}
          <div className="border-b border-gray-200 dark:border-white/10 p-[16px_20px] bg-gradient-to-br from-red-50 to-white dark:from-red-900/20 dark:to-black/20 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              {selectedAdmin ? (
                <button
                  onClick={handleBackToList}
                  className="w-8 h-8 rounded-full bg-red-100 dark:bg-black/20 flex items-center justify-center border-none cursor-pointer hover:bg-red-200 dark:hover:bg-white/10 transition-colors mr-1"
                >
                  <ArrowLeft size={18} className="text-red-600 dark:text-white/80" />
                </button>
              ) : (
                <div className="w-[42px] h-[42px] rounded-full bg-red-600 flex items-center justify-center shadow-lg shadow-red-600/30">
                  <MessageCircle size={22} color="#ffffff" />
                </div>
              )}
              
              <div>
                <div className="!text-black dark:!text-white text-sm font-bold">
                  {selectedAdmin ? `Chat với ${selectedAdmin.fullName || selectedAdmin.username}` : 'Hỗ trợ Admin'}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {selectedAdmin ? (
                    <>
                      {connected ? (
                        <Wifi size={15} className="text-green-600 dark:text-green-500" />
                      ) : (
                        <WifiOff size={15} className="text-red-600 dark:text-red-500" />
                      )}
                      <span className="text-gray-500 dark:text-white/50 text-[11px]">
                        {connected ? 'Đang kết nối' : connecting ? 'Đang kết nối...' : 'Mất kết nối'}
                      </span>
                    </>
                  ) : (
                    <span className="text-gray-500 dark:text-white/50 text-[11px]">Chọn Admin để bắt đầu</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setOpen(false)}
                className="bg-red-50 dark:bg-white/10 border-none rounded-lg w-8 h-8 flex items-center justify-center cursor-pointer text-red-600 dark:text-white/70 hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-700 dark:hover:text-white transition-all"
              >
                <ChevronDown size={18} />
              </button>
            </div>
          </div>

          {!selectedAdmin ? (
            /* Screen 1: Admin List */
            <div className="flex-1 overflow-y-auto p-[16px_20px] flex flex-col gap-2">
              <div className="text-[13px] font-semibold text-gray-500 dark:text-white/40 mb-2 px-1">
                Danh sách Admin
              </div>
              {admins.length === 0 ? (
                <div className="text-center text-[13px] text-gray-400 mt-10">
                  Đang tải danh sách Admin...
                </div>
              ) : (
                admins.map((admin) => (
                  <button
                    key={admin.id}
                    onClick={() => handleSelectAdmin(admin)}
                    className="flex items-center gap-3 p-[10px_14px] bg-gray-50 dark:bg-white/5 hover:bg-red-50 dark:hover:bg-red-900/20 border border-gray-100 dark:border-white/5 hover:border-red-200 dark:hover:border-red-900/50 rounded-xl cursor-pointer transition-all w-full text-left"
                  >
                    <div className="w-[36px] h-[36px] rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white shrink-0">
                      <UserCircle size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-bold !text-black dark:!text-white/90 truncate">
                        {admin.fullName || admin.username}
                      </div>
                      <div className="text-[11px] text-gray-400 dark:text-white/40">
                        Admin
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : (
            /* Screen 2: Chat Room */
            <>
              {/* Notice Banner */}
              <div className="bg-red-50 dark:bg-red-900/10 border-b border-red-100 dark:border-white/5 p-[10px_16px] flex items-center gap-2 shrink-0">
                <AlertCircle size={13} className="text-red-600 shrink-0" />
                <span className="text-red-700 dark:text-white/55 text-[11.5px] leading-tight">
                  Đây là kênh nội bộ. Chỉ {selectedAdmin.fullName || selectedAdmin.username} mới thấy tin nhắn.
                </span>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-[16px_20px] flex flex-col gap-2.5 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-white/10 scrollbar-track-transparent">
                {messages.length === 0 && !connecting && (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400 dark:text-white/30">
                    <MessageCircle size={40} strokeWidth={1} />
                    <p className="text-[13px] text-center m-0 leading-relaxed text-gray-500 dark:text-white/40">
                      Chưa có tin nhắn nào.<br />
                      Hãy nhắn tin với {selectedAdmin.fullName || selectedAdmin.username}.
                    </p>
                  </div>
                )}
                {connecting && messages.length === 0 && (
                  <div className="flex justify-center items-center h-full">
                    <Loader2 size={24} className="animate-spin text-red-500" />
                  </div>
                )}

                {messages.map((msg, index) => {
                  const isStaff = msg.senderRole === 'STAFF';
                  const msgKey = msg.id ?? msg._tempId ?? index;
                  const time = msg.createdAt
                    ? new Date(msg.createdAt.endsWith('Z') ? msg.createdAt : `${msg.createdAt}Z`).toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '';

                  return (
                    <div
                      key={msgKey}
                      className={`flex flex-col ${isStaff ? 'items-end' : 'items-start'} relative group`}
                      onMouseEnter={() => setHoveredMsgId(msgKey)}
                      onMouseLeave={() => setHoveredMsgId(null)}
                    >
                      {!isStaff && (
                        <span className="text-[10px] text-gray-400 dark:text-white/35 pl-1 mb-1">
                          {msg.senderName || 'Admin'}
                        </span>
                      )}
                      <div className={`flex items-end gap-2 ${isStaff ? 'flex-row-reverse' : 'flex-row'}`}>
                        
                        {/* Reply Button (Hiện khi hover) */}
                        {!msg._pending && (
                          <button
                            onClick={() => {
                              setReplyingTo(msg);
                              if (inputRef.current) inputRef.current.focus();
                            }}
                            title="Trả lời tin nhắn này"
                            className={`w-7 h-7 rounded-full flex items-center justify-center cursor-pointer shrink-0 transition-all duration-150 mb-4 border-none
                              ${hoveredMsgId === msgKey 
                                ? 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-white/50 opacity-100 pointer-events-auto hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20' 
                                : 'bg-transparent text-transparent opacity-0 pointer-events-none'}`}
                          >
                            <CornerUpLeft size={13} />
                          </button>
                        )}

                        {/* Message bubble */}
                        <div
                          className={`max-w-[78%] p-[10px_14px] text-[13.5px] leading-[1.5] break-words transition-opacity
                            ${msg._pending ? 'opacity-70' : 'opacity-100'}
                            ${isStaff 
                              ? 'rounded-[16px_16px_4px_16px] bg-gradient-to-br from-red-600 to-red-800 text-white shadow-md border-none' 
                              : 'rounded-[16px_16px_16px_4px] bg-gray-100 dark:bg-white/5 !text-black dark:!text-white/90 border border-gray-200 dark:border-white/5 shadow-sm'
                            }`}
                        >
                          {/* Quoted block */}
                          {msg.replyToContent && (
                            <QuotedMessage
                              replyToSenderName={msg.replyToSenderName}
                              replyToContent={msg.replyToContent}
                              isStaff={isStaff}
                            />
                          )}
                          {msg.content}
                        </div>
                      </div>

                      <span className={`text-[10px] text-gray-400 dark:text-white/25 mt-1 ${isStaff ? 'pr-1' : 'pl-1'}`}>
                        {msg._pending ? 'Đang gửi...' : time}
                      </span>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply Preview Bar */}
              <ReplyPreviewBar
                replyingTo={replyingTo}
                onCancel={() => setReplyingTo(null)}
              />

              {/* Input */}
              <div className="p-4 border-t border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-black/20 flex gap-2.5 items-end shrink-0">
                <textarea
                  ref={inputRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={connected ? 'Nhập tin nhắn... (Enter để gửi)' : 'Đang kết nối...'}
                  disabled={!connected}
                  rows={1}
                  className="flex-1 bg-white dark:bg-white/5 !text-black dark:!text-white placeholder-gray-500 dark:placeholder-white/30 border border-gray-200 dark:border-transparent focus:border-red-400 dark:focus:border-red-500/50 rounded-xl p-[10px_14px] text-[13.5px] resize-none outline-none font-sans leading-relaxed max-h-[80px] overflow-y-auto transition-colors duration-200 shadow-sm"
                />
                <button
                  onClick={handleSend}
                  disabled={!connected || !inputText.trim() || sending}
                  className={`w-[42px] h-[42px] rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 border-none
                    ${connected && inputText.trim()
                      ? 'bg-gradient-to-br from-red-600 to-red-800 text-white cursor-pointer shadow-md shadow-red-600/20'
                      : 'bg-red-50 dark:bg-white/5 text-red-300 dark:text-white/20 cursor-not-allowed'
                    }`}
                  title="Gửi (Enter)"
                >
                  {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Floating Bubble */}
      <button
        onClick={open ? () => setOpen(false) : handleOpen}
        className={`w-[58px] h-[58px] rounded-full border-none flex items-center justify-center cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] relative
          ${open 
            ? 'bg-gray-200 dark:bg-white/10 !text-black dark:!text-white shadow-[0_4px_20px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)] scale-95' 
            : 'bg-gradient-to-br from-red-600 to-red-800 text-white shadow-[0_8px_32px_rgba(220,38,38,0.3),0_2px_8px_rgba(0,0,0,0.1)] dark:shadow-[0_8px_32px_rgba(220,38,38,0.5),0_2px_8px_rgba(0,0,0,0.3)] hover:scale-110'
          }`}
        title={open ? 'Đóng chat' : 'Chat với Admin'}
      >
        {open ? <X size={22} color="#ffffff" /> : <MessageCircle size={22} color="#ffffff" />}

        {/* Unread Badge (Not highly accurate with multiple admins, but keeping UI) */}
        {!open && unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 min-w-[20px] h-[20px] rounded-full bg-white text-red-600 text-[11px] font-black flex items-center justify-center px-1 shadow-md border-2 border-[#0c0c0c]">
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}

        {/* Online Indicator */}
        {connected && (
          <div className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white dark:border-[#0c0c0c] shadow-[0_0_6px_#22c55e]" />
        )}
      </button>

      {/* CSS Animations */}
      <style>{`
        @keyframes chatSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
      `}</style>
    </div>
  );
}
