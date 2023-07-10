use anchor_lang::prelude::*;

#[error_code]
pub enum BurnRewardsErrors {
    #[msg("No burn rewards found")]
    MissingBurnRewards,

    #[msg("No emission schedule found")]
    MissingEmissionSchedule,

    #[msg("Burn rewards already claimed")]
    BurnRewardsClaimed,
}
