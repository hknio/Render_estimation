use anchor_lang::solana_program::native_token::LAMPORTS_PER_SOL;
use anchor_lang::{prelude::*, solana_program::instruction::Instruction, InstructionData};
use anchor_spl::associated_token::get_associated_token_address;
use circuit_breaker::ThresholdType;
use clockwork_sdk::state::SerializableInstruction;
use clockwork_sdk::{cpi::thread_create, state::Trigger, ThreadProgram};
use emission_schedule::EmissionSchedule;
use {
    crate::errors::*,
    crate::state::*,
    anchor_lang::{
        prelude::*,
        solana_program::{system_program, sysvar},
    },
    anchor_spl::{
        associated_token::AssociatedToken,
        token::{
            self, set_authority, spl_token::instruction::AuthorityType, Mint, SetAuthority,
            TokenAccount,
        },
    },
    circuit_breaker::{
        cpi::{accounts::InitializeMintWindowedBreakerV0, initialize_mint_windowed_breaker_v0},
        CircuitBreaker, InitializeMintWindowedBreakerArgsV0, WindowedCircuitBreakerConfigV0,
    },
    emission_schedule::EmissionScheduleProgram,
    std::mem::size_of,
};

pub const TESTING: bool = std::option_env!("TESTING").is_some();

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct InitializeEmissionDistributorArgsV0 {
    pub authority: Pubkey,
    pub rewards_accounts: Vec<RewardsEscrow>,
    // TODO(alex): get rid of this
    pub schedule: Option<String>,
}

#[derive(Accounts)]
#[instruction(args: InitializeEmissionDistributorArgsV0)]
pub struct InitializeEmissionDistributorV0<'info> {
    #[account(mut)]
    pub mint: Box<Account<'info, Mint>>,

    /// CHECK: Verified by CPI
    #[account(
        mut,
        seeds = ["mint_windowed_breaker".as_bytes(), mint.key().as_ref()],
        seeds::program = circuit_breaker_program.key(),
        bump
    )]
    pub circuit_breaker: AccountInfo<'info>,
    pub circuit_breaker_program: Program<'info, CircuitBreaker>,
    /// CHECK: Verified by CPI
    #[account(
        mut,
        seeds = [b"emission_schedule", mint.key().as_ref()],
        seeds::program = emission_schedule_program.key(),
        bump = emission_schedule.bump
    )]
    pub emission_schedule: Box<Account<'info, EmissionSchedule>>,
    pub emission_schedule_program: Program<'info, EmissionScheduleProgram>,
    #[account(
        init,
        seeds = [SEED_DISTRIBUTOR, mint.key().as_ref()],
        bump,
        payer = payer,
        space = 60 + 8 + size_of::<EmissionDistributor>() +
            (std::mem::size_of::<RewardsEscrow>() * args.rewards_accounts.len()),
    )]
    pub distributor: Box<Account<'info, EmissionDistributor>>,

    pub mint_authority: Signer<'info>,
    pub freeze_authority: Signer<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(address = system_program::ID)]
    pub system_program: Program<'info, System>,
    #[account(address = anchor_spl::token::ID)]
    pub token_program: Program<'info, anchor_spl::token::Token>,
    /// CHECK: handled by thread_create
    #[account(
        mut,
        seeds = [b"thread", distributor.key().as_ref(), b"mint_rndr"],
        seeds::program = clockwork.key(),
        bump
    )]
    pub thread: AccountInfo<'info>,
    pub clockwork: Program<'info, ThreadProgram>,
}

