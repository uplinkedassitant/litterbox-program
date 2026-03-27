/**
 * Initialize LitterBox Program v2 - Fresh start with new pool seed
 */

const { Connection, Keypair, PublicKey, Transaction, SystemProgram } = require('@solana/web3.js');
const path = require('path');
const fs = require('fs');

const PROGRAM_ID = new PublicKey('BaLn7BEZCwsLaTqZcdogBy7B8NELJBHQn6Xt5ZnC2erq');
const LITTER_MINT = new PublicKey('9EJwVq9dfZHLH1AtRcH9eaJzewq4vmxUJPboja45DoZj');
const CONFIG_SEED = 'config';
const POOL_SEED = 'virtual_pool_v2'; // NEW SEED!
const CONFIG_SIZE = 74;
const POOL_SIZE = 40;

async function main() {
  console.log('🚀 Initializing LitterBox v2 with new pool seed\n');

  const payer = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(path.join(process.env.HOME, '.config/solana/id.json'), 'utf-8')))
  );

  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  // Derive NEW PDAs
  const [configPDA] = PublicKey.findProgramAddressSync([Buffer.from(CONFIG_SEED)], PROGRAM_ID);
  const [poolPDA] = PublicKey.findProgramAddressSync([Buffer.from(POOL_SEED)], PROGRAM_ID);

  console.log('Program:', PROGRAM_ID.toString());
  console.log('Config PDA:', configPDA.toString());
  console.log('Pool PDA:', poolPDA.toString(), '(NEW - 40 bytes)');
  console.log('Litter Mint:', LITTER_MINT.toString());

  const configRent = await connection.getMinimumBalanceForRentExemption(CONFIG_SIZE);
  const poolRent = await connection.getMinimumBalanceForRentExemption(POOL_SIZE);

  const initData = Buffer.alloc(57);
  initData[0] = 0;
  initData.writeBigUInt64LE(BigInt(10_000_000), 1);
  initData.writeBigUInt64LE(BigInt(1_000_000_000_000), 9);
  initData.writeBigUInt64LE(BigInt(1_000_000), 17);
  LITTER_MINT.toBuffer().copy(initData, 25);

  const transaction = new Transaction();

  transaction.add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: configPDA,
      lamports: configRent,
      space: CONFIG_SIZE,
      programId: PROGRAM_ID,
    })
  );

  transaction.add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: poolPDA,
      lamports: poolRent,
      space: POOL_SIZE,
      programId: PROGRAM_ID,
    })
  );

  transaction.add({
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: configPDA, isSigner: false, isWritable: true },
      { pubkey: poolPDA, isSigner: false, isWritable: true },
      { pubkey: LITTER_MINT, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: initData,
    programId: PROGRAM_ID,
  });

  console.log('\n📤 Sending initialization...');
  const signature = await connection.sendTransaction(transaction, [payer]);
  await connection.confirmTransaction(signature, 'confirmed');

  console.log('✅ Initialized!');
  console.log('Signature:', `https://explorer.solana.com/tx/${signature}?cluster=devnet`);
  console.log('\nUpdate frontend with these values:');
  console.log('VITE_CONFIG_PDA=' + configPDA.toString());
  console.log('VITE_POOL_PDA=' + poolPDA.toString());
}

main().catch(console.error);
