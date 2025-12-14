import {
  users,
  contacts,
  messages,
  contactRequests,
  type User,
  type Contact,
  type Message,
  type ContactRequest,
  type InsertUser,
  type InsertContact,
  type InsertMessage,
  type InsertContactRequest,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, isNull } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByPairingCode(code: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserOnlineStatus(userId: string, isOnline: boolean): Promise<void>;
  
  getContacts(userId: string): Promise<(Contact & { contact: User })[]>;
  getContact(userId: string, contactId: string): Promise<Contact | undefined>;
  createContact(contact: InsertContact): Promise<Contact>;
  updateContactVerification(id: string, isVerified: boolean, safetyNumber: string): Promise<void>;
  
  getMessages(userId: string, contactId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessageAsRead(messageId: string): Promise<void>;
  markMessageAsDelivered(messageId: string): Promise<void>;
  deleteMessage(messageId: string): Promise<void>;
  getExpiredMessages(): Promise<Message[]>;
  
  getContactRequests(userId: string): Promise<(ContactRequest & { fromUser: User })[]>;
  getSentContactRequests(userId: string): Promise<(ContactRequest & { toUser: User })[]>;
  createContactRequest(request: InsertContactRequest): Promise<ContactRequest>;
  updateContactRequestStatus(id: string, status: string): Promise<void>;
  getContactRequest(fromUserId: string, toUserId: string): Promise<ContactRequest | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByPairingCode(code: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.pairingCode, code));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    await db.update(users)
      .set({ isOnline, lastSeen: new Date() })
      .where(eq(users.id, userId));
  }

  async getContacts(userId: string): Promise<(Contact & { contact: User })[]> {
    const result = await db
      .select()
      .from(contacts)
      .innerJoin(users, eq(contacts.contactId, users.id))
      .where(eq(contacts.userId, userId));
    
    return result.map(r => ({
      ...r.contacts,
      contact: r.users,
    }));
  }

  async getContact(userId: string, contactId: string): Promise<Contact | undefined> {
    const [contact] = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.userId, userId), eq(contacts.contactId, contactId)));
    return contact || undefined;
  }

  async createContact(insertContact: InsertContact): Promise<Contact> {
    const [contact] = await db.insert(contacts).values(insertContact).returning();
    return contact;
  }

  async updateContactVerification(id: string, isVerified: boolean, safetyNumber: string): Promise<void> {
    await db.update(contacts)
      .set({ isVerified, safetyNumber, updatedAt: new Date() })
      .where(eq(contacts.id, id));
  }

  async getMessages(userId: string, contactId: string): Promise<Message[]> {
    return db
      .select()
      .from(messages)
      .where(
        and(
          isNull(messages.deletedAt),
          or(
            and(eq(messages.senderId, userId), eq(messages.recipientId, contactId)),
            and(eq(messages.senderId, contactId), eq(messages.recipientId, userId))
          )
        )
      )
      .orderBy(desc(messages.createdAt));
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const selfDestructAt = insertMessage.selfDestructSeconds
      ? new Date(Date.now() + insertMessage.selfDestructSeconds * 1000)
      : null;
    
    const [message] = await db
      .insert(messages)
      .values({
        ...insertMessage,
        selfDestructAt,
      })
      .returning();
    return message;
  }

  async markMessageAsRead(messageId: string): Promise<void> {
    await db.update(messages)
      .set({ isRead: true })
      .where(eq(messages.id, messageId));
  }

  async markMessageAsDelivered(messageId: string): Promise<void> {
    await db.update(messages)
      .set({ isDelivered: true })
      .where(eq(messages.id, messageId));
  }

  async deleteMessage(messageId: string): Promise<void> {
    await db.update(messages)
      .set({ deletedAt: new Date() })
      .where(eq(messages.id, messageId));
  }

  async getExpiredMessages(): Promise<Message[]> {
    const now = new Date();
    return db
      .select()
      .from(messages)
      .where(
        and(
          isNull(messages.deletedAt),
          eq(messages.isRead, true)
        )
      );
  }

  async getContactRequests(userId: string): Promise<(ContactRequest & { fromUser: User })[]> {
    const result = await db
      .select()
      .from(contactRequests)
      .innerJoin(users, eq(contactRequests.fromUserId, users.id))
      .where(and(eq(contactRequests.toUserId, userId), eq(contactRequests.status, "pending")));
    
    return result.map(r => ({
      ...r.contact_requests,
      fromUser: r.users,
    }));
  }

  async getSentContactRequests(userId: string): Promise<(ContactRequest & { toUser: User })[]> {
    const result = await db
      .select()
      .from(contactRequests)
      .innerJoin(users, eq(contactRequests.toUserId, users.id))
      .where(eq(contactRequests.fromUserId, userId));
    
    return result.map(r => ({
      ...r.contact_requests,
      toUser: r.users,
    }));
  }

  async createContactRequest(insertRequest: InsertContactRequest): Promise<ContactRequest> {
    const [request] = await db.insert(contactRequests).values(insertRequest).returning();
    return request;
  }

  async updateContactRequestStatus(id: string, status: string): Promise<void> {
    await db.update(contactRequests)
      .set({ status, respondedAt: new Date() })
      .where(eq(contactRequests.id, id));
  }

  async getContactRequest(fromUserId: string, toUserId: string): Promise<ContactRequest | undefined> {
    const [request] = await db
      .select()
      .from(contactRequests)
      .where(
        and(
          eq(contactRequests.fromUserId, fromUserId),
          eq(contactRequests.toUserId, toUserId)
        )
      );
    return request || undefined;
  }
}

export const storage = new DatabaseStorage();
