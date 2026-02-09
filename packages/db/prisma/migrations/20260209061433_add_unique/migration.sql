/*
  Warnings:

  - A unique constraint covering the columns `[deposie_memo]` on the table `user` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "user_deposie_memo_key" ON "user"("deposie_memo");
