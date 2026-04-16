-- CreateEnum
CREATE TYPE "BroadcastTarget" AS ENUM ('ALL', 'TEACHERS', 'STUDENTS');

-- CreateTable
CREATE TABLE "AdminBroadcast" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "target" "BroadcastTarget" NOT NULL,
    "body" TEXT NOT NULL,
    "targetedRecipients" INTEGER NOT NULL,
    "sentMessages" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminBroadcast_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminBroadcast_senderId_createdAt_idx" ON "AdminBroadcast"("senderId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminBroadcast_createdAt_idx" ON "AdminBroadcast"("createdAt");

-- AddForeignKey
ALTER TABLE "AdminBroadcast" ADD CONSTRAINT "AdminBroadcast_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
