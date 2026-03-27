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

fn process_deposit(_: &Pubkey, _: &[AccountInfo], _: &[u8]) -> ProgramResult {
    Ok(())
}

#[cfg(target_arch = "bpf")]
#[panic_handler]
fn panic(_: &core::panic::PanicInfo<'_>) -> ! {
    loop {}
}

#[panic_handler]
fn panic_panic(_: &core::panic::PanicInfo<'_>) -> ! {
    loop {}
}
