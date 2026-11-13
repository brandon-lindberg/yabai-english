ALTER TYPE "AccountStatus" ADD VALUE 'SUSPENDED';

CREATE TABLE "AdminAccountAccessEvent" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "fromStatus" "AccountStatus" NOT NULL,
    "toStatus" "AccountStatus" NOT NULL,
    "reason" VARCHAR(1000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminAccountAccessEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdminAccountAccessEvent_userId_id_idx" ON "AdminAccountAccessEvent"("userId", "id");

ALTER TABLE "AdminAccountAccessEvent" ADD CONSTRAINT "AdminAccountAccessEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
