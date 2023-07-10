use crate::state::RenderCreditsV0;
use anchor_lang::prelude::*;
use anchor_spl::token;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Burn, FreezeAccount, Mint, ThawAccount, Token, TokenAccount},
};
use burn_rewards::{BurnRewardsProgram, BurnRewardsV0, RewardsItem};
use emission_schedule::{EmissionSchedule, EmissionScheduleProgram};

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct BurnRenderCreditsArgsV0 {
    pub amount: u64,
}

#[derive(Accounts)]
pub struct BurnRenderCreditsV0<'info> {
    #[account(
        seeds=[
            "rc".as_bytes(),
            rc_mint.key().as_ref(),
        ],
        bump = render_credits.render_credits_bump,
        has_one = rc_mint,
    )]
    pub render_credits: Box<Account<'info, RenderCreditsV0>>,

    #[account(
        mut,
        seeds = [b"burn_rewards", owner.key().as_ref()],
        seeds::program = burn_rewards_program.key(),
        bump = burn_rewards.bump,
    )]
    pub burn_rewards: Account<'info, BurnRewardsV0>,
    pub burn_rewards_program: Program<'info, BurnRewardsProgram>,

    #[account(
        mut,
        seeds = [b"emission_schedule", rndr_mint.key().as_ref()],
        seeds::program = emission_schedule_program.key(),
        bump = emission_schedule.bump,
    )]
    pub emission_schedule: Box<Account<'info, EmissionSchedule>>,
    pub emission_schedule_program: Program<'info, EmissionScheduleProgram>,

    // dc tokens from this account are burned
    #[account(
        init_if_needed,
        payer = owner,
        associated_token::authority = owner,
        associated_token::mint = rc_mint
    )]
    pub burner: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(mut)]
    pub rc_mint: Box<Account<'info, Mint>>,
    #[account(mut)]
    pub rndr_mint: Box<Account<'info, Mint>>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

impl<'info> BurnRenderCreditsV0<'info> {
    pub fn burn_ctx(&self) -> CpiContext<'_, '_, '_, 'info, Burn<'info>> {
        let cpi_accounts = Burn {
            mint: self.rc_mint.to_account_info(),
            from: self.burner.to_account_info(),
            authority: self.owner.to_account_info(),
        };

        CpiContext::new(self.token_program.to_account_info(), cpi_accounts)
    }

    pub fn thaw_ctx(&self) -> CpiContext<'_, '_, '_, 'info, ThawAccount<'info>> {
        let cpi_accounts = ThawAccount {
            account: self.burner.to_account_info(),
            mint: self.rc_mint.to_account_info(),
            authority: self.render_credits.to_account_info(),
        };
        CpiContext::new(self.token_program.to_account_info(), cpi_accounts)
    }

    pub fn freeze_ctx(&self) -> CpiContext<'_, '_, '_, 'info, FreezeAccount<'info>> {
        let cpi_accounts = FreezeAccount {
            account: self.burner.to_account_info(),
            mint: self.rc_mint.to_account_info(),
            authority: self.render_credits.to_account_info(),
        };
        CpiContext::new(self.token_program.to_account_info(), cpi_accounts)
    }
}

pub fn handler(ctx: Context<BurnRenderCreditsV0>, args: BurnRenderCreditsArgsV0) -> Result<()> {
    let signer_seeds: &[&[&[u8]]] = &[&[
        "rc".as_bytes(),
        ctx.accounts.rc_mint.to_account_info().key.as_ref(),
        &[ctx.accounts.render_credits.render_credits_bump],
    ]];

    // unfreeze the burner if necessary
    if ctx.accounts.burner.is_frozen() {
        token::thaw_account(ctx.accounts.thaw_ctx().with_signer(signer_seeds))?;
    }

    // burn the dc tokens
    token::burn(
        ctx.accounts.burn_ctx().with_signer(signer_seeds),
        args.amount,
    )?;

    // freeze the burner
    token::freeze_account(ctx.accounts.freeze_ctx().with_signer(signer_seeds))?;

    let curr_ts = Clock::get()?.unix_timestamp;

    let schedule = &mut ctx.accounts.emission_schedule;
    for es in schedule.emission_schedule.iter_mut().rev() {
        if curr_ts >= es.start_unix_time {
            es.total_rc_burned += args.amount;
            break;
        }
    }

    msg!(
        "schedule {:?}",
        ctx.accounts.emission_schedule.emission_schedule
    );

    let burn_rewards = &mut ctx.accounts.burn_rewards;
    for ri in burn_rewards.rewards_per_epoch.iter_mut().rev() {
        if curr_ts >= ri.start_unix_time {
            ri.rc_burned += args.amount;
            break;
        }
    }

    msg!(
        "burn_rewards {:?}",
        ctx.accounts.burn_rewards.rewards_per_epoch
    );

    Ok(())
}
