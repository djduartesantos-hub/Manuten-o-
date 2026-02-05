import { SocketManager } from '../services/socket.manager.js';

let socketManager: SocketManager | null = null;

export function setSocketManager(manager: SocketManager): void {
  socketManager = manager;
}

export function getSocketManager(): SocketManager {
  if (!socketManager) {
    throw new Error('Socket manager not initialized. Call setSocketManager first.');
  }
  return socketManager;
}

export function isSocketManagerReady(): boolean {
  return socketManager !== null;
}
