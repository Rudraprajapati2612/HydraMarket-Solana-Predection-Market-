import "dotenv/config"
import * as bip39 from 'bip39';
import { derivePath } from "ed25519-hd-key";
import { Keypair, PublicKey } from "@solana/web3.js";
export class WalletManager{
    private masterSeed : Buffer;
    private mnemonic : string

    constructor(mnemonic?:string){
        if(!process.env.MASTER_MNEMONIC){
            throw new Error("MASTER MENOMIC is missing ")
        }
        this.mnemonic = mnemonic || process.env.MASTER_MNEMONIC

        if(!this.mnemonic){
            throw new Error("MASTER MENOMIC is not found in env  ")
        }

        if(!bip39.validateMnemonic(this.mnemonic)){
            throw new Error("Invalid Menomic Key")
        }
        //  Convert seed to a mnemonic 
        this.masterSeed = bip39.mnemonicToSeedSync(this.mnemonic);
        console.log(' WalletManager initialized');
        console.log('  MASTER MNEMONIC (KEEP SECURE):');
        console.log(this.mnemonic);
    }

    deriveKeypair(walletIndex:number){
        const path = `m/44'/501'/0'/0'/${walletIndex}`;
        const deriveSeed = derivePath(path,this.masterSeed.toString('hex')).key;

        return Keypair.fromSeed(deriveSeed)
    }

    derivePublicKey(walletIndex: number): PublicKey {
        const keypair = this.deriveKeypair(walletIndex);
        const publicKey = keypair.publicKey;
        
        // Clear keypair from memory
        keypair.secretKey.fill(0);
        
        return publicKey;
      }

    deriveAddress(walletIndex:number){
        return this.derivePublicKey(walletIndex).toBase58();
    }

    //  For future use 
    // verifySignature(
    //     walletIndex: number,
    //     message: Uint8Array,
    //     signature: Uint8Array
    //   ): boolean {
    //     const publicKey = this.derivePublicKey(walletIndex);
    //     // Implement signature verification
    //     return true; // Placeholder
    //   }
}