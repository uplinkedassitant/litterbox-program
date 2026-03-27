const { Connection, Keypair, PublicKey, Transaction, SystemProgram } = require('@solana/web3.js');
const fs = require('fs');

const PROGRAM_ID = new PublicKey('BaLn7BEZCwsLaTqZcdogBy7B8NELJBHQn6Xt5ZnC2erq');
const CONFIG_SIZE = 74;
const POOL_SIZE = 40;

async function main() {
  // Load keypair
  const keypair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync('/tmp/restored-keypair.json', 'utf-8')))
  );
  
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  // Generate new keypairs for accounts (NOT PDAs, just regular keypairs)
  const configKeypair = Keypair.generate();
  const poolKeypair = Keypair.generate();

  console.log('Creating accounts:');
  console.log('Config:', configKeypair.publicKey.toString());
  console.log('Pool:', poolKeypair.publicKey.toString());

  const configRent = await connection.getMinimumBalanceForRentExemption(CONFIG_SIZE);
  const poolRent = await connection.getMinimumBalanceForRentExemption(POOL_SIZE);

  const transaction = new Transaction();
  const blockhash = await connection.getRecentBlockhash();
  transaction.recentBlockhash = blockhash.blockhash;
  transaction.feePayer = keypair.publicKey;

  // Create Config account
  transaction.add(
    SystemProgram.createAccount({
      fromPubkey: keypair.publicKey,
      newAccountPubkey: configKeypair.publicKey,
      lamports: configRent,
      space: CONFIG_SIZE,
      programId: PROGRAM_ID,
    })
  );

  // Create Pool account
  transaction.add(
    SystemProgram.createAccount({
      fromPubkey: keypair.publicKey,
      newAccountPubkey: poolKeypair.publicKey,
      lamports: poolRent,
      space: POOL_SIZE,
      programId: PROGRAM_ID,
    })
  );

  console.log('\n📤 Creating accounts...');
  const signature = await connection.sendTransaction(transaction, [keypair, configKeypair, poolKeypair]);
  console.log('Signature:', signature);
  await connection.confirmTransaction(signature, 'confirmed');

  console.log('✅ Accounts created!');
  console.log('Config:', configKeypair.publicKey.toString());
  console.log('Pool:', poolKeypair.publicKey.toString());
  console.log('\nNow call initialize instruction with these accounts.');
}

main().catch(console.error);
