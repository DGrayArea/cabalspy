import { io, Socket } from "socket.io-client";
import { EventEmitter } from "events";

export interface CabalSpySignal {
  mint?: string;
  name?: string;
  symbol?: string;
  price?: number;
  timestamp?: number;
  type?: string;
  [key: string]: any;
}

class CabalSpySocketService extends EventEmitter {
  private socket: Socket | null = null;
  private readonly serverUrl = "http://82.29.181.131:8092";
  private isConnected = false;

  constructor() {
    super();
  }

  connect() {
    if (this.socket) return;

    this.socket = io(this.serverUrl, {
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      timeout: 10000,
    });

    this.socket.on("connect", () => {
    });

    this.socket.on("disconnect", () => {
    });

    this.socket.on("connect_error", (error) => {
      console.error("⚠️ [Socket.IO] Connection error:", error.message);
      this.emit("status", "error", error.message);
    });

    this.socket.on("signal", (data: CabalSpySignal) => {
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  get status() {
    return this.isConnected ? "connected" : "disconnected";
  }
}

export const socketCalls = new CabalSpySocketService();
