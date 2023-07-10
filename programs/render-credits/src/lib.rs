use anchor_lang::prelude::*;

mod circuit_breaker;
mod errors;
mod instructions;
mod state;

pub use errors::*;
pub use instructions::*;
pub use state::*;

declare_id!("cred9X51LcyZgyDrJt3CmsLc1Y6v7kjyXbUL4VUJMjz");

#[program]
pub mod render_credits {
    use super::*;
    use clockwork_sdk::state::ThreadResponse;

    pub fn initialize_render_credits_v0(
        ctx: Context<InitializeRenderCreditsV0>,
        args: InitializeRenderCreditsArgsV0,
    ) -> Result<()> {
        instructions::initialize_render_credits_v0::handler(ctx, args)
    }

    pub fn mint_render_credits_v0(
        ctx: Context<MintRenderCreditsV0>,
        args: MintRenderCreditsArgsV0,
    ) -> Result<()> {
        instructions::mint_render_credits_v0::handler(ctx, args)
    }

    pub fn burn_render_credits_v0(
        ctx: Context<BurnRenderCreditsV0>,
        args: BurnRenderCreditsArgsV0,
    ) -> Result<()> {
        instructions::burn_render_credits_v0::handler(ctx, args)
    }

    pub fn update_render_credits_v0(
        ctx: Context<UpdateRenderCreditsV0>,
        args: UpdateRenderCreditsArgsV0,
    ) -> Result<()> {
        instructions::update_render_credits_v0::handler(ctx, args)
    }
}
