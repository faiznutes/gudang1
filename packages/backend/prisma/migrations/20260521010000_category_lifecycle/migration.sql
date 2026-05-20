ALTER TABLE "Category" ADD COLUMN "disabledAt" TIMESTAMP(3);

CREATE INDEX "Category_workspaceId_disabledAt_idx" ON "Category"("workspaceId", "disabledAt");
