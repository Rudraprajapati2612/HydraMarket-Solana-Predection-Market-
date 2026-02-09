import { prisma } from "../index.ts";

async function main() {
  await prisma.platformWallet.upsert({
    where: { address: process.env.HOT_WALLET_ADDRESS },
    update: {},
    create: {
      walletType: "HOT",
      address: process.env.HOT_WALLET_ADDRESS!,
      name: "Hot Wallet Treasury",
      purpose: "Deposite Withdrawal and tracing",
      isActive: true,
    },
  });

  // Create cold wallet
  await prisma.platformWallet.upsert({
    where: { address: process.env.COLD_WALLET_ADDRESS! },
    update: {},
    create: {
      walletType: "COLD",
      address: process.env.COLD_WALLET_ADDRESS!,
      name: "Cold Wallet (Storage)",
      purpose: "Long-term storage of funds (80-90% TVL)",
      isActive: true,
    },
  });

  console.log(" Platform wallets seeded!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
