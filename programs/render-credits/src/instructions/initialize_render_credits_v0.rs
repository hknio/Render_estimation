use std::str::FromStr;

//use crate::circuit_breaker::*;
use crate::errors::*;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::token::spl_token::instruction::AuthorityType;
use anchor_spl::token::{set_authority, SetAuthority};
use anchor_spl::token::{Mint, Token};
use circuit_breaker::{
    cpi::{accounts::InitializeMintWindowedBreakerV0, initialize_mint_windowed_breaker_v0},
    CircuitBreaker, InitializeMintWindowedBreakerArgsV0, WindowedCircuitBreakerConfigV0,
};
use pyth_sdk_solana::load_price_feed_from_account_info;

#[cfg(feature = "devnet")]
const PYTH_PROGRAM_ID: &str = "gSbePebfvPy7tRqimPoVecS2UsBvYv46ynrzWocc92s";

#[cfg(not(feature = "devnet"))]
const PYTH_PROGRAM_ID: &str = "FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH";

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct InitializeRenderCreditsArgsV0 {
    pub authority: Pubkey,
    pub config: WindowedCircuitBreakerConfigV0,
}

#[derive(Accounts)]
#[instruction(args: InitializeRenderCreditsArgsV0)]
pub struct InitializeRenderCreditsV0<'info> {
    #[account(
        init, // prevents from reinit attack
        payer = payer,
        space = 8 + 60 + std::mem::size_of::<RenderCreditsV0>(),
        seeds = ["rc".as_bytes(), rc_mint.key().as_ref()],
        bump,
    )]
    pub render_credits: Box<Account<'info, RenderCreditsV0>>,
    /// CHECK: Checked via load call in handler
    #[account(owner = Pubkey::from_str("gSbePebfvPy7tRqimPoVecS2UsBvYv46ynrzWocc92s").unwrap())]
    pub rndr_price_oracle: AccountInfo<'info>,

    pub rndr_mint: Box<Account<'info, Mint>>,
    /// CHECK: Initialized via cpi
    #[account(
    mut,
    seeds = ["mint_windowed_breaker".as_bytes(), rc_mint.key().as_ref()],
    seeds::program = circuit_breaker_program.key(),
    bump
  )]
    pub circuit_breaker: AccountInfo<'info>,
    #[account(mut)]
    pub rc_mint: Box<Account<'info, Mint>>,

    pub mint_authority: Signer<'info>,
    pub freeze_authority: Signer<'info>,

    /// CHECK: Verified by cpi
    #[account(
    mut,
    seeds = ["account_payer".as_bytes()],
    bump,
  )]
    pub account_payer: AccountInfo<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,
    pub circuit_breaker_program: Program<'info, CircuitBreaker>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<InitializeRenderCreditsV0>,
    args: InitializeRenderCreditsArgsV0,
) -> Result<()> {
    ctx.accounts.render_credits.rc_mint = ctx.accounts.rc_mint.key();
    ctx.accounts.render_credits.rndr_mint = ctx.accounts.rndr_mint.key();
    ctx.accounts.render_credits.authority = args.authority;
    ctx.accounts.render_credits.rndr_price_oracle = ctx.accounts.rndr_price_oracle.key();

    ctx.accounts.render_credits.render_credits_bump = *ctx
        .bumps
        .get("render_credits")
        .ok_or(RenderCreditsErrors::BumpNotAvailable)?;

    ctx.accounts.render_credits.account_payer = ctx.accounts.account_payer.key();
    ctx.accounts.render_credits.account_payer_bump = *ctx
        .bumps
        .get("account_payer")
        .ok_or(RenderCreditsErrors::BumpNotAvailable)?;

    // Make sure these Pyth price accounts can be loaded
    load_price_feed_from_account_info(&ctx.accounts.rndr_price_oracle).map_err(|e| {
        msg!("Pyth error {}", e);
        error!(RenderCreditsErrors::PythError)
    })?;

    msg!("Claiming mint and freeze authority");
    initialize_mint_windowed_breaker_v0(
        CpiContext::new(
            ctx.accounts.circuit_breaker_program.to_account_info(),
            InitializeMintWindowedBreakerV0 {
                payer: ctx.accounts.payer.to_account_info(),
                circuit_breaker: ctx.accounts.circuit_breaker.to_account_info(),
                mint: ctx.accounts.rc_mint.to_account_info(),
                mint_authority: ctx.accounts.mint_authority.to_account_info(),
                token_program: ctx.accounts.token_program.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
            },
        ),
        InitializeMintWindowedBreakerArgsV0 {
            authority: args.authority,
            config: args.config.into(),
            mint_authority: ctx.accounts.render_credits.key(),
        },
    )?;
    let rc_authority = Some(*ctx.accounts.render_credits.to_account_info().key);
    set_authority(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            SetAuthority {
                account_or_mint: ctx.accounts.rc_mint.to_account_info(),
                current_authority: ctx.accounts.freeze_authority.to_account_info(),
            },
        ),
        AuthorityType::FreezeAccount,
        rc_authority,
    )?;
    Ok(())
}
