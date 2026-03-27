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
    Uint8Array.from(JSON.parse(fs.readFileSync('/tmp/restored-keypair.json', 'utf-8')))
  );
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  const [configPDA] = PublicKey.findProgramAddressSync([Buffer.from(CONFIG_SEED)], PROGRAM_ID);
  const [poolPDA] = PublicKey.findProgramAddressSync([Buffer.from(POOL_SEED)], PROGRAM_ID);

  console.log('Program:', PROGRAM_ID.toString());
  console.log('Config PDA:', configPDA.toString());
  console.log('Pool PDA:', poolPDA.toString());

  // Check current state
  const configInfo = await connection.getAccountInfo(configPDA);
  const poolInfo = await connection.getAccountInfo(poolPDA);

  console.log('\nCurrent state:');
  console.log('- Config:', configInfo ? `exists (${configInfo.data.length} bytes)` : 'NOT FOUND');
  console.log('- Pool:', poolInfo ? `exists (${poolInfo.data.length} bytes)` : 'NOT FOUND');

  if (poolInfo && poolInfo.data.length === POOL_SIZE) {
    console.log('\n✅ Already initialized!');
    return;
  }

  console.log('\n⚠️ Pool account missing. Creating initialization transaction...');

  const configRent = await connection.getMinimumBalanceForRentExemption(CONFIG_SIZE);
  const poolRent = await connection.getMinimumBalanceForRentExemption(POOL_SIZE);

  // Create init data
  const initData = Buffer.alloc(57);
  initData[0] = 0; // discriminator
  initData.writeBigUInt64LE(BigInt(10_000_000), 1);
  initData.writeBigUInt64LE(BigInt(1_000_000_000_000), 9);
  initData.writeBigUInt64LE(BigInt(1_000_000), 17);
  LITTER_MINT.toBuffer().copy(initData, 25);

  const transaction = new Transaction();
  const blockhash = await connection.getRecentBlockhash();
  transaction.recentBlockhash = blockhash.blockhash;
  transaction.feePayer = payer.publicKey;

  // If Config doesn't exist, create it
  if (!configInfo) {
    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: configPDA,
        lamports: configRent,
        space: CONFIG_SIZE,
        programId: PROGRAM_ID,
      })
    );
  }

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

  console.log('📤 Sending initialization...');
  const signature = await connection.sendTransaction(transaction, [payer]);
  console.log('Signature:', signature);
  console.log('Confirming...');
  await connection.confirmTransaction(signature, 'confirmed');

  console.log('\n✅ Initialization successful!');
  console.log('Explorer:', `https://explorer.solana.com/tx/${signature}?cluster=devnet`);
  console.log('\nPool account size:', POOL_SIZE, 'bytes');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  if (err.message.includes('already in use')) {
    console.log('Account already exists - this is expected for Config');
  } else {
    process.exit(1);
  }
});
