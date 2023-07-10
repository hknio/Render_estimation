mod errors;
mod instructions;
mod state;

use anchor_lang::prelude::*;
pub use errors::*;
pub use instructions::*;
pub use state::*;

declare_id!("burnUzpV6LSPZFU8qBuj2yd5SdXGBFuYRn4cgmh3cue");

#[derive(Clone)]
pub struct BurnRewardsProgram;

impl anchor_lang::Id for BurnRewardsProgram {
    fn id() -> Pubkey {
        crate::id()
    }
}

#[program]
pub mod burn_rewards {
    use super::*;

    pub fn initialize_burn_rewards_v0(
        ctx: Context<InitializeBurnRewards>,
        args: InitializeBurnRewardsArgsV0,
    ) -> Result<()> {
        instructions::initialize_burn_rewards_v0::handler(ctx, args)
    }

    pub fn distribute_burn_rewards_v0<'info>(
        //ctx: Context<'_, '_, '_, 'info, DistributeRndrV0<'info>>,
        ctx: Context<DistributeBurnRewardsV0>,
    ) -> Result<clockwork_sdk::state::ThreadResponse> {
        instructions::distribute_burn_rewards_v0::handler(ctx)
    }

    /*pub fn update_rndr_distributor_v0(
        ctx: Context<UpdateRndrDistributorV0>,
        args: UpdateRndrDistributorArgsV0,
    ) -> Result<()> {
        instructions::update_rndr_distributor_v0::handler(ctx, args)
    }*/
}
