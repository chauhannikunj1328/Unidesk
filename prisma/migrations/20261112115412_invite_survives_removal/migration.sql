-- DropForeignKey
ALTER TABLE "Invite" DROP CONSTRAINT "Invite_membershipId_fkey";

-- AlterTable
ALTER TABLE "Invite" ALTER COLUMN "membershipId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE SET NULL ON UPDATE CASCADE;
