# LitterBox Program - Deployment & Initialization Guide

## Program Overview

LitterBox is a Solana program for token recycling with bonding curve mechanics.

**Current Deployment:**
- **Program ID:** `5w927F3TrrRCuAQ86whve3Qe864oT1gvGFrnd7rSKY3w`
- **Network:** Solana Devnet
- **Status:** ✅ Deployed and Initialized

## Prerequisites

1. **Rust Toolchain** (rustc >= 1.79)
   ```bash
   rustup install stable
   rustup default stable
   ```

2. **Solana CLI**
   ```bash
   sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
   ```

3. **Node.js** (for initialization script)

## Building the Program

```bash
cd litterbox-final
cargo build-sbf
```

The compiled program will be at:
```
target/sbf-solana-solana/release/litterbox_final.so
```

## Deployment Steps

### Step 1: Prepare Authority Keypair

The authority keypair will own the program and pay for account creation.

```bash
# Generate new keypair (or use existing)
solana-keygen new --outfile litterbox-authority.json

# IMPORTANT: Back up this keypair securely!
# Never commit it to git or share it publicly.
```

### Step 2: Deploy Program

```bash
solana program deploy \
  --url devnet \
  --keypair litterbox-authority.json \
  target/sbf-solana-solana/release/litterbox_final.so
```

**Save the Program ID** - you'll need it for initialization and frontend configuration.

### Step 3: Fund Authority Account

The authority account needs SOL for:
- Program deployment rent
- PDA account creation (Config + Pool)
- Transaction fees

```bash
# Check balance
solana balance --url devnet <authority-pubkey>

# Airdrop on devnet (if rate limited, wait and retry)
solana airdrop 2 <authority-pubkey> --url devnet
```

**Minimum required:** ~0.01 SOL for account creation

## Initialization

After deployment, the program must be initialized to create the Config and Pool PDAs.

### Method 1: Using the Init Script (Recommended)

```bash
cd scripts
npm install @solana/web3.js

# Set environment variables
export LITTER_MINT="9EJwVq9dfZHLH1AtRcH9eaJzewq4vmxUJPboja45DoZj"  # Your $LITTER mint
export AUTHORITY_KEYPAIR_PATH="/path/to/litterbox-authority.json"

# Run initialization
node init-new-program.js
```

### Method 2: Manual Initialization

```bash
node scripts/init-new-program.js
```

### Expected Output

```
🆕 NEW PROGRAM: 5w927F3TrrRCuAQ86whve3Qe864oT1gvGFrnd7rSKY3w
Authority: 9y2YgLd4x5rB4yKDj4nipzGPRYjtBfGmRs28LTX73cf7
Config PDA: 7bibs5dbBwaUuWCc3yjSH6nu649WmQ7ifVicU4MZ6Ueu
Pool PDA: 7DgLSphFDzXA29ausgLpeydKzuW3b42HXrLppZb527MQ

📤 Initializing fresh program...
Signature: 3qXrDWEp2q7eNx3u4RudmWmPxnPAjzTo3yK5FaNsarz9CaugS6RrNg3z34jjxdVmF1aaXg2BYXF4eCiafRLqyDjn

✅ SUCCESS! Program initialized!
Explorer: https://explorer.solana.com/tx/...

Accounts created:
Config: ✅ 74 bytes
Pool: ✅ 40 bytes
```

## Verification

Verify the accounts were created correctly:

```bash
# Check Config PDA
solana account 7bibs5dbBwaUuWCc3yjSH6nu649WmQ7ifVicU4MZ6Ueu --url devnet

# Check Pool PDA
solana account 7DgLSphFDzXA29ausgLpeydKzuW3b42HXrLppZb527MQ --url devnet
```

Both should show:
- Owner: Your program ID
- Data length: 74 bytes (Config) / 40 bytes (Pool)

## Account Structures

### Config Account (74 bytes)
```
[0..32]  authority            Pubkey
[32..64] litter_mint          Pubkey
[64]     config_bump          u8
[65]     mode                 u8
[66..74] graduation_threshold u64
```

### Pool Account (40 bytes)
```
[0..8]   virtual_usdc         u64
[8..16]  virtual_litter       u64
[16..24] real_usdc            u64
[24..32] graduation_threshold u64
[32]     pool_bump            u8
[33..40] _padding             [u8; 7]
```

## Frontend Configuration

Update your frontend environment variables:

```env
VITE_PROGRAM_ID=5w927F3TrrRCuAQ86whve3Qe864oT1gvGFrnd7rSKY3w
VITE_CONFIG_PDA=7bibs5dbBwaUuWCc3yjSH6nu649WmQ7ifVicU4MZ6Ueu
VITE_POOL_PDA=7DgLSphFDzXA29ausgLpeydKzuW3b42HXrLppZb527MQ
VITE_LITTER_MINT=9EJwVq9dfZHLH1AtRcH9eaJzewq4vmxUJPboja45DoZj
VITE_NETWORK=devnet
VITE_RPC_URL=https://api.devnet.solana.com
```

## Troubleshooting

### "AccountNotFound" Error
- **Cause:** Program not initialized
- **Solution:** Run the initialization script

### "Signature verification failed" Error
- **Cause:** Wrong keypair or insufficient SOL
- **Solution:** 
  1. Verify you're using the correct authority keypair
  2. Check authority has sufficient SOL (≥ 0.01 SOL)
  3. Ensure keypair path is correct in environment variable

### "Attempt to debit an account but found no record" Error
- **Cause:** Authority account has no SOL
- **Solution:** Airdrop SOL to authority account

### "AccountDataTooSmall" Error
- **Cause:** Account size mismatch
- **Solution:** This should not occur with fresh deployment. If it does, redeploy with fresh program ID.

### Rate Limited on Airdrop
- **Cause:** Devnet rate limiting
- **Solution:** Wait a few minutes and retry, or use a different RPC endpoint

## Security Notes

⚠️ **NEVER:**
- Commit keypairs to git
- Share private keys
- Use the same keypair for devnet and mainnet
- Deploy mainnet programs without thorough testing

✅ **ALWAYS:**
- Back up keypairs securely
- Test on devnet first
- Use environment variables for sensitive paths
- Verify account sizes after initialization

## Next Steps

After successful initialization:

1. ✅ Verify accounts on Solana Explorer
2. ✅ Update frontend with new program ID
3. ✅ Test deposit functionality
4. ✅ Test multi-token deposits (Jupiter integration)
5. 🔄 Deploy to mainnet (when ready)

## Support

For issues or questions:
- Check the [Solana documentation](https://docs.solana.com/)
- Review the program source code in `src/lib.rs`
- Verify transaction details on Solana Explorer

---

**Last Updated:** 2026-03-27  
**Program Version:** 1.0.0  
**Network:** Devnet
