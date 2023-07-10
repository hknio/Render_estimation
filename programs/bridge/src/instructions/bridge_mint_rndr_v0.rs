use anchor_lang::AccountDeserialize;
use anchor_spl::associated_token::get_associated_token_address;
use std::collections::HashMap;
use std::str::FromStr;
use {
    crate::errors::*,
    crate::state::*,
    anchor_lang::{
        prelude::*,
        solana_program::{system_program, sysvar},
    },
    anchor_spl::{
        associated_token::AssociatedToken,
        token::{self, transfer, Mint, MintTo, TokenAccount, Transfer},
    },
    circuit_breaker::{
        cpi::{accounts::MintV0, mint_v0},
        CircuitBreaker, MintArgsV0, MintWindowedCircuitBreakerV0,
    },
};

pub const TESTING: bool = std::option_env!("TESTING").is_some();

const BRIDGE_SIGNER: &str = if TESTING {
    "DcmiF8QgrpLrW9h7FetBr4xjzC8raQDMjfV6N8tGc1zx"
} else {
    "82q8TcoKVnEtLyYCk52QSegNmkQjgTWshmuU4Y3hQt3m"
};

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct BridgeMintRndrArgsV0 {
    pub eth_addr: Pubkey,
    pub amount: u64,
}

#[derive(Accounts)]
#[instruction(args: BridgeMintRndrArgsV0)]
pub struct BridgeMintRndrV0<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + std::mem::size_of::<BridgeTransferV0>(),
        seeds = ["bridge_transfer".as_bytes(), args.eth_addr.key().as_ref()],
        bump
    )]
    pub transfer: Account<'info, BridgeTransferV0>,

    #[account(
        mut,
        seeds = [SEED_BRIDGE, mint.key().as_ref()],
        bump = bridge.bump,
    )]
    pub bridge: Account<'info, BridgeV0>,

    /*#[account(
        mut,
        seeds = ["mint_windowed_breaker".as_bytes(), mint.key().as_ref()],
        seeds::program = circuit_breaker_program.key(),
        bump = circuit_breaker.bump_seed
    )]
    pub circuit_breaker: Box<Account<'info, MintWindowedCircuitBreakerV0>>,*/
    #[account(mut)]
    pub mint: Account<'info, Mint>,

    #[account(address = system_program::ID)]
    pub system_program: Program<'info, System>,
    #[account(address = anchor_spl::token::ID)]
    pub token_program: Program<'info, token::Token>,
    pub circuit_breaker_program: Program<'info, CircuitBreaker>,
    #[account(mut)]
    pub payer: Signer<'info>,
    /*/// TODO: Should this be permissioned? Should the owner have to sign to receive rewards?
    /// CHECK: Just required for ATA
    pub owner: AccountInfo<'info>,*/
    #[account(mut)]
    pub bridge_escrow: Box<Account<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = mint,
        associated_token::authority = payer,
    )]
    pub to: Box<Account<'info, TokenAccount>>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    #[account(address = Pubkey::from_str(BRIDGE_SIGNER).unwrap())]
    pub signer: Signer<'info>,
}

pub fn handler<'info>(
    ctx: Context<'_, '_, '_, 'info, BridgeMintRndrV0<'info>>,
    args: BridgeMintRndrArgsV0,
) -> Result<()> {
    let mut transfer_pda = &mut ctx.accounts.transfer;
    transfer_pda.amount = args.amount;

    let eth_tx =
        ctx.accounts
            .payer
            .key()
            .to_bytes()
            .into_iter()
            .fold("".to_string(), |mut str, b| {
                str.push_str(&format!("{:x}", b));
                str
            });
    msg!("eth_tx {}", eth_tx);
    transfer_pda.eth_addr = args.eth_addr;
    transfer_pda.sol_addr = ctx.accounts.payer.key();

    msg!("bridge transfer {:?}", transfer_pda);
    msg!("bridge key {:?}", ctx.accounts.bridge.key().to_string());

    transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.bridge_escrow.to_account_info(),
                to: ctx.accounts.to.to_account_info(),
                authority: ctx.accounts.bridge.to_account_info(),
            },
            &[&[
                SEED_BRIDGE,
                ctx.accounts.mint.key().as_ref(),
                &[ctx.accounts.bridge.bump],
            ]],
        ),
        args.amount,
    )?;

    Ok(())
}
