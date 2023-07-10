use std::ops::Div;

use crate::errors::*;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Burn, FreezeAccount, Mint, ThawAccount, Token, TokenAccount},
};
use circuit_breaker::{
    cpi::{accounts::MintV0, mint_v0},
    CircuitBreaker, MintArgsV0, MintWindowedCircuitBreakerV0,
};
use pyth_sdk_solana::load_price_feed_from_account_info;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct MintRenderCreditsArgsV0 {
    pub rndr_amount: Option<u64>,
    pub rc_amount: Option<u64>,
}

pub const TESTING: bool = std::option_env!("TESTING").is_some();

#[derive(Accounts)]
#[instruction(args: MintRenderCreditsArgsV0)]
pub struct MintRenderCreditsV0<'info> {
    #[account(
    seeds = [
      "rc".as_bytes(),
      rc_mint.key().as_ref(),
    ],
    bump = render_credits.render_credits_bump,
    has_one = rndr_mint,
    has_one = rc_mint,
    has_one = rndr_price_oracle
  )]
    pub render_credits: Box<Account<'info, RenderCreditsV0>>,

    /// CHECK: Checked by loading with pyth. Also double checked by the has_one on data credits instance.
    pub rndr_price_oracle: AccountInfo<'info>,

    // rndr tokens from this account are burned
    #[account(
        mut,
        constraint = burner.mint == rndr_mint.key(),
        has_one = owner,
    )]
    pub burner: Box<Account<'info, TokenAccount>>,
    #[account(
        init_if_needed,
        payer = owner,
        associated_token::mint = rc_mint,
        associated_token::authority = recipient,
    )]
    pub recipient_token_account: Box<Account<'info, TokenAccount>>,
    /// CHECK: DC credits sent here
    pub recipient: AccountInfo<'info>,

    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(mut)]
    pub rndr_mint: Box<Account<'info, Mint>>,
    #[account(mut)]
    pub rc_mint: Box<Account<'info, Mint>>,
    /// CHECK: Verified by cpi
    #[account(
        mut,
        seeds = ["mint_windowed_breaker".as_bytes(), rc_mint.key().as_ref()],
        seeds::program = circuit_breaker_program.key(),
        bump = circuit_breaker.bump_seed
    )]
    pub circuit_breaker: Box<Account<'info, MintWindowedCircuitBreakerV0>>,
    pub circuit_breaker_program: Program<'info, CircuitBreaker>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

impl<'info> MintRenderCreditsV0<'info> {
    fn burn_ctx(&self) -> CpiContext<'_, '_, '_, 'info, Burn<'info>> {
        let cpi_accounts = Burn {
            mint: self.rndr_mint.to_account_info(),
            from: self.burner.to_account_info(),
            authority: self.owner.to_account_info(),
        };

        CpiContext::new(self.token_program.to_account_info(), cpi_accounts)
    }

    fn thaw_ctx(&self) -> CpiContext<'_, '_, '_, 'info, ThawAccount<'info>> {
        let cpi_accounts = ThawAccount {
            account: self.recipient_token_account.to_account_info(),
            mint: self.rc_mint.to_account_info(),
            authority: self.render_credits.to_account_info(),
        };
        CpiContext::new(self.token_program.to_account_info(), cpi_accounts)
    }

    fn mint_ctx(&self) -> CpiContext<'_, '_, '_, 'info, MintV0<'info>> {
        let cpi_accounts = MintV0 {
            mint: self.rc_mint.to_account_info(),
            to: self.recipient_token_account.to_account_info(),
            mint_authority: self.render_credits.to_account_info(),
            token_program: self.token_program.to_account_info(),
            circuit_breaker: self.circuit_breaker.to_account_info(),
        };
        CpiContext::new(self.circuit_breaker_program.to_account_info(), cpi_accounts)
    }

    fn freeze_ctx(&self) -> CpiContext<'_, '_, '_, 'info, FreezeAccount<'info>> {
        let cpi_accounts = FreezeAccount {
            account: self.recipient_token_account.to_account_info(),
            mint: self.rc_mint.to_account_info(),
            authority: self.render_credits.to_account_info(),
        };
        CpiContext::new(self.token_program.to_account_info(), cpi_accounts)
    }
}

