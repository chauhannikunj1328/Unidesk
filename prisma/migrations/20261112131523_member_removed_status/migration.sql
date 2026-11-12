-- AlterEnum
ALTER TYPE "MembershipStatus" ADD VALUE 'REMOVED';

-- AlterTable
ALTER TABLE "Membership" ADD COLUMN     "removedAt" TIMESTAMP(3);
