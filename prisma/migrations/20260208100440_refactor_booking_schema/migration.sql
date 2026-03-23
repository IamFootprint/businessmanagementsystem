/*
  Warnings:

  - The values [CREATED] on the enum `BookingStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `createdAt` on the `booking_status_events` table. All the data in the column will be lost.
  - You are about to drop the column `addressLat` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `addressLng` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `scheduledAt` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `selectedItemName` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `selectionType` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `serviceItemId` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `servicePackageId` on the `bookings` table. All the data in the column will be lost.
  - Added the required column `scheduledEndAt` to the `bookings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `scheduledStartAt` to the `bookings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `selectedPackageId` to the `bookings` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "BookingStatus_new" AS ENUM ('DRAFT', 'PENDING_CONFIRMATION', 'CONFIRMED', 'CANCELLED');
ALTER TABLE "bookings" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "bookings" ALTER COLUMN "status" TYPE "BookingStatus_new" USING ("status"::text::"BookingStatus_new");
ALTER TABLE "booking_status_events" ALTER COLUMN "status" TYPE "BookingStatus_new" USING ("status"::text::"BookingStatus_new");
ALTER TYPE "BookingStatus" RENAME TO "BookingStatus_old";
ALTER TYPE "BookingStatus_new" RENAME TO "BookingStatus";
DROP TYPE "BookingStatus_old";
ALTER TABLE "bookings" ALTER COLUMN "status" SET DEFAULT 'PENDING_CONFIRMATION';
COMMIT;

-- AlterTable
ALTER TABLE "booking_status_events" DROP COLUMN "createdAt",
ADD COLUMN     "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "bookings" DROP COLUMN "addressLat",
DROP COLUMN "addressLng",
DROP COLUMN "scheduledAt",
DROP COLUMN "selectedItemName",
DROP COLUMN "selectionType",
DROP COLUMN "serviceItemId",
DROP COLUMN "servicePackageId",
ADD COLUMN     "scheduledEndAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "scheduledStartAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "selectedPackageId" TEXT NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'PENDING_CONFIRMATION';

-- DropEnum
DROP TYPE "BookingSelectionType";

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_selectedPackageId_fkey" FOREIGN KEY ("selectedPackageId") REFERENCES "service_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
