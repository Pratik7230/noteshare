import "reflect-metadata";
import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source.js";

// Reuse one connection across hot reloads in dev and across requests in prod.
const g = globalThis;

export async function getDb() {
  if (!g.__noteshareDb) g.__noteshareDb = new DataSource(dataSourceOptions);
  const ds = g.__noteshareDb;
  if (!ds.isInitialized) await ds.initialize();
  return ds;
}
