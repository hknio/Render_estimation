use anchor_lang::prelude::*;

pub const SEED_BURN_REWARDS: &[u8] = b"burn_rewards";

#[account]
#[derive(Debug)]
pub struct BurnRewardsV0 {
    pub authority: Pubkey,
    pub bump: u8,
    pub rewards_per_epoch: Vec<RewardsItem>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default, Debug)]
pub struct RewardsItem {
    pub start_unix_time: i64,
    pub rc_burned: u64,
    pub rewards_claimed: u64,
}
