# LitterBox Program

A Solana program for token recycling with bonding curve mechanics.

## Current Deployment

**Program ID:** `5w927F3TrrRCuAQ86whve3Qe864oT1gvGFrnd7rSKY3w`  
**Network:** Solana Devnet  
**Status:** ✅ Deployed and Initialized  

## Quick Start

### 1. Build

```bash
cargo build-sbf
```

### 2. Deploy

```bash
solana program deploy --url devnet target/sbf-solana-solana/release/litterbox_final.so
```

### 3. Initialize

```bash
cd scripts
npm install @solana/web3.js
export LITTER_MINT=<your-mint>
export AUTHORITY_KEYPAIR_PATH=/path/to/keypair.json
node init-new-program.js
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

## Features

- ✅ Token deposit with bonding curve
- ✅ PDA-based account management
- ✅ Config and Pool account separation
- ✅ Proper rent exemption handling
- ✅ Built with Pinocchio framework

## Account Structures

### Config (74 bytes)
- Authority (32 bytes)
- Litter Mint (32 bytes)
- Config Bump (1 byte)
- Mode (1 byte)
- Graduation Threshold (8 bytes)

### Pool (40 bytes)
- Virtual USDC (8 bytes)
- Virtual Litter (8 bytes)
- Real USDC (8 bytes)
- Graduation Threshold (8 bytes)
- Pool Bump (1 byte)
- Padding (7 bytes)

## Development

### Prerequisites
- Rust 1.79+
- Solana CLI
- Node.js (for scripts)

### Build Commands

```bash
# Build for BPF
cargo build-sbf

# Build for native (testing)
cargo build

# Deploy to devnet
solana program deploy --url devnet target/sbf-solana-solana/release/litterbox_final.so
```

### Testing

After initialization, test deposits:

```bash
cd scripts
node test-deposit.js  # Coming soon
```

## Project Structure

```
litterbox-final/
├── src/
│   └── lib.rs              # Main program
├── scripts/
│   ├── init-new-program.js  # Initialization script
│   └── ...
├── Cargo.toml              # Dependencies
├── DEPLOYMENT.md           # Detailed deployment guide
└── README.md               # This file
```

## Security

⚠️ **Important:** Never commit keypairs or sensitive data to version control. This project includes a `.gitignore` to prevent accidental commits.

## License

MIT

## Resources

- [Solana Documentation](https://docs.solana.com/)
- [Pinocchio Framework](https://github.com/anza-xyz/pinocchio)
- [Solana Program Library](https://github.com/solana-labs/solana-program-library)

---

**Version:** 1.0.0  
**Last Updated:** 2026-03-27
