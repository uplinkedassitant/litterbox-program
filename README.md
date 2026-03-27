# LitterBox Program — Fixed

**Program ID:** `BaLn7BEZCwsLaTqZcdogBy7B8NELJBHQn6Xt5ZnC2erq`

## What Was Broken & What Was Fixed

| # | Bug | Fix |
|---|-----|-----|
| 1 | Invalid imports (`secp256k1`, `system_program`, `token_program` consts) | Removed; replaced with correct pinocchio module paths |
| 2 | Missing `#![no_std]` | Added — required for BPF/SBF compilation target |
| 3 | Manual `entrypoint` C function with raw `ProgramResult → u64` cast | Replaced with pinocchio's `entrypoint!` macro |
| 4 | `declare_id!` used without importing it | Imported from `pinocchio_pubkey` (where the macro lives) |
| 5 | `pubkey::find_program_address` — wrong module path | Corrected to `pinocchio::pubkey::find_program_address` |
| 6 | `seeds!(…)` macro doesn't exist in pinocchio | Replaced with `[Seed::from(…), Seed::from(…)]` array + `Signer::from(&seeds)` |
| 7 | `create_program_account` accepted `&Pubkey` for the new account | `invoke_signed` requires `&AccountInfo` — fixed to use the passed `AccountInfo` |
| 8 | `Config::store()` and `VirtualPool::store()` were empty stubs | Replaced with `unsafe { acc.borrow_mut_data_unchecked() }` + `copy_from_slice` |
| 9 | `minimum_balance()` returned a hardcoded magic number | Replaced with `Rent::get()?.minimum_balance(size)` |
| 10 | `ProgramResult → u64` conversion at entrypoint was wrong pattern | Replaced with idiomatic `split_first()` discriminator dispatch |

---

## Requirements

| Tool | Min Version | Notes |
|------|-------------|-------|
| Rust | **1.79** | `rustup install stable` (as of 2026 gives 1.85+) |
| Solana CLI | 1.18+ | For `cargo build-sbf` |
| Node.js | 18+ | For the init script |

---

## Build

```bash
# 1. Ensure correct Rust toolchain
rustup install stable
rustup override set stable

# 2. Build for Solana BPF/SBF target
cargo build-sbf

# Output: target/sbf-solana-solana/release/litterbox_final.so
```

> **If you see** `error: requires rustc 1.79 or newer` while on 1.75:
> `rustup install stable` — the apt-installed rustc is too old.

---

## Deploy

```bash
# Deploy (program is already deployed at the ID above; use --program-id to upgrade)
solana program deploy \
  target/sbf-solana-solana/release/litterbox_final.so \
  --program-id BaLn7BEZCwsLaTqZcdogBy7B8NELJBHQn6Xt5ZnC2erq \
  --url devnet

# Verify
solana program show BaLn7BEZCwsLaTqZcdogBy7B8NELJBHQn6Xt5ZnC2erq --url devnet
```

---

## Initialise

```bash
cd scripts
npm install @solana/web3.js

# Set env vars (or edit the constants at the top of init-litterbox.js)
export AUTHORITY_KEYPAIR_PATH=~/.config/solana/id.json
export LITTER_MINT=<your-litter-mint-pubkey>
export RPC_URL=https://api.devnet.solana.com

node init-litterbox.js
```

Expected output:
```
Authority : <your-pubkey>
Program ID: BaLn7BEZCwsLaTqZcdogBy7B8NELJBHQn6Xt5ZnC2erq
Mint      : <litter-mint>
Config PDA: <derived>  (bump N)
Pool PDA  : <derived>  (bump N)
✅ Initialised!
   Signature : <tx-sig>
   Explorer  : https://explorer.solana.com/tx/<sig>?cluster=devnet
```

---

## Account Layouts

### Config PDA — seed: `["config"]` — 74 bytes

| Offset | Size | Field | Type |
|--------|------|-------|------|
| 0 | 32 | authority | Pubkey |
| 32 | 32 | litter_mint | Pubkey |
| 64 | 1 | config_bump | u8 |
| 65 | 1 | mode | u8 |
| 66 | 8 | graduation_threshold | u64 LE |

### Pool PDA — seed: `["virtual_pool_v2"]` — 40 bytes

| Offset | Size | Field | Type |
|--------|------|-------|------|
| 0 | 8 | virtual_usdc | u64 LE |
| 8 | 8 | virtual_litter | u64 LE |
| 16 | 8 | real_usdc | u64 LE |
| 24 | 8 | graduation_threshold | u64 LE |
| 32 | 1 | pool_bump | u8 |
| 33 | 7 | _padding | [u8; 7] |

---

## Instruction Reference

### 0 — Initialize

**Accounts:**
```
0. [signer, writable]  authority
1. []                  litter_mint
2. [writable]          config_pda     (PDA: ["config"])
3. [writable]          pool_pda       (PDA: ["virtual_pool_v2"])
4. []                  system_program
```

**Data:** (57 bytes)
```
[0]      discriminator = 0x00
[1..9]   virtual_usdc         u64 LE
[9..17]  virtual_litter       u64 LE
[17..25] graduation_threshold u64 LE
[25..57] litter_mint_key      [u8; 32]
```

### 1 — Deposit

Stub — ready for implementation. Suggested accounts:
```
0. [signer, writable]  user
1. [writable]          user_usdc_ata
2. [writable]          pool_usdc_ata
3. [writable]          config_pda
4. [writable]          pool_pda
5. []                  token_program
```

---

## Key Pinocchio Patterns Used

```rust
// PDA derivation
let (pda, bump) = pinocchio::pubkey::find_program_address(&[SEED], program_id);

// PDA signing for CPI
let bump_arr = [bump];
let seeds: [Seed; 2] = [Seed::from(SEED), Seed::from(bump_arr.as_slice())];
let signer = Signer::from(&seeds);
CreateAccount { from, to, lamports, space, owner }.invoke_signed(&[signer])?;

// Zero-copy account data write
let data = unsafe { account.borrow_mut_data_unchecked() };
data[0..32].copy_from_slice(some_pubkey.as_ref());

// Rent-exempt balance
let lamports = Rent::get()?.minimum_balance(ACCOUNT_SIZE);
```