pub fn handler<'info>(
    ctx: Context<InitializeEmissionDistributorV0>,
    args: InitializeEmissionDistributorArgsV0,
) -> Result<()> {
    if args
        .rewards_accounts
        .iter()
        .fold(0u8, |tot, act| act.percent + tot)
        != 100u8
    {
        return Err(error!(EmissionDistributorErrors::PercentagesDontAddUp));
    }

    msg!("Claiming mint and freeze authority");
    initialize_mint_windowed_breaker_v0(
        CpiContext::new(
            ctx.accounts.circuit_breaker_program.to_account_info(),
            InitializeMintWindowedBreakerV0 {
                payer: ctx.accounts.payer.to_account_info(),
                circuit_breaker: ctx.accounts.circuit_breaker.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                mint_authority: ctx.accounts.mint_authority.to_account_info(),
                token_program: ctx.accounts.token_program.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
            },
        ),
        InitializeMintWindowedBreakerArgsV0 {
            authority: args.authority,
            config: WindowedCircuitBreakerConfigV0 {
                // No more than the first epoch of tokens will ever be distributed since it decays over time
                // We should be distributing once per epoch so this should never get triggered.
                window_size_seconds: u64::try_from(if TESTING { 3 } else { EPOCH_LENGTH }).unwrap(),
                threshold_type: ThresholdType::Absolute,
                threshold: ctx.accounts.emission_schedule.emission_schedule[0].emissions_per_epoch,
            },
            mint_authority: ctx.accounts.distributor.key(),
        },
    )?;
    set_authority(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            SetAuthority {
                account_or_mint: ctx.accounts.mint.to_account_info(),
                current_authority: ctx.accounts.freeze_authority.to_account_info(),
            },
        ),
        AuthorityType::FreezeAccount,
        Some(ctx.accounts.distributor.key()),
    )?;

    let mut instrs: Vec<SerializableInstruction> = vec![];
    for i in args.rewards_accounts.iter() {
        let token_address = get_associated_token_address(&i.account, &ctx.accounts.mint.key());
        let kickoff_ix = Instruction {
            program_id: crate::ID,
            accounts: crate::accounts::DistributeEmissionV0 {
                distributor: ctx.accounts.distributor.key(),
                distributor_thread: ctx.accounts.thread.key(),
                mint: ctx.accounts.mint.key(),
                /*mint_authority: ctx.accounts.mint_authority.key(),
                freeze_authority: ctx.accounts.freeze_authority.key(),*/
                system_program: ctx.accounts.system_program.key(),
                token_program: ctx.accounts.token_program.key(),
                circuit_breaker: ctx.accounts.circuit_breaker.key(),
                circuit_breaker_program: ctx.accounts.circuit_breaker_program.key(),
                emission_schedule: ctx.accounts.emission_schedule.key(),
                emission_schedule_program: ctx.accounts.emission_schedule_program.key(),
                to: token_address,
            }
            .to_account_metas(Some(true)),
            data: crate::instruction::DistributeEmissionV0 {}.data(),
        };
        instrs.push(kickoff_ix.into())
    }

    // initialize distributor account
    ctx.accounts.distributor.set_inner(EmissionDistributor {
        authority: args.authority,
        mint: ctx.accounts.mint.key(),
        bump: *ctx
            .bumps
            .get("distributor")
            .ok_or(EmissionDistributorErrors::BumpNotAvailable)?,
        rewards_escrows: args.rewards_accounts,
        emission_schedule: ctx.accounts.emission_schedule.key(),
    });

    msg!("distributor: {:#?}", ctx.accounts.distributor);

    let signer_seeds: &[&[&[u8]]] = &[&[
        SEED_DISTRIBUTOR,
        ctx.accounts.mint.to_account_info().key.as_ref(),
        &[ctx.bumps["distributor"]],
    ]];
    thread_create(
        CpiContext::new_with_signer(
            ctx.accounts.clockwork.to_account_info(),
            clockwork_sdk::cpi::ThreadCreate {
                authority: ctx.accounts.distributor.to_account_info(),
                payer: ctx.accounts.payer.to_account_info(),
                thread: ctx.accounts.thread.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
            },
            signer_seeds,
        ),
        LAMPORTS_PER_SOL,
        "mint_rndr".to_string().as_bytes().to_vec(),
        instrs,
        Trigger::Cron {
            schedule: args.schedule.unwrap_or("0 0 1 * *".into()),
            skippable: true,
        },
    )?;

    Ok(())
}
