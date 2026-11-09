import "dotenv/config";
import "reflect-metadata";
import { DataSource } from "typeorm";
import { entities } from "./entities/index.js";
import { SnakeNamingStrategy } from "./lib/naming.js";
import { InitialSchema1730000000000 } from "./migrations/1730000000000-InitialSchema.js";

// Used by the app (lib/db.js) and the TypeORM CLI (npm run db:migrate).
export const dataSourceOptions = {
  type: "postgres",
  url: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
  entities,
  migrations: [InitialSchema1730000000000],
  namingStrategy: new SnakeNamingStrategy(),
  synchronize: false, // never in production: schema changes go through migrations
  logging: process.env.NODE_ENV !== "production" ? ["error", "warn"] : ["error"],
};

export default new DataSource(dataSourceOptions);
