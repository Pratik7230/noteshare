import { EntitySchema } from "typeorm";

export const Tag = new EntitySchema({
  name: "Tag",
  tableName: "tags",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    name: { type: "varchar", length: 50 },
    userId: { type: "uuid" },
  },
  relations: {
    user: { type: "many-to-one", target: "User", onDelete: "CASCADE", joinColumn: { name: "user_id" } },
  },
  uniques: [{ name: "uq_tags_user_name", columns: ["userId", "name"] }],
});
