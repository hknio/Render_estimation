mod circuit_breaker;
mod errors;
mod instructions;
mod state;

use anchor_lang::prelude::*;
pub use errors::*;
pub use instructions::*;
pub use state::*;

declare_id!("distx4dCjTQQRNVoUn3pM1rVDUBoWRRYh1SK74xCGNA");

#[derive(Clone)]
pub struct EmissionDistributor;

impl anchor_lang::Id for EmissionDistributor {
    fn id() -> Pubkey {
        crate::id()
    }
}

#[program]
pub mod emission_distributor {
    use super::*;
    use clockwork_sdk::state::ThreadResponse;

    pub fn initialize_emission_distributor_v0(
        ctx: Context<InitializeEmissionDistributorV0>,
        args: InitializeEmissionDistributorArgsV0,
    ) -> Result<()> {
        instructions::initialize_emission_distributor_v0::handler(ctx, args)
    }

    pub fn distribute_emission_v0<'info>(
        ctx: Context<'_, '_, '_, 'info, DistributeEmissionV0<'info>>,
    ) -> Result<clockwork_sdk::state::ThreadResponse> {
        instructions::distribute_emission_v0::handler(ctx)
    }

    pub fn update_emission_distributor_v0(
        ctx: Context<UpdateEmissionDistributorV0>,
        args: UpdateEmissionDistributorArgsV0,
    ) -> Result<()> {
        instructions::update_emission_distributor_v0::handler(ctx, args)
    }
}
