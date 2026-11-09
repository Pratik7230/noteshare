import "reflect-metadata";
import pg from "pg";
import { DataSource } from "typeorm";
import { entities } from "./entities/index.js";
import { SnakeNamingStrategy } from "./lib/naming.js";
import { InitialSchema1730000000000 } from "./migrations/1730000000000-InitialSchema.js";
import "dotenv/config";

// Explicitly ensure PostgreSQL driver is loaded
if (!pg) {
  throw new Error("PostgreSQL driver failed to load");
}

export const dataSourceOptions = {
  type: "postgres",
  url: process.env.DATABASE_URL,

  ssl:
    process.env.DATABASE_SSL === "true"
      ? { rejectUnauthorized: false }
      : false,

  entities,

  migrations: [
    InitialSchema1730000000000,
  ],

  namingStrategy: new SnakeNamingStrategy(),

  synchronize: false,

  logging:
    process.env.NODE_ENV !== "production"
      ? ["error", "warn"]
      : ["error"],
};

export default new DataSource(dataSourceOptions);