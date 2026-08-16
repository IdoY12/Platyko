-- AlterTable
ALTER TABLE "User" ADD COLUMN "appleSub" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_appleSub_key" ON "User"("appleSub");
