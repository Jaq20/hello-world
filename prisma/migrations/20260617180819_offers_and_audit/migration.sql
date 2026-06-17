-- AlterTable
ALTER TABLE "DealInterest" ADD COLUMN "offerAmount" INTEGER;
ALTER TABLE "DealInterest" ADD COLUMN "offerNote" TEXT;
ALTER TABLE "DealInterest" ADD COLUMN "offerStatus" TEXT;
ALTER TABLE "DealInterest" ADD COLUMN "offeredAt" DATETIME;

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT,
    "entityId" TEXT,
    "detail" TEXT,
    "ip" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");
