import "dotenv/config";
import {
  mnemonicToSeedSync,
  mnemonicToEntropy,
} from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import { derivePath } from "ed25519-hd-key";
import { Keypair, PublicKey } from "@solana/web3.js";

function normalizeMnemonic(m: string): string {
  return m
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export class WalletManager {
  private masterSeed: Buffer;
  private mnemonic: string;

  constructor(mnemonic?: string) {
    const envMnemonic = process.env.MASTER_MNEMONIC;

    if (!mnemonic && !envMnemonic) {
      throw new Error("MASTER_MNEMONIC is missing");
    }

    this.mnemonic = normalizeMnemonic(mnemonic || envMnemonic!);

    // ✅ Validate mnemonic
    try {
      mnemonicToEntropy(this.mnemonic, wordlist);
      console.log("✅ Mnemonic validated successfully");
    } catch (err) {
      console.error("❌ Invalid mnemonic phrase");
      throw new Error("Invalid Mnemonic");
    }

    // ✅ Derive master seed
    this.masterSeed = Buffer.from(
      mnemonicToSeedSync(this.mnemonic, "", 
        // @ts-ignore
        wordlist)
    );

    console.log("✅ WalletManager initialized");
  }

  /**
   * Derive a Solana keypair at a specific index
   * Uses standard Solana derivation path: m/44'/501'/{index}'/0'
   */
  deriveKeypair(walletIndex: number): Keypair {
    const path = `m/44'/501'/${walletIndex}'/0'`;

    const derivedSeed = derivePath(
      path,
      this.masterSeed.toString("hex")
    ).key;

    return Keypair.fromSeed(derivedSeed);
  }

  /**
   * Derive public key at a specific index
   */
  derivePublicKey(walletIndex: number): PublicKey {
    const keypair = this.deriveKeypair(walletIndex);
    const pubkey = keypair.publicKey;
    
    // Security: Clear the secret key from memory
    keypair.secretKey.fill(0);
    
    return pubkey;
  }

  /**
   * Derive wallet address (Base58 string) at a specific index
   */
  deriveAddress(walletIndex: number): string {
    return this.derivePublicKey(walletIndex).toBase58();
  }

  /**
   * Derive multiple addresses at once
   */
  deriveAddresses(count: number, startIndex: number = 0): string[] {
    return Array.from({ length: count }, (_, i) => 
      this.deriveAddress(startIndex + i)
    );
  }

  /**
   * Get the mnemonic phrase (use with caution!)
   */
  getMnemonic(): string {
    return this.mnemonic;
  }
}