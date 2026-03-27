const { Connection, Keypair, PublicKey, Transaction, SystemProgram } = require('@solana/web3.js');
const path = require('path');
const fs = require('fs');

const PROGRAM_ID = new PublicKey('BaLn7BEZCwsLaTqZcdogBy7B8NELJBHQn6Xt5ZnC2erq');
const POOL_SEED = 'virtual_pool_v2';
const POOL_SIZE = 40;

async function main() {
  const payer = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(path.join(process.env.HOME, '.config/solana/id.json'), 'utf-8')))
  );
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const [poolPDA] = PublicKey.findProgramAddressSync([Buffer.from(POOL_SEED)], PROGRAM_ID);

  console.log('Creating Pool PDA:', poolPDA.toString(), '(' + POOL_SIZE + ' bytes)');

  const poolRent = await connection.getMinimumBalanceForRentExemption(POOL_SIZE);

  const transaction = new Transaction();
  transaction.recentBlockhash = (await connection.getRecentBlockhash()).blockhash;
  transaction.feePayer = payer.publicKey;

  transaction.add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: poolPDA,
      lamports: poolRent,
      space: POOL_SIZE,
      programId: PROGRAM_ID,
    })
  );

  console.log('📤 Sending transaction...');
  const signature = await connection.sendTransaction(transaction, [payer]);
  console.log('Signature:', signature);
  console.log('Waiting for confirmation...');
  await connection.confirmTransaction(signature, 'confirmed');

  console.log('✅ Pool account created!');
  console.log('Explorer:', `https://explorer.solana.com/account/${poolPDA}?cluster=devnet`);
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
