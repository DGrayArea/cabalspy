import { Connection, PublicKey } from "@solana/web3.js";

// Placeholder for the CabalSpy NFT Collection Mint
// This should be updated by the user provide the actual address
export const CABALSPY_NFT_COLLECTION = "GNH7RSuVoZcWJigTg3adubrPFp4j32U8UaGkKDnvRS9Q"; // Placeholder (matches Jupiter referral for now)

export async function verifyNftOwnership(walletAddress: string): Promise<boolean> {
  if (!walletAddress) return false;

  try {
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
    const connection = new Connection(rpcUrl, "confirmed");
    const ownerPublicKey = new PublicKey(walletAddress);

    // Fetch all token accounts for the owner
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(ownerPublicKey, {
      programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"), // Token Program
    });

    // Check if any token account holds a token from the target collection
    // This is a simplified check. A more robust check would involve Metaplex DAS API 
    // or verifying the Collection metadata of each mint found in the wallet.
    for (const account of tokenAccounts.value) {
      const amount = account.account.data.parsed.info.tokenAmount.uiAmount;
      const mint = account.account.data.parsed.info.mint;

      if (amount > 0 && mint === CABALSPY_NFT_COLLECTION) {
        return true;
      }
    }

    // Secondary check for Token-2022
    const token2022Accounts = await connection.getParsedTokenAccountsByOwner(ownerPublicKey, {
      programId: new PublicKey("TokenzQdBNZ9NE1p961zNxz9mH9m2P5T9rNo"), // Token-2022 Program
    });

    for (const account of token2022Accounts.value) {
      const amount = account.account.data.parsed.info.tokenAmount.uiAmount;
      const mint = account.account.data.parsed.info.mint;

      if (amount > 0 && mint === CABALSPY_NFT_COLLECTION) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error("Error verifying NFT ownership:", error);
    return false;
  }
}
