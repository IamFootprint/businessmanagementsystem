/*
  Warnings:

  - You are about to drop the column `booking_id` on the `booking_status_events` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `booking_status_events` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `customer_name` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `customer_phone` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `scheduled_at` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `service_item_id` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `service_package_id` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `service_items` table. All the data in the column will be lost.
  - You are about to drop the column `duration_minutes` on the `service_items` table. All the data in the column will be lost.
  - You are about to drop the column `is_active` on the `service_items` table. All the data in the column will be lost.
  - You are about to drop the column `price_cents` on the `service_items` table. All the data in the column will be lost.
  - You are about to drop the column `sort_order` on the `service_items` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `service_items` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `service_packages` table. All the data in the column will be lost.
  - You are about to drop the column `duration_minutes` on the `service_packages` table. All the data in the column will be lost.
  - You are about to drop the column `is_active` on the `service_packages` table. All the data in the column will be lost.
  - You are about to drop the column `price_cents` on the `service_packages` table. All the data in the column will be lost.
  - You are about to drop the column `sort_order` on the `service_packages` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `service_packages` table. All the data in the column will be lost.
  - You are about to drop the column `base_location` on the `shop_settings` table. All the data in the column will be lost.
  - You are about to drop the column `business_hours` on the `shop_settings` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `shop_settings` table. All the data in the column will be lost.
  - You are about to drop the column `theme_tokens` on the `shop_settings` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `shop_settings` table. All the data in the column will be lost.
  - Added the required column `bookingId` to the `booking_status_events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `customerName` to the `bookings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `customerPhone` to the `bookings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `bookings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `durationMinutes` to the `service_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `priceCents` to the `service_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `service_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `durationMinutes` to the `service_packages` table without a default value. This is not possible if the table is not empty.
  - Added the required column `priceCents` to the `service_packages` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `service_packages` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `shop_settings` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "booking_status_events" DROP CONSTRAINT "booking_status_events_booking_id_fkey";

-- DropIndex
DROP INDEX "booking_status_events_booking_id_status_idx";

-- DropIndex
DROP INDEX "service_items_is_active_sort_order_name_idx";

-- DropIndex
DROP INDEX "service_packages_is_active_sort_order_name_idx";

-- AlterTable
ALTER TABLE "booking_status_events" DROP COLUMN "booking_id",
DROP COLUMN "created_at",
ADD COLUMN     "bookingId" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "bookings" DROP COLUMN "created_at",
DROP COLUMN "customer_name",
DROP COLUMN "customer_phone",
DROP COLUMN "scheduled_at",
DROP COLUMN "service_item_id",
DROP COLUMN "service_package_id",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "customerName" TEXT NOT NULL,
ADD COLUMN     "customerPhone" TEXT NOT NULL,
ADD COLUMN     "scheduledAt" TIMESTAMP(3),
ADD COLUMN     "serviceItemId" TEXT,
ADD COLUMN     "servicePackageId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "service_items" DROP COLUMN "created_at",
DROP COLUMN "duration_minutes",
DROP COLUMN "is_active",
DROP COLUMN "price_cents",
DROP COLUMN "sort_order",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "durationMinutes" INTEGER NOT NULL,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "priceCents" INTEGER NOT NULL,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "service_packages" DROP COLUMN "created_at",
DROP COLUMN "duration_minutes",
DROP COLUMN "is_active",
DROP COLUMN "price_cents",
DROP COLUMN "sort_order",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "durationMinutes" INTEGER NOT NULL,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "priceCents" INTEGER NOT NULL,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "shop_settings" DROP COLUMN "base_location",
DROP COLUMN "business_hours",
DROP COLUMN "created_at",
DROP COLUMN "theme_tokens",
DROP COLUMN "updated_at",
ADD COLUMN     "baseLocation" TEXT,
ADD COLUMN     "businessHours" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "themeTokens" JSONB,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "booking_status_events_bookingId_status_idx" ON "booking_status_events"("bookingId", "status");

-- CreateIndex
CREATE INDEX "service_items_isActive_sortOrder_name_idx" ON "service_items"("isActive", "sortOrder", "name");

-- CreateIndex
CREATE INDEX "service_packages_isActive_sortOrder_name_idx" ON "service_packages"("isActive", "sortOrder", "name");

-- AddForeignKey
ALTER TABLE "booking_status_events" ADD CONSTRAINT "booking_status_events_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
