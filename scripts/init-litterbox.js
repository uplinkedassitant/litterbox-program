/**
 * init-litterbox.js
 *
 * Initialisation script for the LitterBox program.
 * Compatible with @solana/web3.js v1.x
 *
 * Usage:
 *   node init-litterbox.js
 *
 * Prerequisites:
 *   npm install @solana/web3.js
 *   Set AUTHORITY_KEYPAIR_PATH and LITTER_MINT env vars, or edit the
 *   constants below.
 */

const {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
  clusterApiUrl,
} = require("@solana/web3.js");
const fs = require("fs");

// ── Config ────────────────────────────────────────────────────────────────────

const PROGRAM_ID = new PublicKey(
  "BaLn7BEZCwsLaTqZcdogBy7B8NELJBHQn6Xt5ZnC2erq"
);

// Path to your authority wallet keypair JSON (solana-keygen output)
const AUTHORITY_KEYPAIR_PATH =
  process.env.AUTHORITY_KEYPAIR_PATH ||
  require("os").homedir() + "/.config/solana/id.json";

// The $LITTER SPL mint address
const LITTER_MINT = new PublicKey(
  process.env.LITTER_MINT || "11111111111111111111111111111111" // replace!
);

// Bonding curve parameters
const VIRTUAL_USDC          = BigInt(300_000 * 1_000_000);   // 300k USDC (6 decimals)
const VIRTUAL_LITTER        = BigInt(1_073_000_191 * 1_000); // virtual $LITTER supply
const GRADUATION_THRESHOLD  = BigInt(69_000 * 1_000_000);    // 69k USDC

const RPC_URL = process.env.RPC_URL || clusterApiUrl("devnet");

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Encode a BigInt as a little-endian u64 Buffer */
function encodeU64(value) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(value);
  return buf;
}

/** Derive the Config PDA: seeds = ["config"] */
function getConfigPda() {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    PROGRAM_ID
  );
}

/** Derive the Pool PDA: seeds = ["virtual_pool_v2"] */
function getPoolPda() {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("virtual_pool_v2")],
    PROGRAM_ID
  );
}

/**
 * Build the initialize instruction.
 *
 * Data layout (57 bytes total):
 *   [0]      discriminator = 0
 *   [1..9]   virtual_usdc         u64 LE
 *   [9..17]  virtual_litter       u64 LE
 *   [17..25] graduation_threshold u64 LE
 *   [25..57] litter_mint_key      [u8; 32]
 */
function buildInitializeIx(authority, litterMint, configPda, poolPda) {
  const data = Buffer.concat([
    Buffer.from([0]),                       // discriminator
    encodeU64(VIRTUAL_USDC),
    encodeU64(VIRTUAL_LITTER),
    encodeU64(GRADUATION_THRESHOLD),
    litterMint.toBuffer(),
  ]);

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      // 0. authority — signer, writable (pays rent)
      { pubkey: authority,              isSigner: true,  isWritable: true  },
      // 1. litter_mint — read-only
      { pubkey: litterMint,             isSigner: false, isWritable: false },
      // 2. config_pda — writable, will be created by the program
      { pubkey: configPda,              isSigner: false, isWritable: true  },
      // 3. pool_pda — writable, will be created by the program
      { pubkey: poolPda,                isSigner: false, isWritable: true  },
      // 4. system_program
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // Load authority keypair
  const raw = JSON.parse(fs.readFileSync(AUTHORITY_KEYPAIR_PATH, "utf-8"));
  const authority = Keypair.fromSecretKey(Uint8Array.from(raw));

  console.log("Authority :", authority.publicKey.toBase58());
  console.log("Program ID:", PROGRAM_ID.toBase58());
  console.log("Mint      :", LITTER_MINT.toBase58());

  // Derive PDAs
  const [configPda, configBump] = getConfigPda();
  const [poolPda,   poolBump]   = getPoolPda();
  console.log(`Config PDA: ${configPda.toBase58()} (bump ${configBump})`);
  console.log(`Pool PDA  : ${poolPda.toBase58()}   (bump ${poolBump})`);

  // Connect
  const connection = new Connection(RPC_URL, "confirmed");

  // Check if already initialised
  const existing = await connection.getAccountInfo(configPda);
  if (existing !== null && existing.data.length > 0) {
    console.log("⚠️  Config PDA already exists — program already initialised.");
    process.exit(0);
  }

  // Build and send transaction
  const ix = buildInitializeIx(
    authority.publicKey,
    LITTER_MINT,
    configPda,
    poolPda
  );

  const tx = new Transaction().add(ix);
  tx.feePayer = authority.publicKey;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

  const sig = await sendAndConfirmTransaction(connection, tx, [authority], {
    commitment: "confirmed",
    skipPreflight: false,
  });

  console.log("✅ Initialised!");
  console.log(`   Signature : ${sig}`);
  console.log(`   Explorer  : https://explorer.solana.com/tx/${sig}?cluster=devnet`);

  // Read back and verify
  const configInfo = await connection.getAccountInfo(configPda);
  const poolInfo   = await connection.getAccountInfo(poolPda);

  console.log("\n── Config account ──────────────────────────────────");
  console.log("  data length :", configInfo.data.length, "bytes");
  console.log("  owner       :", configInfo.owner.toBase58());

  console.log("\n── Pool account ────────────────────────────────────");
  console.log("  data length :", poolInfo.data.length, "bytes");
  console.log("  owner       :", poolInfo.owner.toBase58());
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
