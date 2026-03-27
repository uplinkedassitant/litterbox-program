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

  console.log('🔍 Checking current state...');
  
  // Check if pool exists
  let poolExists = false;
  try {
    const poolInfo = await connection.getAccountInfo(poolPDA);
    if (poolInfo) {
      console.log('✅ Pool exists with', poolInfo.data.length, 'bytes');
      poolExists = true;
    }
  } catch (e) {}

  if (poolExists) {
    console.log('✅ Already initialized!');
    return;
  }

  console.log('Creating Pool PDA with', POOL_SIZE, 'bytes...');

  const poolRent = await connection.getMinimumBalanceForRentExemption(POOL_SIZE);

  const transaction = new Transaction();
  
  // Create Pool account with PDA
  // Since we can't sign for PDA directly, we need the program to do it
  // For now, let's just create a regular account (not PDA) - but this won't work
  // The proper solution is to have the program create it via invoke_signed
  
  console.log('⚠️ Cannot create PDA manually. The program must create it.');
  console.log('Please use the frontend or CLI to call the initialize instruction.');
  console.log('The initialize instruction should handle PDA creation internally.');
}

main().catch(console.error);
