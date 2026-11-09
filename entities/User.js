import { EntitySchema } from "typeorm";

export const User = new EntitySchema({
  name: "User",
  tableName: "users",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    name: { type: "varchar", length: 120 },
    email: { type: "varchar", length: 255, unique: true },
    password: { type: "varchar", length: 255, select: false },
    emailVerified: { type: "boolean", default: false },
    emailVerifyTokenHash: { type: "varchar", length: 128, nullable: true, select: false },
    resetTokenHash: { type: "varchar", length: 128, nullable: true, select: false },
    resetTokenExpiresAt: { type: "timestamptz", nullable: true, select: false },
    createdAt: { type: "timestamptz", createDate: true },
    updatedAt: { type: "timestamptz", updateDate: true },
  },
  relations: {
    notes: { type: "one-to-many", target: "Note", inverseSide: "owner" },
  },
});
