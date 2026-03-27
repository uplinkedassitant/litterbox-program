#![no_std]

use pinocchio::{
    account_info::AccountInfo,
    entrypoint,
    instruction::{Seed, Signer},
    program_error::ProgramError,
    pubkey::{self, Pubkey},
    sysvars::{rent::Rent, Sysvar},
    ProgramResult,
};
use pinocchio_pubkey::declare_id;
use pinocchio_system::instructions::CreateAccount;
use pinocchio_tkn::common::{MintTo, Transfer};

declare_id!("BaLn7BEZCwsLaTqZcdogBy7B8NELJBHQn6Xt5ZnC2erq");

const CONFIG_SEED: &[u8] = b"config";
const POOL_SEED: &[u8] = b"virtual_pool_v2";
const CONFIG_SIZE: usize = 74;
const POOL_SIZE: usize = 40;

entrypoint!(process_instruction);

fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    data: &[u8],
) -> ProgramResult {
    match data.split_first() {
        Some((&0, rest)) => process_initialize(program_id, accounts, rest),
        Some((&1, rest)) => process_deposit(program_id, accounts, rest),
        _ => Err(ProgramError::InvalidInstructionData),
    }
}

fn process_initialize(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    data: &[u8],
) -> ProgramResult {
    if data.len() < 56 {
        return Err(ProgramError::InvalidInstructionData);
    }

    let [authority, _litter_mint, config_acc, pool_acc, _system_program] = accounts else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };

    if !authority.is_signer() {
        return Err(ProgramError::MissingRequiredSignature);
    }

    let virtual_usdc = u64::from_le_bytes(data[0..8].try_into().unwrap());
    let virtual_litter = u64::from_le_bytes(data[8..16].try_into().unwrap());
    let graduation_threshold = u64::from_le_bytes(data[16..24].try_into().unwrap());
    let litter_mint_key: Pubkey = data[24..56].try_into().unwrap();

    let (config_pda, config_bump) = pubkey::find_program_address(&[CONFIG_SEED], program_id);
    let (pool_pda, pool_bump) = pubkey::find_program_address(&[POOL_SEED], program_id);

    if config_acc.key() != &config_pda {
        return Err(ProgramError::InvalidAccountData);
    }
    if pool_acc.key() != &pool_pda {
        return Err(ProgramError::InvalidAccountData);
    }

    let rent = Rent::get()?;

    {
        let bump_arr = [config_bump];
        let seeds = [Seed::from(CONFIG_SEED), Seed::from(bump_arr.as_slice())];
        let signer = Signer::from(&seeds);
        CreateAccount {
            from: authority,
            to: config_acc,
            lamports: rent.minimum_balance(CONFIG_SIZE),
            space: CONFIG_SIZE as u64,
            owner: program_id,
        }.invoke_signed(&[signer])?;
    }

    {
        let bump_arr = [pool_bump];
        let seeds = [Seed::from(POOL_SEED), Seed::from(bump_arr.as_slice())];
        let signer = Signer::from(&seeds);
        CreateAccount {
            from: authority,
            to: pool_acc,
            lamports: rent.minimum_balance(POOL_SIZE),
            space: POOL_SIZE as u64,
            owner: program_id,
        }.invoke_signed(&[signer])?;
    }

    {
        let d = unsafe { config_acc.borrow_mut_data_unchecked() };
        d[0..32].copy_from_slice(authority.key().as_ref());
        d[32..64].copy_from_slice(litter_mint_key.as_ref());
        d[64] = config_bump;
        d[65] = 0;
        d[66..74].copy_from_slice(&graduation_threshold.to_le_bytes());
    }

    {
        let d = unsafe { pool_acc.borrow_mut_data_unchecked() };
        d[0..8].copy_from_slice(&virtual_usdc.to_le_bytes());
        d[8..16].copy_from_slice(&virtual_litter.to_le_bytes());
        d[16..24].copy_from_slice(&0u64.to_le_bytes());
        d[24..32].copy_from_slice(&graduation_threshold.to_le_bytes());
        d[32] = pool_bump;
    }

    Ok(())
}

