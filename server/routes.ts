import type { Express } from "express";
import { createServer, type Server } from "http";
import { Server as SocketServer } from "socket.io";
import { storage } from "./storage";
import { v4 as uuidv4 } from "uuid";

const connectedUsers = new Map<string, string>();

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  const io = new SocketServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
    
    socket.on("user:online", async (userId: string) => {
      console.log("User online:", userId, "socket:", socket.id);
      connectedUsers.set(userId, socket.id);
      await storage.updateUserOnlineStatus(userId, true);
      io.emit("user:status", { userId, isOnline: true });
    });

    socket.on("message:send", async (data: {
      senderId: string;
      recipientId: string;
      encryptedContent: string;
      nonce: string;
      isEncrypted: boolean;
      selfDestructSeconds?: number;
    }) => {
      try {
        const message = await storage.createMessage(data);
        
        const recipientSocketId = connectedUsers.get(data.recipientId);
        if (recipientSocketId) {
          io.to(recipientSocketId).emit("message:receive", message);
          await storage.markMessageAsDelivered(message.id);
        }
        
        socket.emit("message:sent", message);
      } catch (error) {
        socket.emit("message:error", { error: "Failed to send message" });
      }
    });

    socket.on("message:read", async (messageId: string) => {
      await storage.markMessageAsRead(messageId);
    });

    socket.on("message:typing", (data: { senderId: string; recipientId: string }) => {
      const recipientSocketId = connectedUsers.get(data.recipientId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("message:typing", { senderId: data.senderId });
      }
    });

    socket.on("contact:request", async (data: { fromUserId: string; toUserId: string }) => {
      try {
        console.log("Contact request:", data.fromUserId, "->", data.toUserId);
        const existing = await storage.getContactRequest(data.fromUserId, data.toUserId);
        if (existing) {
          socket.emit("contact:request:error", { error: "Request already sent" });
          return;
        }
        
        const request = await storage.createContactRequest(data);
        const fromUser = await storage.getUser(data.fromUserId);
        
        const recipientSocketId = connectedUsers.get(data.toUserId);
        console.log("Recipient socket for", data.toUserId, ":", recipientSocketId ? "found" : "NOT FOUND");
        console.log("Connected users:", Array.from(connectedUsers.keys()));
        if (recipientSocketId && fromUser) {
          io.to(recipientSocketId).emit("contact:request:received", {
            ...request,
            fromUser,
          });
          console.log("Sent contact:request:received to", data.toUserId);
        }
        
        socket.emit("contact:request:sent", request);
      } catch (error) {
        socket.emit("contact:request:error", { error: "Failed to send request" });
      }
    });

    socket.on("contact:accept", async (data: { requestId: string; userId: string; contactId: string }) => {
      try {
        console.log("Contact accept:", data.userId, "accepts request from", data.contactId);
        await storage.updateContactRequestStatus(data.requestId, "accepted");
        
        await storage.createContact({
          userId: data.userId,
          contactId: data.contactId,
          status: "accepted",
        });
        await storage.createContact({
          userId: data.contactId,
          contactId: data.userId,
          status: "accepted",
        });
        
        const user = await storage.getUser(data.userId);
        const contact = await storage.getUser(data.contactId);
        
        const contactSocketId = connectedUsers.get(data.contactId);
        console.log("Contact socket for", data.contactId, ":", contactSocketId ? "found" : "NOT FOUND");
        console.log("Connected users:", Array.from(connectedUsers.keys()));
        if (contactSocketId && user) {
          io.to(contactSocketId).emit("contact:accepted", {
            contact: user,
          });
          console.log("Sent contact:accepted to", data.contactId);
        }
        
        socket.emit("contact:accepted", { contact });
        console.log("Sent contact:accepted to accepter");
      } catch (error) {
        console.error("Contact accept error:", error);
        socket.emit("contact:error", { error: "Failed to accept request" });
      }
    });

    socket.on("contact:reject", async (data: { requestId: string }) => {
      await storage.updateContactRequestStatus(data.requestId, "rejected");
    });

    socket.on("contact:delete", async (data: { userId: string; contactId: string }) => {
      try {
        await storage.deleteContact(data.userId, data.contactId);
        
        const contactSocketId = connectedUsers.get(data.contactId);
        if (contactSocketId) {
          io.to(contactSocketId).emit("contact:deleted", { deletedBy: data.userId });
        }
        
        socket.emit("contact:deleted:success", { contactId: data.contactId });
      } catch (error) {
        socket.emit("contact:error", { error: "Failed to delete contact" });
      }
    });

    socket.on("disconnect", async () => {
      for (const [userId, socketId] of connectedUsers.entries()) {
        if (socketId === socket.id) {
          connectedUsers.delete(userId);
          
          // Remove from Redis
          await cache.removeUserOnline(userId);
          
          await storage.updateUserOnlineStatus(userId, false);
          io.emit("user:status", { userId, isOnline: false });
          
          // Publish to Kafka
          await publishUserEvent({
            type: "offline",
            userId,
            timestamp: new Date(),
          }).catch(err => console.error("Kafka publish error:", err));
          
          break;
        }
      }
      console.log("Client disconnected:", socket.id);
    });

    // Voice call signaling
    socket.on("call:offer", (data: { from: string; to: string; offer: RTCSessionDescriptionInit }) => {
      const recipientSocketId = connectedUsers.get(data.to);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("call:incoming", {
          from: data.from,
          offer: data.offer,
        });
      }
    });

    socket.on("call:request-offer", (data: { to: string }) => {
      const recipientSocketId = connectedUsers.get(data.to);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("call:get-offer");
      }
    });

    socket.on("call:answer", (data: { from: string; to: string; answer: RTCSessionDescriptionInit }) => {
      const recipientSocketId = connectedUsers.get(data.to);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("call:answer", {
          from: data.from,
          answer: data.answer,
        });
      }
    });

    socket.on("call:ice-candidate", (data: { to: string; candidate: RTCIceCandidateInit }) => {
      const recipientSocketId = connectedUsers.get(data.to);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("call:ice-candidate", {
          candidate: data.candidate,
        });
      }
    });

    socket.on("call:reject", (data: { from: string; to: string }) => {
      const recipientSocketId = connectedUsers.get(data.to);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("call:rejected");
      }
    });

    socket.on("call:end", (data: { from: string; to: string }) => {
      const recipientSocketId = connectedUsers.get(data.to);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("call:ended");
      }
    });
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, publicKey, identityKey, signedPreKey } = req.body;
      
      const existing = await storage.getUserByUsername(username);
      if (existing) {
        return res.status(400).json({ error: "Username already taken" });
      }
      
      const pairingCode = uuidv4().slice(0, 8).toUpperCase();
      
      const user = await storage.createUser({
        username,
        publicKey,
        identityKey,
        signedPreKey,
        pairingCode,
      });
      
      res.json(user);
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Failed to register" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username } = req.body;
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to login" });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  app.get("/api/users/code/:code", async (req, res) => {
    try {
      const user = await storage.getUserByPairingCode(req.params.code.toUpperCase());
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  app.get("/api/contacts/:userId", async (req, res) => {
    try {
      const contacts = await storage.getContacts(req.params.userId);
      res.json(contacts);
    } catch (error) {
      res.status(500).json({ error: "Failed to get contacts" });
    }
  });

  app.get("/api/messages/:userId/:contactId", async (req, res) => {
    try {
      const messages = await storage.getMessages(req.params.userId, req.params.contactId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to get messages" });
    }
  });

  app.get("/api/contact-requests/:userId", async (req, res) => {
    try {
      const requests = await storage.getContactRequests(req.params.userId);
      res.json(requests);
    } catch (error) {
      res.status(500).json({ error: "Failed to get contact requests" });
    }
  });

  app.delete("/api/messages/:messageId", async (req, res) => {
    try {
      await storage.deleteMessage(req.params.messageId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete message" });
    }
  });

  app.post("/api/contacts/:contactId/verify", async (req, res) => {
    try {
      const { userId, isVerified, safetyNumber } = req.body;
      const contact = await storage.getContact(userId, req.params.contactId);
      if (!contact) {
        return res.status(404).json({ error: "Contact not found" });
      }
      await storage.updateContactVerification(contact.id, isVerified, safetyNumber);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to verify contact" });
    }
  });

  setInterval(async () => {
    try {
      const expired = await storage.getExpiredMessages();
      for (const msg of expired) {
        if (msg.selfDestructAt && new Date() > msg.selfDestructAt) {
          await storage.deleteMessage(msg.id);
        }
      }
    } catch (error) {
      console.error("Self-destruct cleanup error:", error);
    }
  }, 60000);

  return httpServer;
}