pub fn handler(ctx: Context<MintRenderCreditsV0>, args: MintRenderCreditsArgsV0) -> Result<()> {
    let signer_seeds: &[&[&[u8]]] = &[&[
        b"rc",
        ctx.accounts.rc_mint.to_account_info().key.as_ref(),
        &[ctx.accounts.render_credits.render_credits_bump],
    ]];

    // unfreeze the recipient_token_account if necessary
    if ctx.accounts.recipient_token_account.is_frozen() {
        token::thaw_account(ctx.accounts.thaw_ctx().with_signer(signer_seeds))?;
    }

    let rndr_price_oracle = load_price_feed_from_account_info(&ctx.accounts.rndr_price_oracle)
        .map_err(|e| {
            msg!("Pyth error {}", e);
            error!(RenderCreditsErrors::PythError)
        })?;

    let current_time = Clock::get()?.unix_timestamp;
    let rndr_price = rndr_price_oracle
        .get_ema_price_no_older_than(current_time, if TESTING { 6000000 } else { 10 * 60 })
        .ok_or_else(|| error!(RenderCreditsErrors::PythPriceNotFound))?;

    require_gt!(rndr_price.price, 0);

    // Remove the confidence from the price to use the most conservative price
    // https://docs.pyth.network/pythnet-price-feeds/best-practices
    let rndr_price_with_conf = rndr_price
        .price
        .checked_sub(i64::try_from(rndr_price.conf.checked_mul(2).unwrap()).unwrap())
        .unwrap();

    // dc_exponent = 5 since $1 = 10^5 DC
    // expo is a negative number, i.e. normally -8 for 8 rndr decimals
    // dc = (price * 10^expo) * (rndr_amount * 10^-rndr_decimals) * 10^dc_exponent
    // dc = price * rndr_amount * 10^(expo - rndr_decimals + dc_exponent)
    // dc = price * rndr_amount / 10^(rndr_decimals - expo - dc_exponent)
    // rndr_amount = dc * 10^(rndr_decimals - expo - dc_exponent) / price
    let exponent = i32::try_from(ctx.accounts.rndr_mint.decimals).unwrap() - rndr_price.expo - 5;
    let decimals_factor = 10_u128
        .checked_pow(u32::try_from(exponent).unwrap())
        .ok_or_else(|| error!(RenderCreditsErrors::ArithmeticError))?;

    let (rndr_amount, dc_amount) = match (args.rndr_amount, args.rc_amount) {
        (Some(rndr_amount), None) => {
            let dc_amount = u64::try_from(
                u128::from(rndr_amount)
                    .checked_mul(u128::try_from(rndr_price_with_conf).unwrap())
                    .ok_or_else(|| error!(RenderCreditsErrors::ArithmeticError))?
                    .div(decimals_factor),
            )
            .map_err(|_| error!(RenderCreditsErrors::ArithmeticError))?;

            (rndr_amount, dc_amount)
        }
        (None, Some(dc_amount)) => {
            let rndr_amount = u64::try_from(
                u128::from(dc_amount)
                    .checked_mul(decimals_factor)
                    .ok_or_else(|| error!(RenderCreditsErrors::ArithmeticError))?
                    .checked_div(u128::try_from(rndr_price_with_conf).unwrap())
                    .ok_or_else(|| error!(RenderCreditsErrors::ArithmeticError))?,
            )
            .map_err(|_| error!(RenderCreditsErrors::ArithmeticError))?;

            (rndr_amount, dc_amount)
        }
        (None, None) => {
            return Err(error!(RenderCreditsErrors::InvalidArgs));
        }
        (Some(_), Some(_)) => {
            return Err(error!(RenderCreditsErrors::InvalidArgs));
        }
    };

    // burn the rndr tokens
    token::burn(ctx.accounts.burn_ctx(), rndr_amount)?;

    msg!(
        "RNDR Price is {} * 10^{}, issuing {} data credits",
        rndr_price_with_conf,
        rndr_price.expo,
        dc_amount
    );

    // mint the new tokens to recipient
    mint_v0(
        ctx.accounts.mint_ctx().with_signer(signer_seeds),
        MintArgsV0 { amount: dc_amount },
    )?;

    token::freeze_account(ctx.accounts.freeze_ctx().with_signer(signer_seeds))?;

    Ok(())
}
