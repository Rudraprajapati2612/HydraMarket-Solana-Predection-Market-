/*
  Warnings:

  - Added the required column `usdc_vault` to the `markets` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "markets" ADD COLUMN     "usdc_vault" TEXT NOT NULL;
