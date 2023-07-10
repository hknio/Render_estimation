use crate::state::*;
use anchor_lang::{
    prelude::*,
    solana_program::{system_program, sysvar},
};
use anchor_spl::token::Mint;
use std::mem::size_of;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct InitializeEmissionScheduleArgsV0 {
    pub authority: Pubkey,
    pub emission_schedule: Vec<EmissionScheduleItem>,
}

#[derive(Accounts)]
#[instruction(args: InitializeEmissionScheduleArgsV0)]
pub struct InitializeEmissionScheduleV0<'info> {
    #[account(
        init_if_needed,
        payer = payer,
        space = 8 + 60 + size_of::<EmissionSchedule>() +
            (size_of::<EmissionScheduleItem>() * args.emission_schedule.len()),
        seeds = [SEED_EMISSION_SCHEDULE, rndr_mint.key().as_ref()],
        bump
    )]
    pub schedule: Box<Account<'info, EmissionSchedule>>,
    #[account(mut)]
    pub rndr_mint: Box<Account<'info, Mint>>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handler<'info>(
    ctx: Context<InitializeEmissionScheduleV0>,
    args: InitializeEmissionScheduleArgsV0,
) -> Result<()> {
    let schedule = &mut ctx.accounts.schedule;
    schedule.emission_schedule = args.emission_schedule;
    schedule.authority = args.authority;
    schedule.bump = *ctx.bumps.get("schedule").unwrap();

    Ok(())
}
