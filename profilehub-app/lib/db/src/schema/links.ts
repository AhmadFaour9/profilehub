import { pgTable, text, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const linksTable = pgTable("links", {
  id: text("id").primaryKey(),
  profileId: text("profile_id").notNull(),
  title: text("title").notNull(),
  url: text("url").notNull(),
  description: text("description"),
  icon: text("icon"),
  thumbnailUrl: text("thumbnail_url"),
  isActive: boolean("is_active").notNull().default(true),
  isPinned: boolean("is_pinned").notNull().default(false),
  order: integer("order").notNull().default(0),
  clickCount: integer("click_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertLinkSchema = createInsertSchema(linksTable).omit({ createdAt: true });
export type InsertLink = z.infer<typeof insertLinkSchema>;
export type Link = typeof linksTable.$inferSelect;
