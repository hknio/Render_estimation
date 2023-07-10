use anchor_spl::token::Mint;
use {
    crate::state::*,
    anchor_lang::{
        prelude::*,
        solana_program::{system_program, sysvar},
    },
};

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct InitializeBridgeArgsV0 {
    pub authority: Pubkey,
}

#[derive(Accounts)]
#[instruction(args: InitializeBridgeArgsV0)]
pub struct InitializeBridgeV0<'info> {
    #[account(
        init,
        seeds = [SEED_BRIDGE, mint.key().as_ref()],
        bump,
        payer = payer,
        space = 8 + std::mem::size_of::<BridgeV0>(),
    )]
    pub bridge: Box<Account<'info, BridgeV0>>,
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub mint: Box<Account<'info, Mint>>,
    #[account(address = system_program::ID)]
    pub system_program: Program<'info, System>,
}

pub fn handler<'info>(
    ctx: Context<InitializeBridgeV0>,
    args: InitializeBridgeArgsV0,
) -> Result<()> {
    ctx.accounts.bridge.authority = args.authority;
    ctx.accounts.bridge.bump = *ctx.bumps.get("bridge").unwrap();
    Ok(())
}
