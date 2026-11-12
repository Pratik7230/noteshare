import { EntitySchema } from "typeorm";

export const SiteSetting = new EntitySchema({
  name: "SiteSetting",
  tableName: "site_settings",
  columns: {
    key: { type: "varchar", length: 64, primary: true },
    value: { type: "jsonb" },
    updatedAt: { type: "timestamptz", updateDate: true },
  },
});
