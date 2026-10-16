import {
  useState,
  useEffect,
  useEffectEvent,
  useRef,
  useCallback,
} from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import {
  MessageCircle,
  Send,
  Users,
  Loader2,
  Clock,
  CheckCheck,
  AlertCircle,
  Mail,
  X,
  CornerUpLeft,
  AlertTriangle,
} from 'lucide-react';
import useNotificationStore from '../../../shared/store/notificationStore';

// ─── ReplyPreviewBar ──────────────────────────────────────────────────────────
function ReplyPreviewBar({ replyingTo, onCancel }) {
  if (!replyingTo) return null;
  return (
    <div
      style={{
        padding: '8px 16px',
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
        <div
          style={{
            fontSize: '11px',
            color: '#dc2626',
            fontWeight: 600,
            marginBottom: '2px',
          }}
        >
          {replyingTo.senderRole === 'ADMIN'
            ? 'Bạn'
            : replyingTo.senderName || 'Người dùng'}
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

// ─── QuotedMessage bên trong bubble ──────────────────────────────────────────
function QuotedMessage({ replyToSenderName, replyToContent, isAdmin }) {
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
      <div
        style={{
          fontSize: '10px',
          fontWeight: 700,
          color: isAdmin ? 'rgba(255,255,255,0.8)' : '#dc2626',
          marginBottom: '2px',
        }}
      >
        {replyToSenderName || 'Người dùng'}
      </div>
      <div
        style={{
          fontSize: '12px',
          color: isAdmin ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.55)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: '300px',
        }}
      >
        {replyToContent}
      </div>
    </div>
  );
}
import { useAuthStore } from '../../user/store/authStore';
import { chatApi } from '../../staff/api/chatApi';
import { employeeApi } from '../api/employeeApi';

import env from '../../../shared/config/env';

const WS_URL = env.wsUrl;

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr.endsWith('Z') ? dateStr : `${dateStr}Z`);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Vừa xong';
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffMins < 1440)
    return d.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

