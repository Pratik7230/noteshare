// Verifies every entity maps correctly, without needing a database.
import "reflect-metadata";
import { DataSource } from "typeorm";
import { dataSourceOptions } from "../data-source.js";

const ds = new DataSource({ ...dataSourceOptions, url: "postgres://x:x@localhost/x" });
await ds.buildMetadatas();
for (const m of ds.entityMetadatas) {
  console.log(m.tableName.padEnd(22), m.columns.map((c) => c.databaseName).join(", "));
}
console.log(`\nOK: ${ds.entityMetadatas.length} entities mapped`);
