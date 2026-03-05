/**
 * Jupiter Ultra Referral Account Setup Script
 *
 * Run this ONCE to create your referral account and token accounts
 * for the top fee mints (SOL, USDC, USDT).
 *
 * Usage:
 *   1. Set WALLET_KEYPAIR_PATH to your Solana keypair JSON file
 *   2. Run: npx ts-node scripts/setup-referral.ts
 *   3. Copy the printed referralAccountPubkey into .env as NEXT_PUBLIC_JUPITER_REFERRAL_ACCOUNT
 */

import { ReferralProvider } from "@jup-ag/referral-sdk";
import {
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import * as fs from "fs";

// ─── Config ───────────────────────────────────────────────────────────────────

// Path to your Solana wallet keypair JSON (the wallet that will pay for account creation)
const WALLET_KEYPAIR_PATH =
  process.env.WALLET_KEYPAIR_PATH ||
  `${process.env.HOME}/.config/solana/id.json`;

// Use your Helius RPC for speed
const RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
  "https://api.mainnet-beta.solana.com";

// Jupiter Ultra Referral Project public key (fixed — do not change)
const JUPITER_ULTRA_PROJECT = new PublicKey(
  "DkiqsTrw1u1bYFumumC7sCG2S8K25qc2vemJFHyW2wJc"
);

// Top fee mints to create token accounts for.
// Ultra priority: SOL > stablecoins > LSTs > bluechips
// Creating accounts for these covers ~90%+ of swap volume.
const FEE_MINTS = [
  {
    symbol: "SOL (wSOL)",
    address: "So11111111111111111111111111111111111111112",
  },
  {
    symbol: "USDC",
    address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  {
    symbol: "USDT",
    address: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Load wallet
  if (!fs.existsSync(WALLET_KEYPAIR_PATH)) {
    console.error(`❌ Keypair not found at: ${WALLET_KEYPAIR_PATH}`);
    console.error(
      "   Set WALLET_KEYPAIR_PATH env var or place your keypair at the default path."
    );
    process.exit(1);
  }

  const privateKeyArray = JSON.parse(
    fs.readFileSync(WALLET_KEYPAIR_PATH, "utf8").trim()
  );
  const wallet = Keypair.fromSecretKey(new Uint8Array(privateKeyArray));

  console.log(`\n🔑 Using wallet: ${wallet.publicKey.toBase58()}`);

  const connection = new Connection(RPC_URL, "confirmed");
  const provider = new ReferralProvider(connection);

  // ── Step 1: Create referral account ────────────────────────────────────────
  console.log("\n📋 Step 1: Creating referral account...");

  const referralTx = await provider.initializeReferralAccountWithName({
    payerPubKey: wallet.publicKey,
    partnerPubKey: wallet.publicKey,
    projectPubKey: JUPITER_ULTRA_PROJECT,
    name: "cabalspy",
  });

  const referralAccountPubKey = referralTx.referralAccountPubKey;
  const existingAccount = await connection.getAccountInfo(referralAccountPubKey);

  if (!existingAccount) {
    const sig = await sendAndConfirmTransaction(
      connection,
      referralTx.tx,
      [wallet]
    );
    console.log(`   ✅ Created! Tx: https://solscan.io/tx/${sig}`);
  } else {
    console.log(`   ℹ️  Already exists — skipping creation`);
  }

  console.log(
    `\n   🔑 Referral Account: ${referralAccountPubKey.toBase58()}`
  );
  console.log(
    `   👉 Add this to .env: NEXT_PUBLIC_JUPITER_REFERRAL_ACCOUNT="${referralAccountPubKey.toBase58()}"`
  );

  // ── Step 2: Create token accounts for each fee mint ────────────────────────
  console.log("\n📋 Step 2: Creating referral token accounts...\n");

  for (const mint of FEE_MINTS) {
    console.log(`   Processing ${mint.symbol} (${mint.address})...`);

    try {
      const tokenTx = await provider.initializeReferralTokenAccountV2({
        payerPubKey: wallet.publicKey,
        referralAccountPubKey: referralAccountPubKey,
        mint: new PublicKey(mint.address),
      });

      const existingTokenAccount = await connection.getAccountInfo(
        tokenTx.tokenAccount
      );

      if (!existingTokenAccount) {
        const sig = await sendAndConfirmTransaction(
          connection,
          tokenTx.tx,
          [wallet]
        );
        console.log(`   ✅ Created! Tx: https://solscan.io/tx/${sig}`);
        console.log(`      Token account: ${tokenTx.tokenAccount.toBase58()}`);
      } else {
        console.log(
          `   ℹ️  Already exists: ${tokenTx.tokenAccount.toBase58()}`
        );
      }
    } catch (err: any) {
      console.error(`   ❌ Failed for ${mint.symbol}: ${err.message}`);
    }

    console.log();
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log("─".repeat(60));
  console.log("✅ Setup complete!\n");
  console.log("Add this to your .env file:");
  console.log(
    `NEXT_PUBLIC_JUPITER_REFERRAL_ACCOUNT="${referralAccountPubKey.toBase58()}"`
  );
  console.log(`NEXT_PUBLIC_JUPITER_REFERRAL_FEE="125"`);
  console.log(
    "\nFee collection is now active for SOL, USDC, and USDT swaps."
  );
  console.log(
    "Ultra will automatically pick the best fee mint from this list."
  );
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
