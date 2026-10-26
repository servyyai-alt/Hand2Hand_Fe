import { apiClient, BASE_URL } from './api.service';

export type DeliveryStatus =
  | 'CREATED'
  | 'SEARCHING_PARTNER'
  | 'PARTNER_ASSIGNED'
  | 'ARRIVED_AT_PICKUP'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'FAILED'
  | 'ITEM_MISMATCH';

export interface LocationPoint {
  address: string;
  coordinates: { lat: number; lng: number };
  contactName: string;
  contactPhone: string;
  landmark?: string;
}

export interface DeliveryFare {
  base: number;
  perKm: number;
  weightCharge: number;
  discount: number;
  total: number;
  currency: string;
}

export interface DeliveryRating {
  rating: number;
  feedback?: string;
  createdAt?: string;
}

export interface DeliveryPayment {
  method: 'CASH' | 'UPI' | 'CARD' | 'WALLET' | string;
  status: 'PENDING' | 'PAID' | 'REFUNDED' | 'FAILED' | string;
  transactionId?: string;
  paidAt?: string;
}

export interface StatusHistoryItem {
  status: DeliveryStatus | string;
  timestamp: string;
  note?: string;
}

export interface AssignedPartner {
  _id?: string;
  name: string;
  phone: string;
  vehicle?: {
    type?: string;
    make?: string;
    model?: string;
    registrationNumber?: string;
  };
  rating?: number;
  totalRatings?: number;
  isOnline?: boolean;
}

export interface ItemVerification {
  originalImage: string;
  originalImageUrl?: string;
  originalUploadedAt?: string;
  originalUploadedBy?: string;
  handlingInstructions?: string;
  pickupImage?: string;
  pickupImageUrl?: string;
  pickupUploadedAt?: string;
  pickupUploadedBy?: string;
  status: 'PENDING' | 'VERIFIED' | 'MISMATCH' | 'OVERRIDDEN';
  verifiedAt?: string;
  verifiedBy?: string;
  notes?: string;
  mismatchReason?: 'WRONG_ITEM' | 'DAMAGED_ITEM' | 'DIFFERENT_SIZE_WEIGHT' | 'SUSPICIOUS_PACKAGE' | 'OTHER' | 'NONE' | string;
  mismatchNotes?: string;
  mismatchEvidenceImage?: string;
  mismatchEvidenceUrl?: string;
  mismatchReportedAt?: string;
  mismatchReportedBy?: string;
  reviewStatus?: 'NONE' | 'PENDING_REVIEW' | 'INVESTIGATING' | 'RESOLVED_PROCEED' | 'RESOLVED_CANCELLED';
  adminDecision?: string;
  resolutionNotes?: string;
}

