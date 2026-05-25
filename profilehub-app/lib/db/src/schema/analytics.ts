import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const pageViewsTable = pgTable("page_views", {
  id: text("id").primaryKey(),
  profileId: text("profile_id").notNull(),
  date: text("date").notNull(),
  country: text("country"),
  referrer: text("referrer"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const linkClicksTable = pgTable("link_clicks", {
  id: text("id").primaryKey(),
  linkId: text("link_id").notNull(),
  profileId: text("profile_id").notNull(),
  country: text("country"),
  referrer: text("referrer"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPageViewSchema = createInsertSchema(pageViewsTable).omit({ createdAt: true });
export type InsertPageView = z.infer<typeof insertPageViewSchema>;
export type PageView = typeof pageViewsTable.$inferSelect;

export const insertLinkClickSchema = createInsertSchema(linkClicksTable).omit({ createdAt: true });
export type InsertLinkClick = z.infer<typeof insertLinkClickSchema>;
export type LinkClick = typeof linkClicksTable.$inferSelect;
