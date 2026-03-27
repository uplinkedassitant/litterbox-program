const { Connection, Keypair, PublicKey, Transaction, SystemProgram } = require("@solana/web3.js");
const fs = require("fs");
const path = require("path");

// NEW PROGRAM ID!
const PROGRAM_ID = new PublicKey("5w927F3TrrRCuAQ86whve3Qe864oT1gvGFrnd7rSKY3w");
const CONFIG_SEED = "config";
const POOL_SEED = "virtual_pool_v2";
const LITTER_MINT = new PublicKey(process.env.LITTER_MINT || "9EJwVq9dfZHLH1AtRcH9eaJzewq4vmxUJPboja45DoZj");

const VIRTUAL_USDC = BigInt(300_000 * 1_000_000);
const VIRTUAL_LITTER = BigInt(1_073_000_191 * 1_000);
const GRADUATION_THRESHOLD = BigInt(69_000 * 1_000_000);

async function main() {
  const keypairPath = process.env.AUTHORITY_KEYPAIR_PATH || path.join(process.env.HOME || ".", ".config/solana/id.json");
  const payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(keypairPath, "utf-8"))));
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

  const [configPDA] = PublicKey.findProgramAddressSync([Buffer.from(CONFIG_SEED)], PROGRAM_ID);
  const [poolPDA] = PublicKey.findProgramAddressSync([Buffer.from(POOL_SEED)], PROGRAM_ID);

  console.log("🆕 NEW PROGRAM:", PROGRAM_ID.toString());
  console.log("Authority:", payer.publicKey.toString());
  console.log("Config PDA:", configPDA.toString());
  console.log("Pool PDA:", poolPDA.toString());

  const initData = Buffer.alloc(57);
  initData.writeBigUInt64LE(VIRTUAL_USDC, 1);
  initData.writeBigUInt64LE(VIRTUAL_LITTER, 9);
  initData.writeBigUInt64LE(GRADUATION_THRESHOLD, 17);
  LITTER_MINT.toBuffer().copy(initData, 25);

  const transaction = new Transaction();
  transaction.add({
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: LITTER_MINT, isSigner: false, isWritable: false },
      { pubkey: configPDA, isSigner: false, isWritable: true },
      { pubkey: poolPDA, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: initData,
    programId: PROGRAM_ID,
  });

  console.log("\n📤 Initializing fresh program...");
  const signature = await connection.sendTransaction(transaction, [payer]);
  console.log("Signature:", signature);
  await connection.confirmTransaction(signature, "confirmed");

  console.log("\n✅ SUCCESS! Program initialized!");
  console.log("Explorer:", `https://explorer.solana.com/tx/${signature}?cluster=devnet`);
  
  const configInfo = await connection.getAccountInfo(configPDA);
  const poolInfo = await connection.getAccountInfo(poolPDA);
  console.log("\nAccounts created:");
  console.log("Config:", configInfo ? `✅ ${configInfo.data.length} bytes` : "❌ Failed");
  console.log("Pool:", poolInfo ? `✅ ${poolInfo.data.length} bytes` : "❌ Failed");
}

main().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
