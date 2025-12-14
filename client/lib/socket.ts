import { io, Socket } from "socket.io-client";
import { getApiUrl } from "@/lib/query-client";

let socket: Socket | null = null;
let currentUserId: string | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const url = getApiUrl();
    socket = io(url, {
      transports: ["websocket", "polling"],
      autoConnect: true,
    });
    
    socket.on("connect", () => {
      if (currentUserId) {
        socket?.emit("user:online", currentUserId);
      }
    });
  }
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  currentUserId = null;
}

export interface MessagePayload {
  senderId: string;
  recipientId: string;
  encryptedContent: string;
  nonce: string;
  isEncrypted: boolean;
  selfDestructSeconds?: number;
}

export interface ContactRequestPayload {
  fromUserId: string;
  toUserId: string;
}

export interface ContactAcceptPayload {
  requestId: string;
  userId: string;
  contactId: string;
}

export function emitUserOnline(userId: string): void {
  currentUserId = userId;
  const s = getSocket();
  if (s.connected) {
    s.emit("user:online", userId);
  }
}

export function emitSendMessage(payload: MessagePayload): void {
  getSocket().emit("message:send", payload);
}

export function emitMessageRead(messageId: string): void {
  getSocket().emit("message:read", messageId);
}

export function emitTyping(senderId: string, recipientId: string): void {
  getSocket().emit("message:typing", { senderId, recipientId });
}

export function emitContactRequest(payload: ContactRequestPayload): void {
  getSocket().emit("contact:request", payload);
}

export function emitContactAccept(payload: ContactAcceptPayload): void {
  getSocket().emit("contact:accept", payload);
}

export function emitContactReject(requestId: string): void {
  getSocket().emit("contact:reject", { requestId });
}
