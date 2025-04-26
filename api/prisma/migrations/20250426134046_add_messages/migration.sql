/*
  Warnings:

  - You are about to drop the column `votedAt` on the `Vote` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "Message" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "communityId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    CONSTRAINT "Message_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Message_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Vote" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "proposalId" INTEGER NOT NULL,
    "voterId" INTEGER NOT NULL,
    "voteType" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Vote_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Vote_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Vote" ("id", "proposalId", "voteType", "voterId") SELECT "id", "proposalId", "voteType", "voterId" FROM "Vote";
DROP TABLE "Vote";
ALTER TABLE "new_Vote" RENAME TO "Vote";
CREATE UNIQUE INDEX "Vote_proposalId_voterId_key" ON "Vote"("proposalId", "voterId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
