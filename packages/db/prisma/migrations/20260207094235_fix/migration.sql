-- AlterTable
CREATE SEQUENCE user_wallets_wallet_index_seq;
ALTER TABLE "user_wallets" ALTER COLUMN "wallet_index" SET DEFAULT nextval('user_wallets_wallet_index_seq');
ALTER SEQUENCE user_wallets_wallet_index_seq OWNED BY "user_wallets"."wallet_index";
