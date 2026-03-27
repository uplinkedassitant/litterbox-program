# LitterBox Program

A Solana program for token recycling with bonding curve mechanics.

## Program ID (Devnet)
`BaLn7BEZCwsLaTqZcdogBy7B8NELJBHQn6Xt5ZnC2erq`

## Status
⚠️ **Incomplete** - Program deployed but initialization flow needs fixing

## The Issue
The program requires PDA creation for Config and Pool accounts during initialization, but the current implementation has a circular dependency:
- PDAs need program signature (`invoke_signed`) to create
- Initialize instruction expects accounts to exist
- Can't create accounts without calling program

## What Needs to Be Done

### Option 1: Fix PDA Creation (Recommended)
Modify `src/lib.rs` `process_initialize` to:
1. Accept only: authority, litter_mint, system_program
2. Derive PDA addresses internally  
3. Create Config and Pool PDAs using `invoke_signed`
4. Initialize account data

### Option 2: Single-State Architecture
Combine Config + Pool into single PDA account (like vault example).

### Option 3: Regular Accounts
Create accounts as regular keypairs (not PDAs) - less secure but functional.

## Project Structure
```
litterbox-final/
├── src/
│   └── lib.rs          # Main program (needs init fix)
├── scripts/
│   ├── init-final.js   # Initialization script (needs update)
│   └── ...
├── Cargo.toml
└── README.md
```

## Account Structures

### Config (74 bytes)
- authority: Pubkey (32)
- litter_mint: Pubkey (32)
- config_bump: u8 (1)
- mode: u8 (1)
- graduation_threshold: u64 (8)

### VirtualPool (40 bytes)
- virtual_usdc: u64 (8)
- virtual_litter: u64 (8)
- real_usdc: u64 (8)
- graduation_threshold: u64 (8)
- pool_bump: u8 (1)
- _padding: [u8; 7] (7)

## Dependencies
- pinocchio 0.9
- pinocchio-tkn 0.2.2

## Build
```bash
cargo build-sbf
```

## Deploy
```bash
solana program deploy --url devnet target/deploy/litterbox_final.so
```

## Next Steps
1. Fix `process_initialize` to create PDAs internally
2. Update initialization script
3. Test deposit flow
4. Update frontend

## License
MIT
