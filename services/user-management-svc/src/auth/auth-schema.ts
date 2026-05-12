/**
 * Drizzle schema for better-auth tables in the `auth` schema.
 * Must stay aligned with `modules/user-management/migrations/0001_better_auth_auth_schema.sql`.
 */
import { boolean, pgSchema, text, timestamp } from "drizzle-orm/pg-core";

const auth = pgSchema("auth");

export const authUser = auth.table("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).notNull(),
  iq_tenant_id: text("iq_tenant_id").notNull(),
  platform_user_id: text("platform_user_id").unique(),
});

export const authSession = auth.table("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt", { withTimezone: true, mode: "date" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => authUser.id, { onDelete: "cascade" }),
});

export const authAccount = auth.table("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => authUser.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt", {
    withTimezone: true,
    mode: "date",
  }),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt", {
    withTimezone: true,
    mode: "date",
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).notNull(),
});

export const authVerification = auth.table("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt", { withTimezone: true, mode: "date" }).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }),
  updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }),
});

export const authJwks = auth.table("jwks", {
  id: text("id").primaryKey(),
  publicKey: text("publicKey").notNull(),
  privateKey: text("privateKey").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).notNull(),
  expiresAt: timestamp("expiresAt", { withTimezone: true, mode: "date" }),
});

export const authSchema = {
  user: authUser,
  session: authSession,
  account: authAccount,
  verification: authVerification,
  jwks: authJwks,
};
