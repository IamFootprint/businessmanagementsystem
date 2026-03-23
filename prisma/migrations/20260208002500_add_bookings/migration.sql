-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('CREATED', 'CONFIRMED', 'CANCELLED');

-- CreateTable
CREATE TABLE "bookings" (
  "id" TEXT NOT NULL,
  "customer_name" TEXT NOT NULL,
  "customer_phone" TEXT NOT NULL,
  "service_item_id" TEXT,
  "service_package_id" TEXT,
  "status" "BookingStatus" NOT NULL DEFAULT 'CREATED',
  "scheduled_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_status_events" (
  "id" TEXT NOT NULL,
  "booking_id" TEXT NOT NULL,
  "status" "BookingStatus" NOT NULL,
  "note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "booking_status_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "booking_status_events_booking_id_status_idx" ON "booking_status_events"("booking_id", "status");

-- AddForeignKey
ALTER TABLE "booking_status_events" ADD CONSTRAINT "booking_status_events_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
