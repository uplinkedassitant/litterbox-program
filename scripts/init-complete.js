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

  const [configPDA] = PublicKey.findProgramAddressSync([Buffer.from(CONFIG_SEED)], PROGRAM_ID);
  const [poolPDA] = PublicKey.findProgramAddressSync([Buffer.from(POOL_SEED)], PROGRAM_ID);

  console.log('Program:', PROGRAM_ID.toString());
  console.log('Config PDA:', configPDA.toString());
  console.log('Pool PDA:', poolPDA.toString(), '(' + POOL_SIZE + ' bytes)');

  // Check if pool already exists
  try {
    const poolInfo = await connection.getAccountInfo(poolPDA);
    if (poolInfo && poolInfo.data.length === POOL_SIZE) {
      console.log('✅ Pool account already exists with correct size!');
      return;
    }
  } catch (e) {
    // Pool doesn't exist, continue
  }

  console.log('⚠️ Pool account needs to be created. Please use the program\'s initialize instruction.');
  console.log('The pool must be created by the program, not manually.');
  console.log('');
  console.log('Current state:');
  console.log('- Config account:', configPDA.toString(), '- exists');
  console.log('- Pool account:', poolPDA.toString(), '- MISSING');
  console.log('');
  console.log('You need to call the initialize instruction which will:');
  console.log('1. Create Config PDA (74 bytes)');
  console.log('2. Create Pool PDA (40 bytes)');
  console.log('3. Initialize both with proper data');
}

main().catch(console.error);
