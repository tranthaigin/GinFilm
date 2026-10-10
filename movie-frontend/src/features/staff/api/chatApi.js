import { apiGet } from '../../../shared/api/client';
import axiosClient from '../../../shared/api/client';

const BASE = '/chat';

export const chatApi = {
  /** Lấy lịch sử chat của 1 cuộc hội thoại */
  getHistory: (conversationId) =>
    apiGet(`${BASE}/history/${conversationId}`),

  /** Danh sách cuộc hội thoại (Admin) */
  getConversations: (adminId) =>
    apiGet(`${BASE}/conversations${adminId ? `?adminId=${adminId}` : ''}`),

  /** Lấy danh sách admin (dành cho Staff) */
  getAdmins: () =>
    apiGet(`${BASE}/admins`),

  /** Lấy UUID cố định cho cặp Staff-Admin */
  getConversationId: (staffId, adminId) =>
    apiGet(`${BASE}/conversation-id?staffId=${staffId}&adminId=${adminId}`),

  /** Đánh dấu đã đọc — phía Admin đọc tin của Staff */
  markStaffRead: (conversationId) =>
    axiosClient.patch(`${BASE}/read/${conversationId}/staff`).then((r) => r.data),

  /** Đánh dấu đã đọc — phía Staff đọc tin của Admin */
  markAdminRead: (conversationId) =>
    axiosClient.patch(`${BASE}/read/${conversationId}/admin`).then((r) => r.data),

  /** Số tin chưa đọc từ Staff (badge Admin) */
  getAdminUnreadTotal: () =>
    apiGet(`${BASE}/unread/admin-total`),

  /** Số tin chưa đọc từ Admin (badge Staff widget) */
  getStaffUnreadCount: (conversationId) =>
    apiGet(`${BASE}/unread/staff/${conversationId}`),

  /** Lấy tất cả assignment hiện tại */
  getAssignments: () =>
    apiGet(`${BASE}/assignments`),

  /** Admin tiếp nhận conversation */
  assignConversation: (conversationId, adminId, adminName) =>
    axiosClient.post(`${BASE}/assign/${conversationId}`, { adminId, adminName }).then((r) => r.data),

  /** Admin bỏ tiếp nhận conversation */
  unassignConversation: (conversationId, adminId) =>
    axiosClient.post(`${BASE}/unassign/${conversationId}`, { adminId }).then((r) => r.data),
};
