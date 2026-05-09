-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('monthly', 'yearly', 'manual');

-- CreateEnum
CREATE TYPE "CatalogStatus" AS ENUM ('active', 'archived');

-- CreateEnum
CREATE TYPE "AddonAssignmentStatus" AS ENUM ('active', 'cancelled', 'expired');

-- CreateEnum
CREATE TYPE "SubscriptionSource" AS ENUM ('tenant', 'admin', 'manual', 'system');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('in_app', 'email', 'whatsapp');

-- CreateEnum
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('pending', 'sent', 'failed', 'skipped');

-- AlterTable
ALTER TABLE "Subscription"
ADD COLUMN "planPackageId" TEXT,
ADD COLUMN "billingCycle" "BillingCycle" NOT NULL DEFAULT 'monthly',
ADD COLUMN "amountSnapshot" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "source" "SubscriptionSource" NOT NULL DEFAULT 'tenant',
ADD COLUMN "graceEndsAt" TIMESTAMP(3),
ADD COLUMN "renewalReminderSentAt" TIMESTAMP(3),
ADD COLUMN "expiredProcessedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PlanPackage" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "CatalogStatus" NOT NULL DEFAULT 'active',
    "monthlyPrice" INTEGER NOT NULL DEFAULT 0,
    "yearlyPrice" INTEGER,
    "originalMonthlyPrice" INTEGER,
    "trialDays" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "warehouseLimit" INTEGER NOT NULL DEFAULT 1,
    "productLimit" INTEGER NOT NULL DEFAULT 100,
    "userLimit" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanFeature" (
    "id" TEXT NOT NULL,
    "planPackageId" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "limit" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Addon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "CatalogStatus" NOT NULL DEFAULT 'active',
    "monthlyPrice" INTEGER NOT NULL DEFAULT 0,
    "yearlyPrice" INTEGER,
    "featureKey" TEXT,
    "limitKey" TEXT,
    "limitIncrement" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Addon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceAddon" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "addonId" TEXT NOT NULL,
    "status" "AddonAssignmentStatus" NOT NULL DEFAULT 'active',
    "billingCycle" "BillingCycle" NOT NULL DEFAULT 'manual',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "amountSnapshot" INTEGER NOT NULL DEFAULT 0,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "assignedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceAddon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionEvent" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "workspaceAddonId" TEXT,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationDelivery" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "userId" TEXT,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'in_app',
    "type" TEXT NOT NULL,
    "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'pending',
    "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "payload" JSONB NOT NULL,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlanPackage_code_key" ON "PlanPackage"("code");

-- CreateIndex
CREATE INDEX "PlanPackage_status_sortOrder_idx" ON "PlanPackage"("status", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "PlanFeature_planPackageId_feature_key" ON "PlanFeature"("planPackageId", "feature");

-- CreateIndex
CREATE INDEX "PlanFeature_feature_idx" ON "PlanFeature"("feature");

-- CreateIndex
CREATE UNIQUE INDEX "Addon_code_key" ON "Addon"("code");

-- CreateIndex
CREATE INDEX "Addon_status_sortOrder_idx" ON "Addon"("status", "sortOrder");

-- CreateIndex
CREATE INDEX "WorkspaceAddon_workspaceId_status_idx" ON "WorkspaceAddon"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "WorkspaceAddon_addonId_status_idx" ON "WorkspaceAddon"("addonId", "status");

-- CreateIndex
CREATE INDEX "SubscriptionEvent_workspaceId_createdAt_idx" ON "SubscriptionEvent"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "SubscriptionEvent_subscriptionId_idx" ON "SubscriptionEvent"("subscriptionId");

-- CreateIndex
CREATE INDEX "SubscriptionEvent_workspaceAddonId_idx" ON "SubscriptionEvent"("workspaceAddonId");

-- CreateIndex
CREATE INDEX "SubscriptionEvent_type_idx" ON "SubscriptionEvent"("type");

-- CreateIndex
CREATE INDEX "NotificationDelivery_workspaceId_status_scheduledAt_idx" ON "NotificationDelivery"("workspaceId", "status", "scheduledAt");

-- CreateIndex
CREATE INDEX "NotificationDelivery_type_scheduledAt_idx" ON "NotificationDelivery"("type", "scheduledAt");

-- CreateIndex
CREATE INDEX "Subscription_planPackageId_idx" ON "Subscription"("planPackageId");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planPackageId_fkey" FOREIGN KEY ("planPackageId") REFERENCES "PlanPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanFeature" ADD CONSTRAINT "PlanFeature_planPackageId_fkey" FOREIGN KEY ("planPackageId") REFERENCES "PlanPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceAddon" ADD CONSTRAINT "WorkspaceAddon_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceAddon" ADD CONSTRAINT "WorkspaceAddon_addonId_fkey" FOREIGN KEY ("addonId") REFERENCES "Addon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceAddon" ADD CONSTRAINT "WorkspaceAddon_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionEvent" ADD CONSTRAINT "SubscriptionEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionEvent" ADD CONSTRAINT "SubscriptionEvent_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionEvent" ADD CONSTRAINT "SubscriptionEvent_workspaceAddonId_fkey" FOREIGN KEY ("workspaceAddonId") REFERENCES "WorkspaceAddon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionEvent" ADD CONSTRAINT "SubscriptionEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
