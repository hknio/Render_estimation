use crate::state::*;
use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct UpdateEmissionScheduleArgsV0 {
    pub emission_schedule: Option<Vec<EmissionScheduleItem>>,
    // TODO(alex): will probably remove
    //pub schedule: Option<String>
}

#[derive(Accounts)]
#[instruction(args: UpdateEmissionScheduleArgsV0)]
pub struct UpdateEmissionScheduleV0<'info> {
    pub authority: Signer<'info>,
    #[account(
        mut,
        has_one = authority,
    )]
    pub schedule: Box<Account<'info, EmissionSchedule>>,
}

pub fn handler(
    ctx: Context<UpdateEmissionScheduleV0>,
    args: UpdateEmissionScheduleArgsV0,
) -> Result<()> {
    let schedule = &mut ctx.accounts.schedule;
    if let Some(emission_schedule) = args.emission_schedule {
        schedule.emission_schedule = emission_schedule;
    }
    Ok(())
}
