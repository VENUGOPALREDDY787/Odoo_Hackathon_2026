import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { TokenPayload } from '../../modules/auth/types/auth.types';
import logger from '../../config/logger';
import redis from '../redis/client';

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
   *
   * OPTIMIZED:
   *  - Added pingTimeout/pingInterval tuning for mobile/unreliable connections
   *  - maxHttpBufferSize capped at 1MB to prevent memory abuse
   *  - WebSocket preferred over polling (50% less overhead)
   *  - Redis adapter enabled for horizontal scaling (multi-node pub/sub)
   *  - Compression enabled for large payloads
   */
  init(server: HttpServer): SocketServer {
    this.io = new SocketServer(server, {
      cors: {
        origin: (process.env.CLIENT_URL || 'http://localhost:3000')
          .split(',')
          .map(o => o.trim()),
        methods: ['GET', 'POST'],
        credentials: true,
      },

      // ─── Performance Tuning ──────────────────────────────────────────────
      // Prefer WebSocket — avoids HTTP polling overhead
      transports: ['websocket', 'polling'],

      // Heartbeat: detect dead connections faster
      pingTimeout: 30000,   // 30s before marking disconnected
      pingInterval: 25000,  // 25s between pings

      // Prevent memory exhaustion from large payload attacks
      maxHttpBufferSize: 1e6, // 1MB max per message

      // Upgrade from polling to WebSocket after 1 second
      upgradeTimeout: 10000,

      // Allow EIO4 (Socket.io v4) only
      allowEIO3: false,

      // Per-message compression
      perMessageDeflate: {
        threshold: 1024, // Only compress messages >1KB
      },
    });

    // ─── Redis Adapter (Horizontal Scaling) ──────────────────────────────
    // When running multiple API server instances behind a load balancer,
    // the Redis pub/sub adapter ensures events are broadcast to all nodes.
    // Without this, emitToUser() would only work on the node that has the socket.
    if (process.env.NODE_ENV === 'production') {
      this.attachRedisAdapter().catch(err => {
        logger.error('[SocketManager] Redis adapter failed to attach. Falling back to in-memory.', err.message);
      });
    }

    // ─── Authentication Middleware ────────────────────────────────────────
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

    // ─── Connection Handler ────────────────────────────────────────────────
    this.io.on('connection', (socket: any) => {
      if (!socket.user) return;
      const { id: userId, organizationId: orgId, role } = socket.user;

      logger.info(`[SocketManager] Connected: ${socket.user.email} (${socket.id})`);

      // Channel 1: Personal user feed
      socket.join(`user_${userId}`);
      // Channel 2: Org-wide updates (dashboard refreshes, org announcements)
      socket.join(`org_${orgId}`);
      // Channel 3: Role-specific (e.g., Admin sees all audit events)
      socket.join(`org_${orgId}_${role}`);

      // Handle client-initiated ping (keepalive for mobile)
      socket.on('ping', () => socket.emit('pong', { timestamp: Date.now() }));

      socket.on('disconnect', (reason: string) => {
        logger.info(`[SocketManager] Disconnected: ${socket.user?.email} (reason: ${reason})`);
      });

      socket.on('error', (err: Error) => {
        logger.warn(`[SocketManager] Socket error for ${socket.user?.email}: ${err.message}`);
      });
    });

    return this.io;
  }

  /**
   * Attaches the @socket.io/redis-adapter for multi-node pub/sub.
   * Uses a separate pub/sub connection pair (required by Redis adapter).
   */
  private async attachRedisAdapter(): Promise<void> {
    if (!this.io) return;

    // Socket.io Redis adapter needs its own pubClient/subClient pair
    // We use ioredis directly since createClient from 'redis' package
    // conflicts with ioredis. Adapter works with both.
    const { createAdapter: makeAdapter } = await import('@socket.io/redis-adapter');

    // Duplicate the ioredis connection for sub client
    const pubClient = redis;
    const subClient = redis.duplicate();

    subClient.on('error', (err: Error) => {
      logger.error('[SocketManager subClient] Redis connection error:', err.message);
    });

    this.io.adapter(makeAdapter(pubClient as any, subClient as any));
    logger.info('[SocketManager] Redis adapter attached — ready for horizontal scaling.');
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
