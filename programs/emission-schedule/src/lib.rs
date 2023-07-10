mod instructions;
pub mod state;

use anchor_lang::prelude::*;
use instructions::*;
pub use state::*;

declare_id!("schdGUo2ZH1WmqxdB8ufmpAzij4FpPBa2Yzeq25HBX5");

#[derive(Clone)]
pub struct EmissionScheduleProgram;

impl anchor_lang::Id for EmissionScheduleProgram {
    fn id() -> Pubkey {
        crate::id()
    }
}

#[program]
pub mod emission_schedule {
    use super::*;

    pub fn initialize_emission_schedule_v0(
        ctx: Context<InitializeEmissionScheduleV0>,
        args: InitializeEmissionScheduleArgsV0,
    ) -> Result<()> {
        instructions::initialize_emission_schedule_v0::handler(ctx, args)
    }

    pub fn update_emission_schedule_v0(
        ctx: Context<UpdateEmissionScheduleV0>,
        args: UpdateEmissionScheduleArgsV0,
    ) -> Result<()> {
        instructions::update_emission_schedule_v0::handler(ctx, args)
    }
}
