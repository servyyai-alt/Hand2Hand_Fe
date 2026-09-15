import { io, Socket } from 'socket.io-client';
import { store } from '../store';

const SOCKET_URL = process.env.EXPO_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:5000';

class SocketService {
  private socket: Socket | null = null;

  connect() {
    const token = store.getState().auth.accessToken;
    if (!token || this.socket?.connected) return;

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => console.log('Socket connected'));
    this.socket.on('disconnect', (reason) => console.log('Socket disconnected:', reason));
    this.socket.on('connect_error', (err) => console.error('Socket error:', err.message));
  }

  disconnect() { this.socket?.disconnect(); this.socket = null; }

  emit(event: string, data?: unknown) { this.socket?.emit(event, data); }

  on(event: string, handler: (...args: unknown[]) => void) { this.socket?.on(event, handler); }

  off(event: string, handler?: (...args: unknown[]) => void) { this.socket?.off(event, handler); }

  joinDeliveryRoom(deliveryId: string) { this.socket?.emit('join:delivery', deliveryId); }

  leaveDeliveryRoom(deliveryId: string) { this.socket?.emit('leave:delivery', deliveryId); }

  get isConnected() { return this.socket?.connected ?? false; }
}

export const socketService = new SocketService();
