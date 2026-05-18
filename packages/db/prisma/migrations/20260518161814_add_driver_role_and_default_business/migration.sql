-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'DRIVER';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "defaultBusinessId" TEXT;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_defaultBusinessId_fkey" FOREIGN KEY ("defaultBusinessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;
