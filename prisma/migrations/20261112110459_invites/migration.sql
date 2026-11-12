-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED');

-- AlterTable
ALTER TABLE "Membership" ADD COLUMN     "clientId" TEXT;

-- CreateTable
CREATE TABLE "Invite" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "note" TEXT,
    "batchId" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "createdUser" BOOLEAN NOT NULL DEFAULT false,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "tokenHash" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "deliverAfter" TIMESTAMP(3) NOT NULL,
    "deliveredAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invite_membershipId_key" ON "Invite"("membershipId");

-- CreateIndex
CREATE UNIQUE INDEX "Invite_tokenHash_key" ON "Invite"("tokenHash");

-- CreateIndex
CREATE INDEX "Invite_organizationId_createdAt_idx" ON "Invite"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "Invite_batchId_idx" ON "Invite"("batchId");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;
