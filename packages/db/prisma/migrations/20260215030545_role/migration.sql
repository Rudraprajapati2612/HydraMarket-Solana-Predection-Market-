/*
  Warnings:

  - You are about to drop the column `is_admin` on the `user` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'SUPERADMIN');

-- AlterTable
ALTER TABLE "user" DROP COLUMN "is_admin",
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'USER';
