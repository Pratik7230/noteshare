import { EntitySchema } from "typeorm";

export const AuditLog = new EntitySchema({
  name: "AuditLog",
  tableName: "audit_logs",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    adminId: { type: "uuid", nullable: true },
    adminEmail: { type: "varchar", length: 255 }, // snapshot, so the log survives account deletion
    action: { type: "varchar", length: 64 },
    targetType: { type: "varchar", length: 32, nullable: true },
    targetId: { type: "varchar", length: 64, nullable: true },
    meta: { type: "jsonb", nullable: true },
    createdAt: { type: "timestamptz", createDate: true },
  },
});
