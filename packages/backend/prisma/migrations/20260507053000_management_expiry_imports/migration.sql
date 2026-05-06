ALTER TABLE "User" ADD COLUMN "disabledAt" TIMESTAMP(3);
ALTER TABLE "Product" ADD COLUMN "disabledAt" TIMESTAMP(3);
ALTER TABLE "Warehouse" ADD COLUMN "disabledAt" TIMESTAMP(3);
ALTER TABLE "Supplier" ADD COLUMN "disabledAt" TIMESTAMP(3);

CREATE TABLE "ScheduledActivity" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "description" TEXT,
  "dueAt" TIMESTAMP(3),
  "disabledAt" TIMESTAMP(3),
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ScheduledActivity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ScheduledActivity_workspaceId_status_idx" ON "ScheduledActivity"("workspaceId", "status");
CREATE INDEX "ScheduledActivity_workspaceId_dueAt_idx" ON "ScheduledActivity"("workspaceId", "dueAt");

ALTER TABLE "ScheduledActivity"
  ADD CONSTRAINT "ScheduledActivity_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ScheduledActivity"
  ADD CONSTRAINT "ScheduledActivity_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
