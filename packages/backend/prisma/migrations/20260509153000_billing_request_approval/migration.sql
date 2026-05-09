-- CreateEnum
CREATE TYPE "BillingRequestType" AS ENUM ('plan_change', 'addon_activation', 'limit_increase', 'subscription_extension', 'custom_feature', 'manual_adjustment', 'enterprise_customization');

-- CreateEnum
CREATE TYPE "BillingRequestStatus" AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

-- CreateEnum
CREATE TYPE "CustomizationClassification" AS ENUM ('rejected', 'future_roadmap', 'enterprise_only', 'billable_customization', 'global_feature_candidate');

-- CreateTable
CREATE TABLE "BillingRequest" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "requestedById" TEXT,
    "reviewedById" TEXT,
    "type" "BillingRequestType" NOT NULL,
    "status" "BillingRequestStatus" NOT NULL DEFAULT 'pending',
    "currentPlanPackageId" TEXT,
    "requestedPlanPackageId" TEXT,
    "addonId" TEXT,
    "billingCycle" "BillingCycle" NOT NULL DEFAULT 'monthly',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "requestedLimitKey" TEXT,
    "requestedLimitValue" INTEGER,
    "currentAmount" INTEGER NOT NULL DEFAULT 0,
    "requestedAmount" INTEGER NOT NULL DEFAULT 0,
    "billingImpact" INTEGER NOT NULL DEFAULT 0,
    "requestedActivationDate" TIMESTAMP(3),
    "approvedActivationDate" TIMESTAMP(3),
    "approvedAmount" INTEGER,
    "promotionalAmount" INTEGER,
    "temporaryAccessUntil" TIMESTAMP(3),
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "adminNotes" TEXT,
    "rejectionReason" TEXT,
    "classification" "CustomizationClassification",
    "metadata" JSONB,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingRequestHistory" (
    "id" TEXT NOT NULL,
    "billingRequestId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "fromStatus" "BillingRequestStatus",
    "toStatus" "BillingRequestStatus",
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingRequestHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BillingRequest_workspaceId_status_createdAt_idx" ON "BillingRequest"("workspaceId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "BillingRequest_type_status_createdAt_idx" ON "BillingRequest"("type", "status", "createdAt");

-- CreateIndex
CREATE INDEX "BillingRequest_requestedPlanPackageId_idx" ON "BillingRequest"("requestedPlanPackageId");

-- CreateIndex
CREATE INDEX "BillingRequest_addonId_idx" ON "BillingRequest"("addonId");

-- CreateIndex
CREATE INDEX "BillingRequestHistory_billingRequestId_createdAt_idx" ON "BillingRequestHistory"("billingRequestId", "createdAt");

-- CreateIndex
CREATE INDEX "BillingRequestHistory_userId_idx" ON "BillingRequestHistory"("userId");

-- AddForeignKey
ALTER TABLE "BillingRequest" ADD CONSTRAINT "BillingRequest_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingRequest" ADD CONSTRAINT "BillingRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingRequest" ADD CONSTRAINT "BillingRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingRequest" ADD CONSTRAINT "BillingRequest_currentPlanPackageId_fkey" FOREIGN KEY ("currentPlanPackageId") REFERENCES "PlanPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingRequest" ADD CONSTRAINT "BillingRequest_requestedPlanPackageId_fkey" FOREIGN KEY ("requestedPlanPackageId") REFERENCES "PlanPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingRequest" ADD CONSTRAINT "BillingRequest_addonId_fkey" FOREIGN KEY ("addonId") REFERENCES "Addon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingRequestHistory" ADD CONSTRAINT "BillingRequestHistory_billingRequestId_fkey" FOREIGN KEY ("billingRequestId") REFERENCES "BillingRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingRequestHistory" ADD CONSTRAINT "BillingRequestHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
