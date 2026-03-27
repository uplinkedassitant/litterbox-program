const { Connection, Keypair, PublicKey, Transaction, SystemProgram } = require('@solana/web3.js');
const path = require('path');
const fs = require('fs');

const PROGRAM_ID = new PublicKey('BaLn7BEZCwsLaTqZcdogBy7B8NELJBHQn6Xt5ZnC2erq');
const LITTER_MINT = new PublicKey('9EJwVq9dfZHLH1AtRcH9eaJzewq4vmxUJPboja45DoZj');
const CONFIG_SEED = 'config';
const POOL_SEED = 'virtual_pool_v2';
const CONFIG_SIZE = 74;
const POOL_SIZE = 40;

async function main() {
  const payer = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(path.join(process.env.HOME, '.config/solana/id.json'), 'utf-8')))
  );
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  // Derive PDAs
  const [configPDA] = PublicKey.findProgramAddressSync([Buffer.from(CONFIG_SEED)], PROGRAM_ID);
  const [poolPDA] = PublicKey.findProgramAddressSync([Buffer.from(POOL_SEED)], PROGRAM_ID);

  console.log('Program:', PROGRAM_ID.toString());
  console.log('Config PDA:', configPDA.toString());
  console.log('Pool PDA:', poolPDA.toString());
  console.log('Litter Mint:', LITTER_MINT.toString());

  // Check if already initialized
  try {
    const configInfo = await connection.getAccountInfo(configPDA);
    if (configInfo && configInfo.data.length > 0) {
      console.log('✅ Already initialized!');
      return;
    }
  } catch (e) {
    // Account doesn't exist yet, continue
  }

  const configRent = await connection.getMinimumBalanceForRentExemption(CONFIG_SIZE);
  const poolRent = await connection.getMinimumBalanceForRentExemption(POOL_SIZE);

  // Create initialization data (discriminator + params)
  const initData = Buffer.alloc(57);
  initData[0] = 0; // discriminator
  initData.writeBigUInt64LE(BigInt(10_000_000), 1); // virtual_usdc
  initData.writeBigUInt64LE(BigInt(1_000_000_000_000), 9); // virtual_litter
  initData.writeBigUInt64LE(BigInt(1_000_000), 17); // graduation_threshold
  LITTER_MINT.toBuffer().copy(initData, 25); // litter_mint

  const transaction = new Transaction();
  transaction.recentBlockhash = (await connection.getRecentBlockhash()).blockhash;
  transaction.feePayer = payer.publicKey;

  // Create Config account
  transaction.add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: configPDA,
      lamports: configRent,
      space: CONFIG_SIZE,
      programId: PROGRAM_ID,
    })
  );

  // Create Pool account
  transaction.add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: poolPDA,
      lamports: poolRent,
      space: POOL_SIZE,
      programId: PROGRAM_ID,
    })
  );

  // Initialize instruction
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

  console.log('\n📤 Sending initialization transaction...');
  const signature = await connection.sendTransaction(transaction, [payer]);
  console.log('Signature:', signature);
  console.log('Waiting for confirmation...');
  await connection.confirmTransaction(signature, 'confirmed');

  console.log('✅ Initialization successful!');
  console.log('Explorer:', `https://explorer.solana.com/tx/${signature}?cluster=devnet`);
  console.log('\nPool account size:', POOL_SIZE, 'bytes');
  console.log('Config account size:', CONFIG_SIZE, 'bytes');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
