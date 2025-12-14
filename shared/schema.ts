import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  publicKey: text("public_key").notNull(),
  identityKey: text("identity_key").notNull(),
  signedPreKey: text("signed_pre_key").notNull(),
  pairingCode: text("pairing_code").notNull().unique(),
  isOnline: boolean("is_online").default(false),
  lastSeen: timestamp("last_seen").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  sentContacts: many(contacts, { relationName: "sentContacts" }),
  receivedContacts: many(contacts, { relationName: "receivedContacts" }),
  sentMessages: many(messages, { relationName: "sentMessages" }),
  receivedMessages: many(messages, { relationName: "receivedMessages" }),
}));

export const contacts = pgTable("contacts", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  contactId: varchar("contact_id").notNull().references(() => users.id),
  status: text("status").notNull().default("pending"),
  isVerified: boolean("is_verified").default(false),
  safetyNumber: text("safety_number"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const contactsRelations = relations(contacts, ({ one }) => ({
  user: one(users, {
    fields: [contacts.userId],
    references: [users.id],
    relationName: "sentContacts",
  }),
  contact: one(users, {
    fields: [contacts.contactId],
    references: [users.id],
    relationName: "receivedContacts",
  }),
}));

export const messages = pgTable("messages", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  recipientId: varchar("recipient_id").notNull().references(() => users.id),
  encryptedContent: text("encrypted_content").notNull(),
  nonce: text("nonce").notNull(),
  isEncrypted: boolean("is_encrypted").default(true),
  isRead: boolean("is_read").default(false),
  isDelivered: boolean("is_delivered").default(false),
  selfDestructAt: timestamp("self_destruct_at"),
  selfDestructSeconds: integer("self_destruct_seconds"),
  createdAt: timestamp("created_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: "sentMessages",
  }),
  recipient: one(users, {
    fields: [messages.recipientId],
    references: [users.id],
    relationName: "receivedMessages",
  }),
}));

export const contactRequests = pgTable("contact_requests", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  fromUserId: varchar("from_user_id").notNull().references(() => users.id),
  toUserId: varchar("to_user_id").notNull().references(() => users.id),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  respondedAt: timestamp("responded_at"),
});

export const contactRequestsRelations = relations(contactRequests, ({ one }) => ({
  fromUser: one(users, {
    fields: [contactRequests.fromUserId],
    references: [users.id],
  }),
  toUser: one(users, {
    fields: [contactRequests.toUserId],
    references: [users.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  publicKey: true,
  identityKey: true,
  signedPreKey: true,
  pairingCode: true,
});

export const insertContactSchema = createInsertSchema(contacts).pick({
  userId: true,
  contactId: true,
  status: true,
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  senderId: true,
  recipientId: true,
  encryptedContent: true,
  nonce: true,
  isEncrypted: true,
  selfDestructSeconds: true,
});

export const insertContactRequestSchema = createInsertSchema(contactRequests).pick({
  fromUserId: true,
  toUserId: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type ContactRequest = typeof contactRequests.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type InsertContactRequest = z.infer<typeof insertContactRequestSchema>;
