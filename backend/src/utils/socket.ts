import { Server as HttpServer } from 'http';
import { SocketManager } from '../core/socket/manager';

/**
 * Backward-compatible init helper utilizing the central SocketManager singleton.
 */
export function init(server: HttpServer) {
  return SocketManager.getInstance().init(server);
}

/**
 * Backward-compatible getIo helper.
 */
export function getIo() {
  return SocketManager.getInstance().getIo();
}

/**
 * Backward-compatible user event emitter.
 */
export function emitToUser(userId: string, event: string, data: any) {
  SocketManager.getInstance().emitToUser(userId, event, data);
}

/**
 * Backward-compatible org event emitter.
 */
export function emitToOrg(orgId: string, event: string, data: any) {
  SocketManager.getInstance().emitToOrg(orgId, event, data);
}

/**
 * Backward-compatible role event emitter.
 */
export function emitToOrgRole(orgId: string, role: string, event: string, data: any) {
  SocketManager.getInstance().emitToOrgRole(orgId, role, event, data);
}
