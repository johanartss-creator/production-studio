import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export type ProjectColor = {
  name: string;
  hex: string;
  pantone: string;
};

export type ProjectMeasurement = {
  code: string;
  name: string;
  valueCm: number;
  toleranceCm: number;
  gradeRule: string;
};

export type ProjectMaterial = {
  name: string;
  specification: string;
  supplier: string;
};

export type ProjectArtwork = {
  name: string;
  placement: string;
  notes: string;
};

export const projectsTable = pgTable("jnx_projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  styleName: text("style_name").notNull(),
  styleNumber: text("style_number").notNull(),
  garmentType: text("garment_type").notNull(),
  baseSize: text("base_size").notNull().default("M"),
  season: text("season").notNull(),
  fit: text("fit").notNull(),
  description: text("description").notNull().default(""),
  concept: text("concept").notNull().default(""),
  primaryColor: jsonb("primary_color").$type<ProjectColor>().notNull(),
  measurements:
    jsonb("measurements").$type<ProjectMeasurement[]>().notNull(),
  materials: jsonb("materials").$type<ProjectMaterial[]>().notNull(),
  artworks: jsonb("artworks").$type<ProjectArtwork[]>().notNull(),
  revision: integer("revision").notNull().default(1),
  validationState: text("validation_state")
    .notNull()
    .default("PRELIMINARY_UNVALIDATED"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type ProjectRecord = typeof projectsTable.$inferSelect;