export interface Delivery {
  _id: string;
  trackingId: string;
  customer: any;
  partner?: AssignedPartner | null;
  partnerDetails?: AssignedPartner | null;
  pickup: LocationPoint;
  drop: LocationPoint;
  status: DeliveryStatus;
  statusHistory: StatusHistoryItem[];
  category: 'DOCUMENTS' | 'FOOD' | 'CLOTHES' | 'GIFTS' | 'PARCEL' | 'BOOKS' | 'PERSONAL_ITEMS' | 'OTHER' | string;
  itemName?: string;
  description?: string;
  handlingInstructions?: string;
  weight?: number;
  itemPhoto?: string;
  itemVerification?: ItemVerification | null;
  lastLocation?: { lat: number; lng: number; heading?: number; speed?: number; accuracy?: number; updatedAt?: string } | null;
  fare: DeliveryFare;
  distance?: number;
  duration?: number;
  rating?: DeliveryRating;
  payment?: DeliveryPayment;
  cancellationReason?: string;
  recipientNotes?: string;
  senderOTP?: string;
  deliveryOTP?: string;
  devRecipientOtp?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeliverySummary {
  activeCount: number;
  completedCount: number;
  cancelledCount: number;
  totalCount: number;
}

export interface GetDeliveriesResponse {
  data: Delivery[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  summary: DeliverySummary;
}

export interface TrackingData {
  _id?: string;
  deliveryId: string;
  trackingId: string;
  status: DeliveryStatus;
  stageMessage: string;
  estimatedMinutes: number;
  distanceKm: number;
  pickup: LocationPoint;
  drop: LocationPoint;
  statusHistory: StatusHistoryItem[];
  partner?: AssignedPartner | null;
  partnerLocation?: { lat: number; lng: number; heading?: number; speed?: number; accuracy?: number; updatedAt?: string } | null;
  lastLocation?: { lat: number; lng: number; heading?: number; speed?: number; accuracy?: number; updatedAt?: string } | null;
  itemVerification?: ItemVerification | null;
  itemName?: string;
  handlingInstructions?: string;
  itemPhoto?: string;
  senderOTP?: string;
  deliveryOTP?: string;
  devRecipientOtp?: string;
  lastUpdated: string;
}

export const deliveryService = {
  /**
   * Fetch paginated customer delivery records with optional status filter and search query.
   */
  async getMyDeliveries(params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<GetDeliveriesResponse> {
    const res = await apiClient.get('/deliveries/my', { params });
    return res.data.data;
  },

  /**
   * Fetch single delivery details by ID with partner and payment info.
   */
  async getDeliveryById(id: string): Promise<Delivery> {
    const res = await apiClient.get(`/deliveries/${id}`);
    return res.data.data;
  },

  /**
   * Fetch real-time tracking information including partner coordinates and stage message.
   */
  async getDeliveryTracking(id: string): Promise<TrackingData> {
    const res = await apiClient.get(`/deliveries/${id}/tracking`);
    return res.data.data;
  },

  /**
   * Cancel an eligible delivery.
   */
  async cancelDelivery(id: string, reason?: string): Promise<Delivery> {
    const res = await apiClient.post(`/deliveries/${id}/cancel`, { reason });
    return res.data.data;
  },

  /**
   * Submit a star rating and optional feedback for a completed delivery.
   */
  async submitRating(
    id: string,
    rating: number,
    feedback?: string
  ): Promise<{ success: boolean; message: string; rating: DeliveryRating }> {
    const res = await apiClient.post(`/deliveries/${id}/rating`, { rating, feedback });
    return res.data.data;
  },

  /**
   * Calculate fare before placing order.
   */
  async calculateFare(
    pickup: { lat: number; lng: number },
    drop: { lat: number; lng: number },
    weight: number = 0
  ): Promise<DeliveryFare & { distance: number; duration: number }> {
    const res = await apiClient.post('/deliveries/fare', { pickup, drop, weight });
    return res.data.data;
  },

  /**
   * Upload an item photograph and get back the hosted relative URL.
   */
  async uploadImage(image: string, prefix = 'item_photo'): Promise<string> {
    const res = await apiClient.post('/deliveries/upload-image', { image, prefix });
    return res.data.data.imageUrl;
  },

  /**
   * Partner verifies the physical item matches the booking reference photo.
   */
  async verifyItem(deliveryId: string, pickupImage: string, notes?: string): Promise<Delivery> {
    const res = await apiClient.post(`/partners/deliveries/${deliveryId}/verify-item`, {
      pickupImage,
      notes,
    });
    return res.data.data;
  },

  /**
   * Partner reports that the physical item does not match the reference photo.
   */
  async reportMismatch(
    deliveryId: string,
    reason: string,
    notes?: string,
    evidenceImage?: string
  ): Promise<Delivery> {
    const res = await apiClient.post(`/partners/deliveries/${deliveryId}/report-mismatch`, {
      reason,
      notes,
      evidenceImage,
    });
    return res.data.data;
  },

  /**
   * Send live GPS coordinates for an assigned delivery.
   */
  async updateLocation(
    deliveryId: string,
    coords: { lat: number; lng: number; heading?: number; speed?: number; accuracy?: number }
  ): Promise<void> {
    await apiClient.post(`/partners/deliveries/${deliveryId}/location`, coords);
  },
};

/**
 * Resolves absolute URL for an item verification image, appending query token if required.
 */
export function getDeliveryImageUrl(pathOrUrl?: string | null, token?: string | null): string {
  if (!pathOrUrl) return '';
  if (pathOrUrl.startsWith('data:') || pathOrUrl.startsWith('blob:')) {
    return pathOrUrl;
  }
  let fullUrl = pathOrUrl;
  if (!pathOrUrl.startsWith('http://') && !pathOrUrl.startsWith('https://')) {
    const root = BASE_URL.replace(/\/api\/v1\/?$/, '');
    const cleanPath = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
    fullUrl = `${root}${cleanPath}`;
  }
  if (token && (fullUrl.includes('/deliveries/images') || fullUrl.includes('/uploads/')) && !fullUrl.includes('token=')) {
    const sep = fullUrl.includes('?') ? '&' : '?';
    return `${fullUrl}${sep}token=${encodeURIComponent(token)}`;
  }
  return fullUrl;
}

