import crypto from "crypto"

export function generateDepositMemo():string{

    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();

    return `DEP-${randomHex}`;
}

export function isValidFormat(memo:string) : boolean{
    if (!memo || typeof memo !== 'string') return false;
  
    
    const regex = /^DEP-[A-F0-9]{6}$/;
    return regex.test(memo.trim().toUpperCase());
}

export function normalizeMemo(memo: string): string {
    return memo.trim().toUpperCase();
}