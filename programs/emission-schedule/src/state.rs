use anchor_lang::prelude::*;

pub const SEED_EMISSION_SCHEDULE: &[u8] = b"emission_schedule";

#[account]
#[derive(Debug)]
pub struct EmissionSchedule {
    pub authority: Pubkey,
    pub bump: u8,
    pub emission_schedule: Vec<EmissionScheduleItem>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default, Debug)]
pub struct EmissionScheduleItem {
    pub start_unix_time: i64,
    pub emissions_per_epoch: u64,
    pub emitted: bool,
    pub total_rc_burned: u64,
}
