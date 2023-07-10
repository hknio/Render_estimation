use crate::state::*;
use anchor_lang::solana_program::system_program;
use anchor_lang::{
    prelude::*, solana_program::instruction::Instruction,
    solana_program::native_token::LAMPORTS_PER_SOL, InstructionData,
};
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Burn, FreezeAccount, Mint, ThawAccount, Token, TokenAccount},
};
use clockwork_sdk::cpi::thread_create;
use clockwork_sdk::{state::Trigger, ThreadProgram};
use emission_schedule::{EmissionSchedule, EmissionScheduleProgram};
use std::mem::size_of;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct InitializeBurnRewardsArgsV0 {
    authority: Pubkey,
    schedule: Option<String>,
}

#[derive(Accounts)]
#[instruction(args: InitializeBurnRewardsArgsV0)]
pub struct InitializeBurnRewards<'info> {
    #[account(
        init_if_needed,
        payer = payer,
        space = 8 + 60 + size_of::<BurnRewardsV0>() +
        (size_of::<RewardsItem>() * emission_schedule.emission_schedule.len()),
        seeds = [SEED_BURN_REWARDS, owner.key().as_ref()],
        bump
    )]
    pub burn_rewards: Box<Account<'info, BurnRewardsV0>>,
    #[account(
        seeds = [b"emission_schedule", rndr_mint.key().as_ref()],
        seeds::program = emission_schedule_program.key(),
        bump = emission_schedule.bump,
    )]
    pub emission_schedule: Account<'info, EmissionSchedule>,
    pub emission_schedule_program: Program<'info, EmissionScheduleProgram>,

    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        associated_token::authority = payer,
        associated_token::mint = rndr_mint,
    )]
    pub to: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::authority = owner,
        associated_token::mint = rndr_mint,
    )]
    pub escrow: Box<Account<'info, TokenAccount>>,
    /// CHECK: handled by thread_create
    #[account(
        mut,
        seeds = [b"thread", burn_rewards.key().as_ref(), b"receive_rewards"],
        seeds::program = clockwork.key(),
        bump
    )]
    pub thread: AccountInfo<'info>,
    pub clockwork: Program<'info, ThreadProgram>,

    #[account(address = system_program::ID)]
    pub system_program: Program<'info, System>,
    #[account(address = anchor_spl::token::ID)]
    pub token_program: Program<'info, anchor_spl::token::Token>,

    #[account(mut)]
    pub rndr_mint: Box<Account<'info, Mint>>,

    #[account(mut)]
    pub payer: Signer<'info>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

pub fn handler(
    ctx: Context<InitializeBurnRewards>,
    args: InitializeBurnRewardsArgsV0,
) -> Result<()> {
    ctx.accounts.burn_rewards.set_inner(BurnRewardsV0 {
        authority: args.authority,
        bump: *ctx.bumps.get("burn_rewards").unwrap(),
        rewards_per_epoch: ctx
            .accounts
            .emission_schedule
            .emission_schedule
            .iter()
            .map(|ri| RewardsItem {
                start_unix_time: ri.start_unix_time,
                rc_burned: 0,
                rewards_claimed: 0,
            })
            .collect(),
    });

    let instr = Instruction {
        program_id: crate::ID,
        accounts: crate::accounts::DistributeBurnRewardsV0 {
            burn_rewards: ctx.accounts.burn_rewards.key(),
            to: ctx.accounts.to.key(),
            owner: ctx.accounts.owner.key(),
            thread: ctx.accounts.thread.key(),
            token_program: ctx.accounts.token_program.key(),
            escrow: ctx.accounts.escrow.key(),
            rndr_mint: ctx.accounts.rndr_mint.key(),
            emission_schedule: ctx.accounts.emission_schedule.key(),
            emission_schedule_program: ctx.accounts.emission_schedule_program.key(),
        }
        .to_account_metas(Some(true)),
        data: crate::instruction::DistributeBurnRewardsV0 {}.data(),
    };

    let signer_seeds: &[&[&[u8]]] = &[&[
        SEED_BURN_REWARDS,
        ctx.accounts.owner.to_account_info().key.as_ref(),
        &[ctx.bumps["burn_rewards"]],
    ]];
    let cpi = CpiContext::new_with_signer(
        ctx.accounts.clockwork.to_account_info(),
        clockwork_sdk::cpi::ThreadCreate {
            authority: ctx.accounts.burn_rewards.to_account_info(),
            payer: ctx.accounts.payer.to_account_info(),
            thread: ctx.accounts.thread.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
        },
        signer_seeds,
    );

    let (x, _) = Pubkey::find_program_address(
        &[
            SEED_BURN_REWARDS,
            ctx.accounts.owner.to_account_info().key.as_ref(),
            &[ctx.bumps["burn_rewards"]],
        ],
        &crate::ID,
    );

    msg!("foobar {} {}", ctx.accounts.burn_rewards.key(), x);

    thread_create(
        cpi,
        LAMPORTS_PER_SOL,
        "receive_rewards".to_string().as_bytes().to_vec(),
        vec![instr.into()],
        Trigger::Cron {
            schedule: args.schedule.unwrap_or("0 0 1 * *".into()),
            skippable: true,
        },
    )?;

    Ok(())
}
