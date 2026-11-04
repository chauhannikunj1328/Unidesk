-- AlterTable
ALTER TABLE "Membership" ADD COLUMN     "invitedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "seatLimit" INTEGER NOT NULL DEFAULT 10;
