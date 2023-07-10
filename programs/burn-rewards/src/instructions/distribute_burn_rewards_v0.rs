use crate::state::*;
use crate::BurnRewardsErrors;
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{
        self, transfer, Burn, FreezeAccount, Mint, ThawAccount, Token, TokenAccount, Transfer,
    },
};
use clockwork_sdk::state::{Thread, ThreadResponse};
use emission_schedule::{EmissionSchedule, EmissionScheduleProgram};

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct DistributeBurnRewardsArgsV0 {}

#[derive(Accounts)]
pub struct DistributeBurnRewardsV0<'info> {
    #[account(
        mut,
        seeds = [b"burn_rewards", owner.key().as_ref()],
        bump = burn_rewards.bump,
    )]
    pub burn_rewards: Account<'info, BurnRewardsV0>,

    #[account(
        mut,
        associated_token::mint = rndr_mint,
        associated_token::authority = owner
    )]
    pub to: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = rndr_mint,
        associated_token::authority = owner
    )]
    pub escrow: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub rndr_mint: Box<Account<'info, Mint>>,

    #[account(
        seeds = [b"emission_schedule", owner.key().as_ref()],
        seeds::program = emission_schedule_program.key(),
        bump = emission_schedule.bump,
    )]
    pub emission_schedule: Account<'info, EmissionSchedule>,
    pub emission_schedule_program: Program<'info, EmissionScheduleProgram>,

    // constraint ensures only the thread will be able to invoke this instruction
    #[account(
        mut,
        signer,
        constraint = thread.authority.eq(&burn_rewards.key()),
    )]
    pub thread: Box<Account<'info, Thread>>,

    #[account(address = anchor_spl::token::ID)]
    pub token_program: Program<'info, Token>,

    #[account(mut)]
    pub owner: Signer<'info>,
}

pub fn handler<'info>(ctx: Context<DistributeBurnRewardsV0>) -> Result<ThreadResponse> {
    let curr_ts = Clock::get()?.unix_timestamp;

    let r = ctx
        .accounts
        .burn_rewards
        .rewards_per_epoch
        .iter_mut()
        .rev()
        .find(|mut r| r.start_unix_time < curr_ts)
        .ok_or(BurnRewardsErrors::MissingBurnRewards)?;

    let schedule = ctx
        .accounts
        .emission_schedule
        .emission_schedule
        .iter()
        .rev()
        .find(|mut r| r.start_unix_time < curr_ts)
        .ok_or(BurnRewardsErrors::MissingEmissionSchedule)?;

    if r.rc_burned > 0 && r.rc_burned == r.rewards_claimed {
        return Err(BurnRewardsErrors::BurnRewardsClaimed.into());
    }

    let rewards = (r.rc_burned / schedule.total_rc_burned) * ctx.accounts.escrow.amount;

    transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.escrow.to_account_info(),
                to: ctx.accounts.to.to_account_info(),
                authority: ctx.accounts.owner.to_account_info(),
            },
        ),
        rewards,
    )?;

    r.rewards_claimed = rewards;

    Ok(ThreadResponse::default())
}
