import { apiClient } from './api.service';

export interface PaymentSummary {
  totalPaid: number;
  pendingAmount: number;
  paidCount: number;
  pendingCount: number;
  totalCount: number;
  currency: string;
}

export interface PaymentItem {
  id: string;
  deliveryId: string;
  trackingId: string;
  amount: number;
  currency: string;
  fareBreakdown: {
    base: number;
    perKm: number;
    weightCharge: number;
    discount: number;
    total: number;
    currency: string;
  };
  method: string;
  status: string; // 'PAID' | 'PENDING' | 'REFUNDED' | 'FAILED'
  transactionId: string;
  paidAt: string;
  createdAt: string;
  pickupAddress: string;
  dropAddress: string;
  deliveryStatus: string;
  category?: string;
  hasInvoice: boolean;
}

export interface PaymentDetails extends PaymentItem {
  pickup: {
    address: string;
    contactName: string;
    contactPhone: string;
    landmark?: string;
  };
  drop: {
    address: string;
    contactName: string;
    contactPhone: string;
    landmark?: string;
  };
  distance?: number;
  weight?: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  company: {
    name: string;
    tagline?: string;
    address: string;
    email: string;
    phone: string;
    gstin: string;
  };
  customer: {
    name: string;
    phone?: string;
    email?: string;
  };
  delivery: {
    trackingId: string;
    category?: string;
    description?: string;
    distanceKm?: number;
    weightKg?: number;
    pickupAddress: string;
    dropAddress: string;
    pickupContact: string;
    dropContact: string;
    bookedAt: string;
    status: string;
  };
  fareBreakdown: {
    base: number;
    perKm: number;
    weightCharge: number;
    discount: number;
    subtotal: number;
    taxes: number;
    total: number;
    currency: string;
  };
  payment: {
    method: string;
    status: string;
    transactionId: string;
    paidAt: string;
  };
}

class PaymentService {
  async getSummary(): Promise<PaymentSummary> {
    const res = await apiClient.get('/payments/summary');
    return res.data.data;
  }

  async getPaymentHistory(params?: {
    page?: number;
    limit?: number;
    status?: string;
    method?: string;
    search?: string;
  }): Promise<{ data: PaymentItem[]; pagination: any; summary: PaymentSummary }> {
    const res = await apiClient.get('/payments/my', { params });
    return res.data.data;
  }

  async getPaymentById(id: string): Promise<PaymentDetails> {
    const res = await apiClient.get(`/payments/${id}`);
    return res.data.data;
  }

  async getInvoice(id: string): Promise<InvoiceData> {
    const res = await apiClient.get(`/payments/${id}/invoice`);
    return res.data.data;
  }
}

export const paymentService = new PaymentService();
