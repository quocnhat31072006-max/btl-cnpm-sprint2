import { pgTable, serial, varchar, integer, decimal, boolean, date, timestamp, text } from "drizzle-orm/pg-core";


export const users = pgTable("users", {
  userId: serial("user_id").primaryKey(),
  username: varchar("username", { length: 255 }).notNull(),
  password: varchar("password", { length: 255 }).notNull(), 
  avatar: varchar("avatar", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});


// GROUPS table
export const groups = pgTable("groups", {
  groupId: serial("group_id").primaryKey(),
  groupName: varchar("group_name", { length: 255 }).notNull(),
  createdBy: integer("created_by").references(() => users.userId, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// GROUP_MEMBERS table
export const groupMembers = pgTable("group_members", {
  memberId: serial("member_id").primaryKey(),
  groupId: integer("group_id").references(() => groups.groupId, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => users.userId, { onDelete: "cascade" }),
  role: varchar("role", { length: 50 }).notNull(), 
  joinedAt: timestamp("joined_at").defaultNow(),
});

// EXPENSES table
export const expenses = pgTable("expenses", {
  expenseId: serial("expense_id").primaryKey(),
  groupId: integer("group_id").references(() => groups.groupId, { onDelete: "cascade" }),
  payerId: integer("payer_id").references(() => users.userId, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  date: date("date").defaultNow(),
  note: text("note"),
});

// PAYMENTS table
export const payments = pgTable("payments", {
  paymentId: serial("payment_id").primaryKey(),
  expenseId: integer("expense_id").references(() => expenses.expenseId, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => users.userId, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: boolean("status").default(false), 
  paidAt: timestamp("paid_at"),
});
