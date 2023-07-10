use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::token::Mint;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct UpdateRenderCreditsArgsV0 {
    new_authority: Option<Pubkey>,
    rndr_price_oracle: Option<Pubkey>,
}

#[derive(Accounts)]
#[instruction(args: UpdateRenderCreditsArgsV0)]
pub struct UpdateRenderCreditsV0<'info> {
    #[account(
    mut,
    seeds = ["rc".as_bytes(), rc_mint.key().as_ref()],
    bump = render_credits.render_credits_bump,
    has_one = authority,
  )]
    pub render_credits: Box<Account<'info, RenderCreditsV0>>,
    pub rc_mint: Box<Account<'info, Mint>>,
    pub authority: Signer<'info>,
}

pub fn handler(ctx: Context<UpdateRenderCreditsV0>, args: UpdateRenderCreditsArgsV0) -> Result<()> {
    if let Some(new_authority) = args.new_authority {
        ctx.accounts.render_credits.authority = new_authority;
    }

    if let Some(rndr_price_oracle) = args.rndr_price_oracle {
        ctx.accounts.render_credits.rndr_price_oracle = rndr_price_oracle;
    }

    Ok(())
}
