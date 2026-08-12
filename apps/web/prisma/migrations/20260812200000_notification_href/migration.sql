-- Lets a notification carry where it is about, so it can be clicked through
-- instead of leaving the reader to go and find the thing.
-- AlterTable
ALTER TABLE "Notification" ADD COLUMN "href" TEXT;
