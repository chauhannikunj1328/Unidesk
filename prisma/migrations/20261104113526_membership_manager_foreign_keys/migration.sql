-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_reportsToId_fkey" FOREIGN KEY ("reportsToId") REFERENCES "Membership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "Membership"("id") ON DELETE SET NULL ON UPDATE CASCADE;
