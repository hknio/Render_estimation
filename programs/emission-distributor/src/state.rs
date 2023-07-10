use anchor_lang::prelude::*;

pub const SEED_DISTRIBUTOR: &[u8] = b"rndr_distributor";

// every month, in seconds
pub const EPOCH_LENGTH: i64 = 30 * 24 * 60 * 60;

#[account]
#[derive(Debug)]
pub struct EmissionDistributor {
    pub authority: Pubkey,
    pub mint: Pubkey,
    pub bump: u8,
    pub emission_schedule: Pubkey,
    pub rewards_escrows: Vec<RewardsEscrow>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default, Debug)]
pub struct EmissionScheduleItem {
    pub start_unix_time: i64,
    pub emissions_per_epoch: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default, Debug)]
pub struct RewardsEscrow {
    pub account: Pubkey,
    pub percent: u8, // percent / 100
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default, Debug)]
pub struct RewardsItem {
    pub start_unix_time: i64,
    pub rc_burned: u64,
    pub rewards_claimed: u64,
}
