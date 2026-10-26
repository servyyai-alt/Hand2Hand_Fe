import { apiClient } from './api.service';

export interface AppNotification {
  _id: string;
  userId: string;
  type:
    | 'DELIVERY_ASSIGNED'
    | 'PARTNER_ARRIVING'
    | 'ITEM_PICKED_UP'
    | 'IN_PROGRESS'
    | 'DELIVERED'
    | 'CANCELLED'
    | 'PAYMENT'
    | 'SECURITY'
    | 'PROMOTION'
    | 'SYSTEM';
  title: string;
  description: string;
  deliveryId?: string;
  orderRef?: string;
  isRead: boolean;
  actionUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface NotificationsResponse {
  notifications: AppNotification[];
  unreadCount: number;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const notificationService = {
  async getNotifications(params?: {
    filter?: 'all' | 'unread';
    page?: number;
    limit?: number;
  }): Promise<NotificationsResponse> {
    const res = await apiClient.get('/notifications', { params });
    return res.data.data;
  },

  async markAsRead(id: string): Promise<AppNotification> {
    const res = await apiClient.patch(`/notifications/${id}/read`);
    return res.data.data;
  },

  async markAllAsRead(): Promise<{ message: string; updatedCount: number }> {
    const res = await apiClient.post('/notifications/mark-all-read');
    return res.data.data;
  },
};
