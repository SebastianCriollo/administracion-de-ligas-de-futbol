-- CreateEnum
CREATE TYPE "SourceTake" AS ENUM ('WINNER', 'LOSER');

-- DropIndex
DROP INDEX "Match_awaySourceMatchId_key";

-- DropIndex
DROP INDEX "Match_homeSourceMatchId_key";

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "awaySourceTake" "SourceTake" NOT NULL DEFAULT 'WINNER',
ADD COLUMN     "homeSourceTake" "SourceTake" NOT NULL DEFAULT 'WINNER';