function formatFullTime(dateStr) {
  if (!dateStr) return '';
  return new Date(
    dateStr.endsWith('Z') ? dateStr : `${dateStr}Z`
  ).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export default function AdminChatPage() {
  const user = useAuthStore((s) => s.user);
  const adminId = user?.id;
  const adminName = user?.fullName || user?.username || 'Admin';

  const [activeTab, setActiveTab] = useState('USER');
  const [conversations, setConversations] = useState([]);
  const [selectedConvId, setSelectedConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [connected, setConnected] = useState(false);
  const [search] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [unreadMap, setUnreadMap] = useState({});
  const [replyingTo, setReplyingTo] = useState(null);
  const [hoveredMsgId, setHoveredMsgId] = useState(null);
  const [assignmentMap, setAssignmentMap] = useState({}); // { [convId]: { assignedAdminId, assignedAdminName } }
  const processedMsgIds = useRef(new Set());

  const selectedConvIdRef = useRef(selectedConvId);
  useEffect(() => {
    selectedConvIdRef.current = selectedConvId;
  }, [selectedConvId]);

  // ─── Gửi Email State ──────────────────────────────────────────────────────
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [staffList, setStaffList] = useState([]);
  const [emailForm, setEmailForm] = useState({
    staffId: '',
    subject: '',
    content: '',
  });
  const [sendingEmail, setSendingEmail] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const stompClientRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const notifications = useNotificationStore((state) => state.notifications);
  const markAsRead = useNotificationStore((state) => state.markAsRead);

  useEffect(() => {
    const chatNotifs = notifications.filter(
      (n) => n.type === 'CHAT' && !n.isRead
    );
    chatNotifs.forEach((n) => markAsRead(n.id));
  }, [notifications, markAsRead]);

  // ─── Load danh sách conversations ─────────────────────────────────────────
  const loadConversations = useCallback(() => {
    chatApi
      .getConversations(adminId)
      .then((data) => {
        const list = Array.isArray(data) ? data : [];

        // Lọc bỏ các conversation cũ hơn thời điểm admin đăng xuất lần cuối
        // Conversation sẽ hiện lại khi khách hàng nhắn tin mới
        const adminLogoutAt = localStorage.getItem('adminLogoutAt');
        const filteredList = adminLogoutAt
          ? list.filter((msg) => {
              const msgTime = msg.createdAt
                ? new Date(
                    msg.createdAt.endsWith('Z')
                      ? msg.createdAt
                      : `${msg.createdAt}Z`
                  ).getTime()
                : 0;
              const logoutTime = new Date(adminLogoutAt).getTime();
              return msgTime > logoutTime;
            })
          : list;

        setConversations(filteredList);
        const map = {};
        filteredList.forEach((msg) => {
          if (msg.unreadCount > 0) {
            map[msg.conversationId] = msg.unreadCount;
          }
        });
        setUnreadMap(map);
      })
      .catch(() => {});
  }, [adminId]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // ─── Load assignments ─────────────────────────────────────────────────────
  useEffect(() => {
    chatApi
      .getAssignments()
      .then((data) => {
        if (Array.isArray(data)) {
          const map = {};
          data.forEach((a) => {
            map[a.conversationId] = {
              assignedAdminId: a.assignedAdminId,
              assignedAdminName: a.assignedAdminName,
            };
          });
          setAssignmentMap(map);
        }
      })
      .catch(() => {});
  }, []);

  // ─── WebSocket connect ───────────────────────────────────────────────────
  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      reconnectDelay: 5000,
      onConnect: () => {
        setConnected(true);
        // Admin subscribe kênh tổng
        const receiveChat = (frame) => {
          const msg = JSON.parse(frame.body);

          if (msg.id) {
            if (processedMsgIds.current.has(msg.id)) return;
            processedMsgIds.current.add(msg.id);
          }

          // ─── Xử lý sự kiện Assignment (tiếp nhận/hủy nhận) ─────────────
          if (msg.type === 'ASSIGNMENT_UPDATE') {
            const convId = msg.conversationId;
            if (msg.action === 'ASSIGNED') {
              setAssignmentMap((prev) => ({
                ...prev,
                [convId]: {
                  assignedAdminId: msg.assignedAdminId,
                  assignedAdminName: msg.assignedAdminName,
                },
              }));
            } else if (msg.action === 'UNASSIGNED') {
              setAssignmentMap((prev) => {
                const next = { ...prev };
                delete next[convId];
                return next;
              });
            }
            return; // Không xử lý tiếp như tin nhắn thông thường
          }

          // Cập nhật conversation list (tin mới nhất)
          setConversations((prev) => {
            const exists = prev.find(
              (c) => c.conversationId === msg.conversationId
            );
            if (exists) {
              return prev.map((c) =>
                c.conversationId === msg.conversationId
                  ? {
                      ...msg,
                      participantRole: c.participantRole,
                      participantName: c.participantName,
                    }
                  : c
              );
            }
            // Nếu là hội thoại mới — xóa adminLogoutAt để conversation hiện ra
            localStorage.removeItem('adminLogoutAt');
            const newConv = { ...msg };
            if (!newConv.participantRole) {
              newConv.participantRole =
                msg.senderRole !== 'ADMIN' ? msg.senderRole : 'USER';
              newConv.participantName =
                msg.senderRole !== 'ADMIN' ? msg.senderName : 'Khách hàng';
            }
            return [newConv, ...prev];
          });

          // Append tin vào messages panel (bất kể admin hay user/staff)
          const currentConvId = selectedConvIdRef.current;
          if (currentConvId === msg.conversationId) {
            setMessages((prev) => {
              // Nếu là tin admin tự gửi → replace pending bằng _tempId
              if (msg.senderRole === 'ADMIN') {
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
            // Đánh dấu đã đọc nếu tin từ staff/user
            if (msg.senderRole !== 'ADMIN') {
              chatApi.markStaffRead(msg.conversationId).catch(() => {});
            }
          } else {
            // Tăng unread nếu tin từ staff/user và không đang xem
            if (msg.senderRole !== 'ADMIN') {
              setUnreadMap((prev) => ({
                ...prev,
                [msg.conversationId]: (prev[msg.conversationId] || 0) + 1,
              }));
              // Dispatch CustomEvent để AdminSidebar cập nhật badge real-time
              window.dispatchEvent(
                new CustomEvent('chatUnreadUpdate', {
                  detail: { increment: 1 },
                })
              );
            }
          }
        };
        client.subscribe('/topic/chat.admin', receiveChat);
        if (adminId)
          client.subscribe(`/topic/chat.admin.${adminId}`, receiveChat);
      },
      onDisconnect: () => setConnected(false),
      onStompError: () => setConnected(false),
    });

    client.activate();
    stompClientRef.current = client;
    return () => client.deactivate();
  }, [adminId]);

  // ─── Load history khi chọn conversation ──────────────────────────────────
  const requestKey201 = JSON.stringify([selectedConvId]);
  const [previousRequestKey201, setPreviousRequestKey201] = useState(null);
  if (previousRequestKey201 !== requestKey201) {
    setPreviousRequestKey201(requestKey201);
    setLoadingHistory(Boolean(selectedConvId));
    setMessages([]);
  }

  const acknowledgeConversation = useEffectEvent((id) => {
    const count = unreadMap[id] || 0;
    setUnreadMap((previous) => ({ ...previous, [id]: 0 }));
    if (count > 0)
      window.dispatchEvent(
        new CustomEvent('chatUnreadUpdate', { detail: { decrement: count } })
      );
  });

  useEffect(() => {
    if (!selectedConvId) return;
    let active = true;

    chatApi
      .getHistory(selectedConvId)
      .then((data) => {
        if (!active) return;
        setMessages(Array.isArray(data) ? data : []);
        setLoadingHistory(false);
      })
      .catch(() => {
        if (active) setLoadingHistory(false);
      });

    // Đánh dấu đã đọc
    chatApi
      .markStaffRead(selectedConvId)
      .then(() => {
        if (active) acknowledgeConversation(selectedConvId);
      })
      .catch(() => {});
    const focusTimer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => {
      active = false;
      clearTimeout(focusTimer);
    };
  }, [selectedConvId]);

  // ─── Email to Staff ────────────────────────────────────────────────────────
  const fetchStaffList = async () => {
    try {
      const data = await employeeApi.fetchEmployees();
      setStaffList(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch staff list:', error);
    }
  };

  const handleOpenEmailModal = () => {
    setShowEmailModal(true);
    fetchStaffList();
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!emailForm.staffId || !emailForm.subject || !emailForm.content) return;

    setSendingEmail(true);
    try {
      await employeeApi.sendEmailToStaff(emailForm);
      setToastMessage('Gửi email thành công!');
      setShowEmailModal(false);
      setEmailForm({ staffId: '', subject: '', content: '' });
      setTimeout(() => setToastMessage(null), 3000);
    } catch (error) {
      alert(
        'Gửi email thất bại: ' +
          (error.response?.data?.message || error.message)
      );
    } finally {
      setSendingEmail(false);
    }
  };

  // ─── Gửi reply ──────────────────────────────────────────────────────────
  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text || !connected || !selectedConvId || !adminId || sending) return;

    setSending(true);
    const tempId = `${Date.now()}-${Math.random()}`;
    // Optimistic UI: append tin ngay lập tức với trạng thái pending
    const pendingMsg = {
      id: null,
      _pending: true,
      _tempId: tempId,
      conversationId: selectedConvId,
      senderId: adminId,
      senderName: adminName,
      senderRole: 'ADMIN',
      content: text,
      createdAt: new Date().toISOString(),
      isRead: false,
      replyToMessageId: replyingTo?.id ?? null,
      replyToContent: replyingTo?.content ?? null,
      replyToSenderName: replyingTo?.senderName ?? null,
    };
    setMessages((prev) => [...prev, pendingMsg]);
    setInputText('');
    const payload = {
      conversationId: selectedConvId,
      senderId: adminId,
      senderName: adminName,
      senderRole: 'ADMIN',
      content: text,
    };
    if (replyingTo?.id) payload.replyToMessageId = replyingTo.id;
    stompClientRef.current.publish({
      destination: '/app/chat.reply',
      body: JSON.stringify(payload),
    });
    setReplyingTo(null);
    setSending(false);
    inputRef.current?.focus();
  }, [
    inputText,
    connected,
    selectedConvId,
    adminId,
    adminName,
    sending,
    replyingTo,
  ]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape' && replyingTo) {
      setReplyingTo(null);
    }
  };

  const handleAssign = async () => {
    if (!selectedConvId) return;
    try {
      await chatApi.assignConversation(selectedConvId, adminId, adminName);
    } catch (error) {
      if (error.response?.status === 409) {
        alert('Conversation đã được admin khác tiếp nhận.');
      }
    }
  };

  const handleUnassign = async () => {
    if (!selectedConvId) return;
    try {
      await chatApi.unassignConversation(selectedConvId, adminId);
    } catch (error) {
      console.error('Failed to unassign:', error);
    }
  };

  const filteredConversations = conversations.filter((c) => {
    const matchRole = c.participantRole === activeTab;
    const matchSearch =
      (c.participantName || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.conversationId || '')
        .toString()
        .toLowerCase()
        .includes(search.toLowerCase());
    return matchRole && matchSearch;
  });

  const unreadUserCount = conversations
    .filter(
      (c) =>
        c.participantRole === 'USER' ||
        (c.participantRole !== 'STAFF' && c.participantRole !== 'ADMIN')
    )
    .reduce((sum, c) => sum + (unreadMap[c.conversationId] || 0), 0);

  const unreadStaffCount = conversations
    .filter((c) => c.participantRole === 'STAFF')
    .reduce((sum, c) => sum + (unreadMap[c.conversationId] || 0), 0);

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        display: 'flex',
        height: 'calc(100vh - 72px - 56px)',
        gap: 0,
        borderRadius: '16px',
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.06)',
        background: '#111',
        fontFamily: '"Inter", sans-serif',
      }}
    >
      {/* ─── Left: Conversations Sidebar ──────────────────────────────── */}
      <div
        style={{
          width: '320px',
          minWidth: '320px',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          flexDirection: 'column',
          background: '#0e0e0e',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 16px 12px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background:
                    'linear-gradient(135deg, rgba(220,38,38,0.25), rgba(139,0,50,0.2))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Users size={18} color="#dc2626" />
              </div>
              <div>
                <div
                  style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}
                >
                  Tin nhắn
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    color: 'rgba(255,255,255,0.35)',
                    marginTop: '1px',
                  }}
                >
                  {
                    conversations.filter((c) => c.participantRole === activeTab)
                      .length
                  }{' '}
                  hội thoại
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={handleOpenEmailModal}
                style={{
                  background:
                    'linear-gradient(135deg, #dc2626 0%, #c01f45 100%)',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(220,38,38,0.3)',
                  transition: 'all 0.2s ease',
                }}
                title="Gửi Email giao việc cho Nhân viên"
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow =
                    '0 6px 16px rgba(220,38,38,0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow =
                    '0 4px 12px rgba(220,38,38,0.3)';
                }}
              >
                <Mail size={16} />
                <span>Giao việc</span>
              </button>
            </div>
          </div>

          {/* Search bar removed as requested */}
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '4px', marginTop: '12px' }}>
            <button
              onClick={() => setActiveTab('USER')}
              style={{
                flex: 1,
                padding: '8px 0',
                border: 'none',
                borderRadius: '8px',
                background:
                  activeTab === 'USER'
                    ? 'rgba(255,255,255,0.1)'
                    : 'transparent',
                color: activeTab === 'USER' ? '#fff' : 'rgba(255,255,255,0.5)',
                fontSize: '13px',
                fontWeight: activeTab === 'USER' ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                Khách hàng
                {unreadUserCount > 0 && (
                  <span
                    style={{
                      background: '#dc2626',
                      color: '#fff',
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '10px',
                    }}
                  >
                    {unreadUserCount > 99 ? '99+' : unreadUserCount}
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('STAFF')}
              style={{
                flex: 1,
                padding: '8px 0',
                border: 'none',
                borderRadius: '8px',
                background:
                  activeTab === 'STAFF'
                    ? 'rgba(255,255,255,0.1)'
                    : 'transparent',
                color: activeTab === 'STAFF' ? '#fff' : 'rgba(255,255,255,0.5)',
                fontSize: '13px',
                fontWeight: activeTab === 'STAFF' ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                Nhân viên
                {unreadStaffCount > 0 && (
                  <span
                    style={{
                      background: '#dc2626',
                      color: '#fff',
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '10px',
                    }}
                  >
                    {unreadStaffCount > 99 ? '99+' : unreadStaffCount}
                  </span>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Conversation List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {filteredConversations.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '200px',
                color: 'rgba(255,255,255,0.25)',
                gap: '10px',
              }}
            >
              <MessageCircle size={36} strokeWidth={1} />
              <span style={{ fontSize: '12px' }}>Chưa có tin nhắn nào</span>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = selectedConvId === conv.conversationId;
              const unread = unreadMap[conv.conversationId] || 0;
              const displayName =
                conv.participantName ||
                `ID-${conv.conversationId?.toString().slice(0, 8)}`;
              const isStaff = conv.participantRole === 'STAFF';
              const assignment = isStaff
                ? null
                : assignmentMap[conv.conversationId?.toString()];
              const isAssignedToMe =
                assignment &&
                assignment.assignedAdminId === adminId?.toString();
              const isAssignedToOther = assignment && !isAssignedToMe;

              return (
                <button
                  key={conv.conversationId}
                  onClick={() => setSelectedConvId(conv.conversationId)}
                  className={`w-full p-[12px_14px] rounded-[12px] border-none text-left flex items-center gap-[12px] transition-all duration-150 border-l-[3px] box-border mb-[2px] ${
                    isSelected
                      ? 'bg-[linear-gradient(135deg,rgba(220,38,38,0.15),rgba(139,0,50,0.1))] border-l-[#dc2626]'
                      : 'bg-transparent border-l-transparent hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full text-[16px] font-bold !text-white relative shadow-sm"
                    style={{
                      background: `hsl(${Math.abs(conv.conversationId?.toString().charCodeAt(0) * 31) % 360}, 60%, 40%)`,
                    }}
                  >
                    {(displayName || 'N')[0].toUpperCase()}
                    {/* Online dot placeholder */}
                    <div className="absolute bottom-[1px] right-[1px] w-[10px] h-[10px] rounded-full bg-[#22c55e] border-2 border-white dark:border-[#0c0c0c]" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-[3px]">
                      <span
                        className={`text-[13.5px] overflow-hidden text-ellipsis whitespace-nowrap ${unread > 0 ? 'font-bold text-black dark:text-white' : 'font-medium text-gray-700 dark:text-white/80'}`}
                      >
                        {displayName}
                      </span>
                      <span className="text-[10px] text-gray-500 dark:text-white/30 shrink-0">
                        {formatTime(conv.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[12px] overflow-hidden text-ellipsis whitespace-nowrap max-w-[180px] ${unread > 0 ? 'font-semibold text-gray-800 dark:text-white/60' : 'font-normal text-gray-500 dark:text-white/35'}`}
                      >
                        {conv.senderRole === 'ADMIN' ? '↩ Bạn: ' : ''}
                        {conv.content}
                      </span>
                      {/* Assignment badge */}
                      {isAssignedToMe && (
                        <span
                          style={{
                            fontSize: '9px',
                            fontWeight: 700,
                            color: '#22c55e',
                            background: 'rgba(34,197,94,0.12)',
                            borderRadius: '6px',
                            padding: '2px 6px',
                            flexShrink: 0,
                            marginLeft: '4px',
                          }}
                        >
                          ✓ Của bạn
                        </span>
                      )}
                      {isAssignedToOther && (
                        <span
                          style={{
                            fontSize: '9px',
                            fontWeight: 600,
                            color: '#f59e0b',
                            background: 'rgba(245,158,11,0.12)',
                            borderRadius: '6px',
                            padding: '2px 6px',
                            flexShrink: 0,
                            marginLeft: '4px',
                            maxWidth: '80px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={`${assignment.assignedAdminName} đang xử lý`}
                        >
                          🔒 {assignment.assignedAdminName}
                        </span>
                      )}
                      {!assignment && unread > 0 && (
                        <span className="min-w-[20px] h-[20px] rounded-[10px] bg-[#dc2626] text-white text-[11px] font-bold flex items-center justify-center px-[5px] shrink-0">
                          {unread > 99 ? '99+' : unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ─── Email Modal ──────────────────────────────────────────────────────── */}
      {showEmailModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            style={{
              background: '#111',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '16px',
              padding: '24px',
              width: '480px',
              maxWidth: '90%',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              fontFamily: '"Inter", sans-serif',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '24px',
              }}
            >
              <h3
                style={{
                  margin: 0,
                  color: '#fff',
                  fontSize: '18px',
                  fontWeight: 600,
                }}
              >
                Gửi Email cho Nhân viên
              </h3>
              <button
                onClick={() => setShowEmailModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.5)',
                  cursor: 'pointer',
                }}
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSendEmail}
              style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: '13px',
                  }}
                >
                  Nhân viên
                </label>
                <select
                  value={emailForm.staffId}
                  onChange={(e) =>
                    setEmailForm({ ...emailForm, staffId: e.target.value })
                  }
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    outline: 'none',
                    fontSize: '14px',
                  }}
                  required
                >
                  <option value="" disabled style={{ color: '#000' }}>
                    -- Chọn nhân viên --
                  </option>
                  {staffList.map((staff) => (
                    <option
                      key={staff.id}
                      value={staff.id}
                      style={{ color: '#000' }}
                    >
                      {staff.fullName} ({staff.username})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: '13px',
                  }}
                >
                  Chủ đề
                </label>
                <input
                  type="text"
                  value={emailForm.subject}
                  onChange={(e) =>
                    setEmailForm({ ...emailForm, subject: e.target.value })
                  }
                  placeholder="Nhập chủ đề email..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    outline: 'none',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                  required
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: '13px',
                  }}
                >
                  Nội dung
                </label>
                <textarea
                  value={emailForm.content}
                  onChange={(e) =>
                    setEmailForm({ ...emailForm, content: e.target.value })
                  }
                  placeholder="Nhập nội dung email..."
                  rows={5}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    outline: 'none',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                  }}
                  required
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px',
                  marginTop: '8px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.1)',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={sendingEmail}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    background: '#dc2626',
                    color: '#fff',
                    border: 'none',
                    cursor: sendingEmail ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  {sendingEmail ? (
                    <Loader2 size={16} className="spin" />
                  ) : (
                    <Send size={16} />
                  )}
                  {sendingEmail ? 'Đang gửi...' : 'Gửi Email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: '#22c55e',
            color: '#fff',
            padding: '12px 24px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            zIndex: 9999,
            fontWeight: 500,
            fontSize: '14px',
          }}
        >
          <CheckCheck size={18} />
          {toastMessage}
        </div>
      )}

      {/* ─── Right: Chat Panel ─────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
        }}
      >
        {selectedConvId ? (
          <>
            {/* Chat Header */}
            <div className="p-[16px_24px] border-b border-black/5 dark:border-white/5 flex items-center gap-[14px] bg-white dark:bg-black/20 shrink-0">
              {(() => {
                const conv = conversations.find(
                  (c) => c.conversationId === selectedConvId
                );
                const displayName =
                  conv?.participantName ||
                  `ID-${selectedConvId?.toString().slice(0, 8)}`;
                const isStaff = conv?.participantRole === 'STAFF';
                const roleName = isStaff ? 'Nhân viên' : 'Khách hàng';

                const assignment = isStaff
                  ? null
                  : assignmentMap[selectedConvId?.toString()];
                const isAssignedToMe =
                  assignment &&
                  assignment.assignedAdminId === adminId?.toString();

                return (
                  <>
                    <div
                      className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full text-[18px] font-bold !text-white"
                      style={{
                        background: `hsl(${Math.abs((selectedConvId || '').charCodeAt(0) * 31) % 360}, 60%, 40%)`,
                      }}
                    >
                      {(displayName || 'N')[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="text-[15px] font-bold text-black dark:text-white">
                        {displayName}
                      </div>
                      <div className="text-[11px] text-gray-500 dark:text-white/40 mt-[2px]">
                        {roleName}
                      </div>
                    </div>

                    <div className="ml-auto flex items-center gap-[12px]">
                      {/* Assignment actions */}
                      {!assignment && !isStaff && (
                        <button
                          onClick={handleAssign}
                          className="bg-red-600 hover:bg-red-700 text-white border-none px-[14px] py-[6px] rounded-[8px] text-[13px] font-semibold cursor-pointer transition-colors"
                        >
                          Tiếp nhận xử lý
                        </button>
                      )}
                      {isAssignedToMe && !isStaff && (
                        <button
                          onClick={handleUnassign}
                          className="bg-transparent border border-gray-300 dark:border-white/20 text-gray-600 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/10 px-[12px] py-[6px] rounded-[8px] text-[13px] font-semibold cursor-pointer transition-colors"
                        >
                          Bỏ tiếp nhận
                        </button>
                      )}

                      <div className="flex items-center gap-[6px] pl-[12px] border-l border-gray-200 dark:border-white/10">
                        <AlertCircle
                          size={13}
                          className="text-gray-400 dark:text-white/30"
                        />
                        <span className="text-[11px] text-gray-400 dark:text-white/30">
                          Kênh nội bộ
                        </span>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Content Logic based on Assignment */}
            {(() => {
              const conv = conversations.find(
                (c) => c.conversationId === selectedConvId
              );
              const isStaff = conv?.participantRole === 'STAFF';
              const assignment = isStaff
                ? null
                : assignmentMap[selectedConvId?.toString()];
              const isAssignedToMe =
                assignment &&
                assignment.assignedAdminId === adminId?.toString();
              const isAssignedToOther = assignment && !isAssignedToMe;

              if (isAssignedToOther) {
                return (
                  <div className="flex-1 flex flex-col items-center justify-center gap-[12px] text-gray-500 dark:text-white/40 p-[24px]">
                    <div className="w-[64px] h-[64px] rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 mb-[8px]">
                      <AlertTriangle size={32} />
                    </div>
                    <p className="text-[15px] font-medium text-center m-0">
                      Cuộc hội thoại này đang được xử lý bởi{' '}
                      <strong className="text-orange-500">
                        {assignment.assignedAdminName}
                      </strong>
                      .
                    </p>
                    <p className="text-[13px] opacity-70 text-center m-0 max-w-[400px]">
                      Chỉ admin tiếp nhận mới có thể xem tin nhắn và gửi phản
                      hồi. Hãy đợi {assignment.assignedAdminName} bỏ tiếp nhận
                      nếu bạn muốn xử lý.
                    </p>
                  </div>
                );
              }

              if (!assignment && !isStaff) {
                return (
                  <div className="flex-1 flex flex-col items-center justify-center gap-[12px] text-gray-500 dark:text-white/40 p-[24px]">
                    <div className="w-[64px] h-[64px] rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-[8px]">
                      <MessageCircle size={32} />
                    </div>
                    <p className="text-[15px] font-medium text-center m-0">
                      Vui lòng <strong>Tiếp nhận xử lý</strong> để xem nội dung
                      chat.
                    </p>
                    <p className="text-[13px] opacity-70 text-center m-0">
                      Bạn phải tiếp nhận cuộc hội thoại này để có thể đọc tin
                      nhắn cũ và trả lời khách hàng.
                    </p>
                  </div>
                );
              }

              // isAssignedToMe === true
              return (
                <>
                  {/* Messages */}
                  <div
                    style={{
                      flex: 1,
                      overflowY: 'auto',
                      padding: '24px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      scrollbarWidth: 'thin',
                      scrollbarColor: 'rgba(255,255,255,0.08) transparent',
                    }}
                  >
                    {loadingHistory ? (
                      <div className="flex items-center justify-center h-full gap-[10px] text-gray-500 dark:text-white/40">
                        <Loader2
                          size={20}
                          className="animate-[adminChatSpin_1s_linear_infinite]"
                        />
                        <span className="text-[13px]">Đang tải lịch sử...</span>
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full gap-[12px] text-gray-400 dark:text-white/20">
                        <MessageCircle size={48} strokeWidth={1} />
                        <p className="text-[13px] text-center m-0">
                          Chưa có tin nhắn nào trong cuộc hội thoại này.
                        </p>
                      </div>
                    ) : (
                      messages.map((msg, idx) => {
                        const isAdmin = msg.senderRole === 'ADMIN';
                        const msgKey = msg.id ?? msg._tempId ?? idx;
                        return (
                          <div
                            key={msgKey}
                            className={`flex flex-col gap-[4px] relative ${isAdmin ? 'items-end' : 'items-start'}`}
                            onMouseEnter={() => setHoveredMsgId(msgKey)}
                            onMouseLeave={() => setHoveredMsgId(null)}
                          >
                            {!isAdmin && (
                              <span className="text-[11px] text-gray-500 dark:text-white/35 pl-[4px]">
                                {msg.senderName}
                              </span>
                            )}

                            {/* Row: reply button + bubble */}
                            <div
                              className={`flex items-end gap-[6px] max-w-full ${isAdmin ? 'flex-row-reverse' : 'flex-row'}`}
                            >
                              {/* Reply button (luôn render để tránh layout shift, ẩn/hiện bằng opacity) */}
                              {!msg._pending && (
                                <button
                                  onClick={() => {
                                    setReplyingTo(msg);
                                    setTimeout(
                                      () => inputRef.current?.focus(),
                                      50
                                    );
                                  }}
                                  title="Trả lời tin nhắn này"
                                  className={`border-none rounded-full w-[28px] h-[28px] flex items-center justify-center cursor-pointer shrink-0 transition-all duration-150 mb-[20px] ${
                                    hoveredMsgId === msgKey
                                      ? 'opacity-100 pointer-events-auto bg-black/5 dark:bg-white/10 text-gray-500 dark:text-white/50 hover:!bg-red-500/20 hover:!text-red-600'
                                      : 'opacity-0 pointer-events-none bg-transparent text-gray-400 dark:text-white/30'
                                  }`}
                                >
                                  <CornerUpLeft size={13} />
                                </button>
                              )}

                              {/* Message bubble */}
                              <div
                                className={`max-w-[65%] p-[12px_16px] text-[14px] leading-[1.55] break-words transition-opacity duration-200 ${
                                  isAdmin
                                    ? 'rounded-[18px_18px_4px_18px] bg-[linear-gradient(135deg,#dc2626_0%,#c01f45_100%)] text-white shadow-[0_4px_20px_rgba(220,38,38,0.3)] border-none'
                                    : 'rounded-[18px_18px_18px_4px] bg-gray-100 dark:bg-white/5 text-gray-800 dark:text-white/90 shadow-[0_2px_10px_rgba(0,0,0,0.05)] dark:shadow-[0_2px_10px_rgba(0,0,0,0.25)] border border-gray-200 dark:border-white/10'
                                }`}
                                style={{
                                  opacity: msg._pending ? 0.7 : 1,
                                }}
                              >
                                {/* Quoted block nếu là reply */}
                                {msg.replyToContent && (
                                  <QuotedMessage
                                    replyToSenderName={msg.replyToSenderName}
                                    replyToContent={msg.replyToContent}
                                    isAdmin={isAdmin}
                                  />
                                )}
                                {msg.content}
                              </div>
                            </div>

                            <div
                              className={`flex items-center gap-[4px] ${isAdmin ? 'pr-[4px]' : 'pl-[4px]'}`}
                            >
                              <Clock
                                size={10}
                                className="text-gray-400 dark:text-white/20"
                              />
                              <span className="text-[10px] text-gray-500 dark:text-white/30">
                                {msg._pending
                                  ? 'Đang gửi...'
                                  : formatFullTime(msg.createdAt)}
                              </span>
                              {isAdmin && msg.isRead && (
                                <CheckCheck
                                  size={12}
                                  className="text-[#22c55e]"
                                />
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Reply Preview Bar */}
                  <ReplyPreviewBar
                    replyingTo={replyingTo}
                    onCancel={() => setReplyingTo(null)}
                  />

                  {/* Input */}
                  <div className="p-[16px_24px] border-t border-black/5 dark:border-white/5 flex gap-[12px] items-end bg-white dark:bg-black/20 shrink-0">
                    <textarea
                      ref={inputRef}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={
                        connected
                          ? 'Nhập phản hồi... (Enter để gửi)'
                          : 'Đang kết nối WebSocket...'
                      }
                      disabled={!connected}
                      rows={1}
                      className="flex-1 bg-gray-50 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-[14px] p-[12px_16px] text-black dark:text-white text-[14px] resize-none outline-none font-['Inter',sans-serif] leading-[1.5] max-h-[100px] overflow-y-auto transition-colors duration-200 focus:border-red-500/50 dark:focus:border-red-500/50 placeholder:text-gray-400 dark:placeholder:text-white/40"
                    />
                    <button
                      onClick={handleSend}
                      disabled={!connected || !inputText.trim() || sending}
                      className={`w-[48px] h-[48px] rounded-[14px] border-none flex items-center justify-center shrink-0 transition-all duration-200 ${
                        connected && inputText.trim()
                          ? 'bg-[linear-gradient(135deg,#dc2626,#c01f45)] text-white cursor-pointer shadow-[0_4px_16px_rgba(220,38,38,0.4)]'
                          : 'bg-black/5 dark:bg-white/5 text-black/30 dark:text-white/20 cursor-not-allowed shadow-none'
                      }`}
                      title="Gửi phản hồi (Enter)"
                    >
                      {sending ? (
                        <Loader2
                          size={18}
                          className="animate-[adminChatSpin_1s_linear_infinite]"
                        />
                      ) : (
                        <Send size={18} />
                      )}
                    </button>
                  </div>
                </>
              );
            })()}
          </>
        ) : (
          /* Empty State */
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              color: 'rgba(255,255,255,0.2)',
            }}
          >
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'rgba(220,38,38,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MessageCircle
                size={36}
                color="rgba(220,38,38,0.4)"
                strokeWidth={1.5}
              />
            </div>
            <div style={{ textAlign: 'center' }}>
              <p
                style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.4)',
                  margin: '0 0 6px',
                }}
              >
                Chọn một cuộc hội thoại
              </p>
              <p
                style={{
                  fontSize: '13px',
                  color: 'rgba(255,255,255,0.2)',
                  margin: 0,
                }}
              >
                Nhấn vào nhân viên ở bên trái để xem và phản hồi tin nhắn.
              </p>
            </div>
            {/* WebSocket Indicator Removed */}
          </div>
        )}
      </div>

      <style>{`
        @keyframes adminChatSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
