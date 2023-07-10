use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
pub struct RenderCreditsV0 {
    pub rc_mint: Pubkey,
    pub rndr_mint: Pubkey, // must be burned to mint rc
    pub authority: Pubkey, // EOA auth for managing this struct
    pub rndr_price_oracle: Pubkey,
    pub render_credits_bump: u8,
    pub account_payer: Pubkey,
    pub account_payer_bump: u8,
}
