const { Connection, Keypair, PublicKey, Transaction } = require('@solana/web3.js');
const path = require('path');
const fs = require('fs');

const PROGRAM_ID = new PublicKey('BaLn7BEZCwsLaTqZcdogBy7B8NELJBHQn6Xt5ZnC2erq');
const LITTER_MINT = new PublicKey('9EJwVq9dfZHLH1AtRcH9eaJzewq4vmxUJPboja45DoZj');

async function main() {
  const payer = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(path.join(process.env.HOME, '.config/solana/id.json'), 'utf-8')))
  );
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  const [configPDA] = PublicKey.findProgramAddressSync([Buffer.from('config')], PROGRAM_ID);
  const [poolPDA] = PublicKey.findProgramAddressSync([Buffer.from('virtual_pool_v2')], PROGRAM_ID);

  console.log('Program:', PROGRAM_ID.toString());
  console.log('Config PDA:', configPDA.toString());
  console.log('Pool PDA:', poolPDA.toString());

  // Check if already initialized
  try {
    const poolInfo = await connection.getAccountInfo(poolPDA);
    if (poolInfo && poolInfo.data.length === 40) {
      console.log('✅ Already initialized!');
      return;
    }
  } catch (e) {}

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

  // Just call initialize - program will create accounts internally
  transaction.add({
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: configPDA, isSigner: false, isWritable: true },
      { pubkey: poolPDA, isSigner: false, isWritable: true },
      { pubkey: LITTER_MINT, isSigner: false, isWritable: false },
      { pubkey: new PublicKey('11111111111111111111111111111111'), isSigner: false, isWritable: false },
    ],
    data: initData,
    programId: PROGRAM_ID,
  });

  console.log('\n📤 Sending initialize instruction...');
  const signature = await connection.sendTransaction(transaction, [payer]);
  console.log('Signature:', signature);
  console.log('Confirming...');
  await connection.confirmTransaction(signature, 'confirmed');

  console.log('✅ Success!');
  console.log('Explorer:', `https://explorer.solana.com/tx/${signature}?cluster=devnet`);
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
