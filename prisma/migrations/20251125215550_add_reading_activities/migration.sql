-- AlterTable
ALTER TABLE "books" ADD COLUMN     "genres" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "reading_activities" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookId" TEXT,
    "activityDate" DATE NOT NULL,
    "pagesRead" INTEGER NOT NULL DEFAULT 0,
    "minutesRead" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reading_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reading_activities_userId_idx" ON "reading_activities"("userId");

-- CreateIndex
CREATE INDEX "reading_activities_activityDate_idx" ON "reading_activities"("activityDate");

-- CreateIndex
CREATE UNIQUE INDEX "reading_activities_userId_activityDate_key" ON "reading_activities"("userId", "activityDate");

-- AddForeignKey
ALTER TABLE "reading_activities" ADD CONSTRAINT "reading_activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
