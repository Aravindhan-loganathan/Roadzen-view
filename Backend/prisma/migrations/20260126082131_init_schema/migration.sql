-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "CongestionLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "ViolationStatus" AS ENUM ('PENDING', 'ISSUED', 'PAID');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrafficSignal" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "currentGreen" TEXT,
    "countdown" INTEGER NOT NULL DEFAULT 0,
    "congestionLevel" "CongestionLevel" NOT NULL DEFAULT 'LOW',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrafficSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lane" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "vehicleCount" INTEGER NOT NULL DEFAULT 0,
    "density" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "status" "CongestionLevel" NOT NULL DEFAULT 'LOW',
    "signalId" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lane_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Violation" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "vehicleNumber" TEXT NOT NULL,
    "fineAmount" DOUBLE PRECISION NOT NULL,
    "status" "ViolationStatus" NOT NULL DEFAULT 'PENDING',
    "imageUrl" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locationText" TEXT,
    "signalId" INTEGER,

    CONSTRAINT "Violation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmergencyAlert" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "locationText" TEXT NOT NULL,
    "eta" TEXT,
    "priority" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "signalId" INTEGER,

    CONSTRAINT "EmergencyAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrafficLog" (
    "id" SERIAL NOT NULL,
    "vehicleCount" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "signalId" INTEGER NOT NULL,

    CONSTRAINT "TrafficLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Lane" ADD CONSTRAINT "Lane_signalId_fkey" FOREIGN KEY ("signalId") REFERENCES "TrafficSignal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Violation" ADD CONSTRAINT "Violation_signalId_fkey" FOREIGN KEY ("signalId") REFERENCES "TrafficSignal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyAlert" ADD CONSTRAINT "EmergencyAlert_signalId_fkey" FOREIGN KEY ("signalId") REFERENCES "TrafficSignal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficLog" ADD CONSTRAINT "TrafficLog_signalId_fkey" FOREIGN KEY ("signalId") REFERENCES "TrafficSignal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
