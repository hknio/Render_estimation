mod errors;
mod instructions;
mod state;

use crate::instructions::*;
use crate::state::BridgeV0;
use anchor_lang::prelude::*;

declare_id!("brdgwnNUvW8rGAVzRrpiQiRv8dGBVvrJW79UB61sa16");

#[program]
pub mod bridge {
    use super::*;

    pub fn initialize_bridge_v0(
        ctx: Context<InitializeBridgeV0>,
        args: InitializeBridgeArgsV0,
    ) -> Result<()> {
        instructions::initialize_bridge_v0::handler(ctx, args)
    }

    pub fn bridge_mint_rndr_v0<'info>(
        ctx: Context<'_, '_, '_, 'info, BridgeMintRndrV0<'info>>,
        args: BridgeMintRndrArgsV0,
    ) -> Result<()> {
        instructions::bridge_mint_rndr_v0::handler(ctx, args)
    }

    pub fn delete_bridge_v0<'info>(
        ctx: Context<'_, '_, '_, 'info, DeleteBridgeV0<'info>>,
    ) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct DeleteBridgeV0<'info> {
    #[account(
        mut,
        close = receiver,
        constraint = payer.key() == bridge.authority.key(),
    )]
    pub bridge: Account<'info, BridgeV0>,
    #[account(mut)]
    pub receiver: SystemAccount<'info>,
    pub payer: Signer<'info>,
}
