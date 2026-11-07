import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  customType,
  index,
  jsonb,
  pgEnum,
  pgTable,
  real,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => "bytea",
});

export const themeEnum = pgEnum("theme", ["dark", "light"]);

export const CATEGORIES = ["chapeu", "cima", "casaco", "vestido", "baixo", "calcado", "acessorio"] as const;
export type Category = (typeof CATEGORIES)[number];
export const categoryEnum = pgEnum("category", CATEGORIES);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    /** Rosto recortado em círculo, usado na cabeça do manequim. */
    face: bytea("face"),
    faceType: text("face_type"),
    faceUpdatedAt: timestamp("face_updated_at", { withTimezone: true }),
    /** Foto de corpo inteiro, usada só na prova com IA. */
    body: bytea("body"),
    bodyType: text("body_type"),
    bodyUpdatedAt: timestamp("body_updated_at", { withTimezone: true }),
    theme: themeEnum("theme").notNull().default("dark"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)],
);

export const sessions = pgTable(
  "sessions",
  {
    /** SHA-256 do token enviado no cookie. O token em si nunca é salvo. */
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

/** Uma peça de roupa do armário. A imagem já vem sem fundo e recortada rente à peça. */
export const items = pgTable(
  "items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: categoryEnum("category").notNull(),
    color: text("color"),
    favorite: boolean("favorite").notNull().default(false),
    image: bytea("image").notNull(),
    imageType: text("image_type").notNull(),
    /** Versão menor da foto, para a vitrine e o manequim carregarem rápido. A original fica para o zoom e a IA. */
    thumb: bytea("thumb"),
    thumbType: text("thumb_type"),
    width: smallint("width").notNull(),
    height: smallint("height").notNull(),
    /** Ajuste fino no manequim: tamanho (1 = padrão) e deslocamento em % da área da peça. */
    fitScale: real("fit_scale").notNull().default(1),
    fitX: real("fit_x").notNull().default(0),
    fitY: real("fit_y").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("items_user_idx").on(t.userId, t.category),
    check("items_fit_scale", sql`${t.fitScale} between 0.3 and 2.5`),
  ],
);

/** Um look salvo: combinação de peças e, se houver, a foto gerada pela IA. */
export const looks = pgTable(
  "looks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    itemIds: jsonb("item_ids").$type<string[]>().notNull().default([]),
    aiImage: bytea("ai_image"),
    aiImageType: text("ai_image_type"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("looks_user_idx").on(t.userId, t.createdAt)],
);

export type User = typeof users.$inferSelect;
export type Item = typeof items.$inferSelect;
export type Look = typeof looks.$inferSelect;
