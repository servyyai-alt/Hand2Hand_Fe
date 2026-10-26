import { apiClient } from './api.service';

export interface SavedAddress {
  _id: string;
  type: 'Home' | 'Work' | 'College' | 'Other';
  label: string;
  address: string;
  landmark?: string;
  city?: string;
  state?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  coordinates?: {
    lat?: number;
    lng?: number;
    latitude?: number;
    longitude?: number;
  };
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface NotificationPreferences {
  deliveryAccepted: boolean;
  partnerArriving: boolean;
  itemPickedUp: boolean;
  deliveryInProgress: boolean;
  deliveryCompleted: boolean;
  paymentUpdates?: boolean;
  accountSecurity?: boolean;
  promotions: boolean;
}

export interface UserProfileResponse {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  avatar?: string;
  role: string;
  status: string;
  notificationPreferences?: NotificationPreferences;
  addresses?: SavedAddress[];
  savedAddresses?: SavedAddress[];
  addressesCount?: number;
}

export interface TicketMessage {
  _id?: string;
  senderId: string;
  senderRole: string;
  senderName: string;
  message: string;
  attachments?: string[];
  createdAt: string;
}

export interface SupportTicket {
  _id: string;
  customerId: string;
  relatedDeliveryId?: any;
  category: 'DELIVERY_DELAY' | 'DAMAGED_PACKAGE' | 'WRONG_LOCATION' | 'BILLING' | 'DRIVER_BEHAVIOR' | 'ACCOUNT_ISSUE' | 'OTHER';
  subject: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING_ON_CUSTOMER' | 'RESOLVED' | 'CLOSED';
  contactPreference: 'IN_APP' | 'CALL' | 'EMAIL' | 'WHATSAPP';
  messages: TicketMessage[];
  createdAt: string;
  updatedAt: string;
}

export const profileService = {
  async getProfile(): Promise<UserProfileResponse> {
    const res = await apiClient.get('/users/me');
    return res.data.data;
  },

  async updateProfile(data: { name?: string; avatar?: string; email?: string }): Promise<UserProfileResponse> {
    const res = await apiClient.patch('/users/me', data);
    return res.data.data;
  },

  async getPreferences(): Promise<NotificationPreferences> {
    const res = await apiClient.get('/users/me/preferences');
    return res.data.data;
  },

  async updatePreferences(prefs: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    const res = await apiClient.patch('/users/me/preferences', prefs);
    return res.data.data;
  },

  async getAddresses(): Promise<SavedAddress[]> {
    const res = await apiClient.get('/users/me/addresses');
    return res.data.data;
  },

  async addAddress(data: Omit<SavedAddress, '_id' | 'createdAt' | 'updatedAt'>): Promise<SavedAddress> {
    const res = await apiClient.post('/users/me/addresses', data);
    return res.data.data;
  },

  async updateAddress(addressId: string, data: Partial<SavedAddress>): Promise<SavedAddress> {
    const res = await apiClient.patch(`/users/me/addresses/${addressId}`, data);
    return res.data.data;
  },

  async deleteAddress(addressId: string): Promise<void> {
    await apiClient.delete(`/users/me/addresses/${addressId}`);
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const res = await apiClient.patch('/auth/change-password', { currentPassword, newPassword });
    return res.data;
  },

  async deleteAccount(reason?: string): Promise<void> {
    await apiClient.delete('/users/me', { data: { reason } });
  },

  async getTickets(params?: { status?: string; category?: string; page?: number; limit?: number }): Promise<{ data: SupportTicket[]; pagination: any }> {
    const res = await apiClient.get('/tickets', { params });
    return res.data.data;
  },

  async getTicketById(ticketId: string): Promise<SupportTicket> {
    const res = await apiClient.get(`/tickets/${ticketId}`);
    return res.data.data;
  },

  async createTicket(data: {
    category: string;
    subject: string;
    description: string;
    priority?: string;
    contactPreference?: string;
    relatedDeliveryId?: string;
  }): Promise<SupportTicket> {
    const res = await apiClient.post('/tickets', data);
    return res.data.data;
  },

  async addTicketMessage(ticketId: string, message: string, attachments?: string[]): Promise<SupportTicket> {
    const res = await apiClient.post(`/tickets/${ticketId}/messages`, { message, attachments });
    return res.data.data;
  },
};
