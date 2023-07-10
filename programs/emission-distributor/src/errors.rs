use anchor_lang::prelude::*;

#[error_code]
pub enum EmissionDistributorErrors {
    #[msg("Bump couldn't be found")]
    BumpNotAvailable,

    #[msg("No emission schedule found")]
    MissingEmissionScheduleItem,

    #[msg("No rewards account found")]
    MissingRewardsAccountInfo,

    #[msg("Percentages don't add up to 100")]
    PercentagesDontAddUp,
}