fn process_deposit(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    data: &[u8],
) -> ProgramResult {
    // Parse deposit amount (first 8 bytes = usdc_amount as u64 LE)
    if data.len() < 8 {
        return Err(ProgramError::InvalidInstructionData);
    }
    
    let usdc_amount = u64::from_le_bytes(data[0..8].try_into().unwrap());
    
    // Account layout:
    // 0. [signer, writable] user
    // 1. [writable] user_usdc_ata
    // 2. [writable] pool_usdc_ata
    // 3. [writable] config_pda
    // 4. [writable] pool_pda
    // 5. [writable] user_litter_ata
    // 6. [] litter_mint
    // 7. [] token_program
    
    let accounts_needed = 8;
    if accounts.len() < accounts_needed {
        return Err(ProgramError::NotEnoughAccountKeys);
    }
    
    let user = &accounts[0];
    let user_usdc_ata = &accounts[1];
    let pool_usdc_ata = &accounts[2];
    let config_acc = &accounts[3];
    let pool_acc = &accounts[4];
    let user_litter_ata = &accounts[5];
    let litter_mint = &accounts[6];
    let token_program = &accounts[7];
    
    if !user.is_signer() {
        return Err(ProgramError::MissingRequiredSignature);
    }
    
    // Verify config and pool PDAs
    let (expected_config_pda, _config_bump) = pubkey::find_program_address(&[CONFIG_SEED], program_id);
    let (expected_pool_pda, _pool_bump) = pubkey::find_program_address(&[POOL_SEED], program_id);
    
    if config_acc.key() != &expected_config_pda {
        return Err(ProgramError::InvalidAccountData);
    }
    if pool_acc.key() != &expected_pool_pda {
        return Err(ProgramError::InvalidAccountData);
    }
    
    // Read current pool state
    let pool_data = unsafe { pool_acc.borrow_mut_data_unchecked() };
    if pool_data.len() < 32 {
        return Err(ProgramError::InvalidAccountData);
    }
    
    let virtual_usdc = u64::from_le_bytes(pool_data[0..8].try_into().unwrap());
    let virtual_litter = u64::from_le_bytes(pool_data[8..16].try_into().unwrap());
    let real_usdc = u64::from_le_bytes(pool_data[16..24].try_into().unwrap());
    
    // Calculate Litter tokens to mint based on bonding curve
    // Simple ratio: (usdc_amount * virtual_litter) / virtual_usdc
    let litter_amount = if virtual_usdc > 0 {
        (usdc_amount * virtual_litter) / virtual_usdc
    } else {
        0
    };
    
    // Transfer USDC from user to pool
    Transfer {
        source: user_usdc_ata,
        destination: pool_usdc_ata,
        authority: user,
        amount: usdc_amount,
        program_id: None,
    }.invoke()?;
    
    // Mint Litter tokens to user
    // Get config to find the PDA signer
    let config_data = unsafe { config_acc.borrow_data_unchecked() };
    let config_bump = config_data[64];
    let bump_arr = [config_bump];
    let seeds = [Seed::from(CONFIG_SEED), Seed::from(bump_arr.as_slice())];
    let signer = Signer::from(&seeds);
    
    MintTo {
        mint: litter_mint,
        destination: user_litter_ata,
        authority: config_acc,
        amount: litter_amount,
        program_id: None,
    }.invoke_signed(&[signer])?;
    
    // Update pool state
    let new_virtual_usdc = virtual_usdc.checked_add(usdc_amount).unwrap_or(virtual_usdc);
    let new_virtual_litter = virtual_litter.checked_sub(litter_amount).unwrap_or(virtual_litter);
    let new_real_usdc = real_usdc.checked_add(usdc_amount).unwrap_or(real_usdc);
    
    let pool_data = unsafe { pool_acc.borrow_mut_data_unchecked() };
    pool_data[0..8].copy_from_slice(&new_virtual_usdc.to_le_bytes());
    pool_data[8..16].copy_from_slice(&new_virtual_litter.to_le_bytes());
    pool_data[16..24].copy_from_slice(&new_real_usdc.to_le_bytes());
    
    Ok(())
}

#[cfg(target_arch = "bpf")]
#[panic_handler]
fn panic(_: &core::panic::PanicInfo<'_>) -> ! {
    loop {}
}

#[panic_handler]
fn panic_handler(_: &core::panic::PanicInfo<'_>) -> ! {
    loop {}
}
