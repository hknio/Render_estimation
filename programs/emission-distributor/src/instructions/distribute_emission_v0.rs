use anchor_spl::associated_token::get_associated_token_address;
use {
    crate::errors::*,
    crate::state::*,
    anchor_lang::{
        prelude::*,
        solana_program::{system_program, sysvar},
    },
    anchor_spl::{
        associated_token::AssociatedToken,
        token::{self, Mint, MintTo, TokenAccount},
    },
    circuit_breaker::{
        cpi::{accounts::MintV0, mint_v0},
        CircuitBreaker, MintArgsV0, MintWindowedCircuitBreakerV0,
    },
    clockwork_sdk::state::{Thread, ThreadAccount, ThreadResponse},
    emission_schedule::{EmissionSchedule, EmissionScheduleProgram},
};

#[derive(Accounts)]
pub struct DistributeEmissionV0<'info> {
    #[account(
        mut,
        seeds = [SEED_DISTRIBUTOR, mint.key().as_ref()],
        bump = distributor.bump,
    )]
    pub distributor: Account<'info, EmissionDistributor>,

    #[account(
        mut,
        seeds = [b"emission_schedule", mint.key().as_ref()],
        seeds::program = emission_schedule_program.key(),
        bump = emission_schedule.bump
    )]
    pub emission_schedule: Box<Account<'info, EmissionSchedule>>,
    pub emission_schedule_program: Program<'info, EmissionScheduleProgram>,

    #[account(
        mut,
        seeds = ["mint_windowed_breaker".as_bytes(), mint.key().as_ref()],
        seeds::program = circuit_breaker_program.key(),
        bump = circuit_breaker.bump_seed
    )]
    pub circuit_breaker: Box<Account<'info, MintWindowedCircuitBreakerV0>>,

    // constraint ensures only the thread will be able to invoke this instruction
    #[account(
        mut,
        signer,
        constraint = distributor_thread.authority.eq(&distributor.key()),
    )]
    pub distributor_thread: Box<Account<'info, Thread>>,

    #[account(mut)]
    pub mint: Account<'info, Mint>,

    #[account(address = system_program::ID)]
    pub system_program: Program<'info, System>,
    #[account(address = anchor_spl::token::ID)]
    pub token_program: Program<'info, token::Token>,
    pub circuit_breaker_program: Program<'info, CircuitBreaker>,
    #[account(mut)]
    pub to: Box<Account<'info, TokenAccount>>,
}

pub fn handler<'info>(
    ctx: Context<'_, '_, '_, 'info, DistributeEmissionV0<'info>>,
) -> Result<ThreadResponse> {
    // get accounts
    let distributor = &ctx.accounts.distributor;
    let mint = &ctx.accounts.mint;
    let token_program = &ctx.accounts.token_program;
    let circuit_breaker = &ctx.accounts.circuit_breaker;
    let circuit_breaker_program = &ctx.accounts.circuit_breaker_program;

    let curr_ts = Clock::get()?.unix_timestamp;

    let schedule = ctx
        .accounts
        .emission_schedule
        .emission_schedule
        .iter_mut()
        .find(|i| curr_ts >= i.start_unix_time && !i.emitted)
        .ok_or(EmissionDistributorErrors::MissingEmissionScheduleItem)?;

    let total_emissions = schedule.emissions_per_epoch;

    msg!(
        "thread authority {}",
        ctx.accounts.distributor_thread.authority.to_string()
    );
    msg!("distributor {}", ctx.accounts.distributor.key().to_string());

    // TODO (potentially add more checks)
    /*if !TESTING && args.epoch >= epoch_curr_ts {
        return Err(error!(ErrorCode::EpochNotOver));
    }*/

    let escrow = distributor
        .rewards_escrows
        .iter()
        .find(|e| e.account.key() == ctx.accounts.to.owner.key())
        .ok_or(EmissionDistributorErrors::MissingRewardsAccountInfo)?;

    //for escrow in &distributor.rewards_escrows {
    let emissions = (escrow.percent as u64)
        .checked_mul(total_emissions)
        .unwrap()
        .checked_div(100)
        .unwrap();

    mint_v0(
        CpiContext::new_with_signer(
            ctx.accounts.circuit_breaker_program.to_account_info(),
            MintV0 {
                mint: mint.to_account_info(),
                //to: account_info.to_account_info(),
                to: ctx.accounts.to.to_account_info(),
                mint_authority: distributor.to_account_info(),
                token_program: token_program.to_account_info(),
                circuit_breaker: circuit_breaker.to_account_info(),
            },
            &[&[
                SEED_DISTRIBUTOR,
                distributor.mint.as_ref(),
                &[distributor.bump],
            ]],
        ),
        MintArgsV0 { amount: emissions },
    )?;
    //}

    schedule.emitted = true;

    Ok(ThreadResponse::default())
}
