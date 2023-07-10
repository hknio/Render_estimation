use anchor_lang::prelude::*;

declare_id!("circVph7iut5KFFEdc45V6whruKEduiCTnDDQ1iB1am");

pub mod errors;
pub mod instructions;
pub mod state;
pub mod window;

pub use errors::*;
pub use instructions::*;
pub use state::*;

#[derive(Clone)]
pub struct CircuitBreaker;

impl anchor_lang::Id for CircuitBreaker {
    fn id() -> Pubkey {
        crate::id()
    }
}

#[program]
pub mod circuit_breaker {
    use super::*;

    pub fn initialize_mint_windowed_breaker_v0(
        ctx: Context<InitializeMintWindowedBreakerV0>,
        args: InitializeMintWindowedBreakerArgsV0,
    ) -> Result<()> {
        instructions::initialize_mint_windowed_breaker_v0::handler(ctx, args)
    }

    pub fn initialize_account_windowed_breaker_v0(
        ctx: Context<InitializeAccountWindowedBreakerV0>,
        args: InitializeAccountWindowedBreakerArgsV0,
    ) -> Result<()> {
        instructions::initialize_account_windowed_breaker_v0::handler(ctx, args)
    }

    pub fn mint_v0(ctx: Context<MintV0>, args: MintArgsV0) -> Result<()> {
        instructions::mint_v0::handler(ctx, args)
    }

    pub fn transfer_v0(ctx: Context<TransferV0>, args: TransferArgsV0) -> Result<()> {
        instructions::transfer_v0::handler(ctx, args)
    }

    pub fn update_account_windowed_breaker_v0(
        ctx: Context<UpdateAccountWindowedBreakerV0>,
        args: UpdateAccountWindowedBreakerArgsV0,
    ) -> Result<()> {
        instructions::update_account_windowed_breaker_v0::handler(ctx, args)
    }

    pub fn update_mint_windowed_breaker_v0(
        ctx: Context<UpdateMintWindowedBreakerV0>,
        args: UpdateMintWindowedBreakerArgsV0,
    ) -> Result<()> {
        instructions::update_mint_windowed_breaker_v0::handler(ctx, args)
    }

    pub fn delete_mint_windowed_circuit_breaker_v0<'info>(
        ctx: Context<'_, '_, '_, 'info, DeleteMintWindowedCircuitBreakerV0<'info>>,
    ) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct DeleteMintWindowedCircuitBreakerV0<'info> {
    #[account(
    mut,
    close = receiver,
    constraint = payer.key() == mint_windowed_circuit_breaker.authority.key(),
  )]
    pub mint_windowed_circuit_breaker: Account<'info, MintWindowedCircuitBreakerV0>,
    #[account(mut)]
    pub receiver: SystemAccount<'info>,
    pub payer: Signer<'info>,
}
