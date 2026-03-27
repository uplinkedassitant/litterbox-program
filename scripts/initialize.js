/**
 * Initialize LitterBox Program v2
 * Creates Config and Pool PDAs with correct account sizes
 */

const { Connection, Keypair, PublicKey, Transaction, SystemProgram } = require('@solana/web3.js');
const path = require('path');
const fs = require('fs');

// Program configuration
const PROGRAM_ID = new PublicKey('BaLn7BEZCwsLaTqZcdogBy7B8NELJBHQn6Xt5ZnC2erq');
const LITTER_MINT = new PublicKey('9EJwVq9dfZHLH1AtRcH9eaJzewq4vmxUJPboja45DoZj');
const CONFIG_SEED = 'config';
const POOL_SEED = 'virtual_pool';

// Account sizes (MUST match program constants)
const CONFIG_SIZE = 74;
const POOL_SIZE = 40;

// Initial pool parameters
const INITIAL_VIRTUAL_USDC = BigInt(10_000_000); // 10 USDC
const INITIAL_VIRTUAL_LITTER = BigInt(1_000_000_000_000); // 1 trillion Litter
const GRADUATION_THRESHOLD = BigInt(1_000_000); // 1 USDC

async function main() {
  console.log('🚀 Initializing LitterBox Program v2\n');

  // Load keypair
  const payer = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(path.join(process.env.HOME, '.config/solana/id.json'), 'utf-8')))
  );

  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  console.log('Program:', PROGRAM_ID.toString());
  console.log('Authority:', payer.publicKey.toString());
  console.log('Litter Mint:', LITTER_MINT.toString());

  // Derive PDAs
  const [configPDA, configBump] = PublicKey.findProgramAddressSync(
    [Buffer.from(CONFIG_SEED)],
    PROGRAM_ID
  );
  const [poolPDA, poolBump] = PublicKey.findProgramAddressSync(
    [Buffer.from(POOL_SEED)],
    PROGRAM_ID
  );

  console.log('\nConfig PDA:', configPDA.toString(), `(bump: ${configBump})`);
  console.log('Pool PDA:', poolPDA.toString(), `(bump: ${poolBump})`);

  // Calculate rent
  const configRent = await connection.getMinimumBalanceForRentExemption(CONFIG_SIZE);
  const poolRent = await connection.getMinimumBalanceForRentExemption(POOL_SIZE);

  console.log('\nConfig Rent:', configRent / 1e9, 'SOL');
  console.log('Pool Rent:', poolRent / 1e9, 'SOL');

  // Create initialize instruction data
  const initData = Buffer.alloc(57); // 1 (discriminator) + 8 + 8 + 8 + 32
  initData[0] = 0; // discriminator
  initData.writeBigUInt64LE(INITIAL_VIRTUAL_USDC, 1);
  initData.writeBigUInt64LE(INITIAL_VIRTUAL_LITTER, 9);
  initData.writeBigUInt64LE(GRADUATION_THRESHOLD, 17);
  LITTER_MINT.toBuffer().copy(initData, 25);

  // Create transaction with account creation + initialization
  const transaction = new Transaction();

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

  // Send transaction
  console.log('\n📤 Sending initialization transaction...');
  const signature = await connection.sendTransaction(transaction, [payer]);
  await connection.confirmTransaction(signature, 'confirmed');

  console.log('✅ Initialization successful!');
  console.log('Signature:', `https://explorer.solana.com/tx/${signature}?cluster=devnet`);
  console.log('\n📊 Next steps:');
  console.log('1. Update frontend with new program ID');
  console.log('2. Test USDC deposit');
  console.log('3. Test multi-token deposits via Jupiter');
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
