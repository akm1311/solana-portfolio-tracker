import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Token and portfolio related schemas
export const tokenSchema = z.object({
  mint: z.string(),
  symbol: z.string().optional(),
  name: z.string().optional(),
  decimals: z.number(),
  balance: z.number(),
  uiBalance: z.number(),
  price: z.number().optional(),
  value: z.number().optional(),
  change24h: z.number().optional(),
  icon: z.string().optional(),
});

export type Token = z.infer<typeof tokenSchema>;

export const portfolioSchema = z.object({
  address: z.string(),
  tokens: z.array(tokenSchema),
  totalValue: z.number(),
  tokenCount: z.number(),
  lastUpdated: z.string(),
});

export type Portfolio = z.infer<typeof portfolioSchema>;

export const walletSchema = z.object({
  address: z.string().min(32, "Please enter a valid Solana wallet address"),
});

export type WalletInput = z.infer<typeof walletSchema>;
