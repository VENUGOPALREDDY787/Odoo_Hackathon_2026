import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { TokenPayload } from '../../modules/auth/types/auth.types';
import logger from '../../config/logger';

export class SocketManager {
  private static instance: SocketManager;
  private io: SocketServer | null = null;

  private constructor() {}

  /**
   * Resolves the singleton instance of the SocketManager.
   */
  static getInstance(): SocketManager {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager();
    }
    return SocketManager.instance;
  }

  /**
   * Initializes the Socket.IO server on an existing HTTP listener.
   */
  init(server: HttpServer): SocketServer {
    this.io = new SocketServer(server, {
      cors: {
        origin: process.env.CLIENT_URL || '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true
      }
    });

    this.io.use((socket: any, next) => {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token || typeof token !== 'string') {
        return next(new Error('Authentication error: Token required'));
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
        socket.user = decoded;
        next();
      } catch (err) {
        return next(new Error('Authentication error: Invalid token'));
      }
    });

    this.io.on('connection', (socket: any) => {
      if (!socket.user) return;
      const { id: userId, organizationId: orgId, role } = socket.user;

      logger.info(`[SocketManager] Connected: ${socket.user.email} (${socket.id})`);

      // Channel 1: Personal User feeds
      socket.join(`user_${userId}`);
      // Channel 2: Org-wide updates
      socket.join(`org_${orgId}`);
      // Channel 3: Role-specific notifications
      socket.join(`org_${orgId}_${role}`);

      socket.on('disconnect', () => {
        logger.info(`[SocketManager] Disconnected: ${socket.user?.email} (${socket.id})`);
      });
    });

    return this.io;
  }

  /**
   * Retrieves the raw Socket.IO instance.
   */
  getIo(): SocketServer {
    if (!this.io) {
      throw new Error('Socket.io server has not been initialized.');
    }
    return this.io;
  }

  /**
   * Sends socket events to a specific user.
   */
  emitToUser(userId: string, event: string, data: any): void {
    if (this.io) {
      this.io.to(`user_${userId}`).emit(event, data);
    }
  }

  /**
   * Sends socket events to an entire organization.
   */
  emitToOrg(orgId: string, event: string, data: any): void {
    if (this.io) {
      this.io.to(`org_${orgId}`).emit(event, data);
    }
  }

  /**
   * Sends socket events to role scopes within an organization.
   */
  emitToOrgRole(orgId: string, role: string, event: string, data: any): void {
    if (this.io) {
      this.io.to(`org_${orgId}_${role}`).emit(event, data);
    }
  }
}
export default SocketManager;
