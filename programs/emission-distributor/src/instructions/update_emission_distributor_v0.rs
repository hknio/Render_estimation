use {
    crate::state::*,
    anchor_lang::{
        prelude::*,
        solana_program::{instruction::Instruction, system_program, sysvar},
        InstructionData,
    },
    anchor_spl::{
        associated_token::{self, get_associated_token_address},
        token::{self, Mint},
    },
    clockwork_sdk::{
        cpi::ThreadUpdate,
        state::{Thread, ThreadAccount, ThreadSettings, Trigger},
        utils::PAYER_PUBKEY,
        ThreadProgram, ID as thread_program_ID,
    },
    shared_utils::resize_to_fit,
};

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct UpdateEmissionDistributorArgsV0 {
    pub rewards_escrows: Option<Vec<RewardsEscrow>>,
    // TODO(alex): will probably remove
    //pub schedule: Option<String>
}

#[derive(Accounts)]
#[instruction(args: UpdateEmissionDistributorArgsV0)]
pub struct UpdateEmissionDistributorV0<'info> {
    #[account(
    mut,
    address = distributor_thread.authority
    )]
    pub authority: Signer<'info>,

    #[account(address = thread_program_ID)]
    pub clockwork_program: Program<'info, ThreadProgram>,

    #[account(
    mut,
    seeds = [SEED_DISTRIBUTOR, distributor.mint.as_ref(), distributor.authority.as_ref()],
    bump = distributor.bump,
    has_one = mint,
    has_one = authority,
    )]
    pub distributor: Account<'info, EmissionDistributor>,

    #[account(
    mut,
    address = distributor_thread.pubkey(),
    constraint = distributor_thread.authority.eq(&distributor.authority),
    )]
    pub distributor_thread: Account<'info, Thread>,

    pub mint: Account<'info, Mint>,

    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(address = system_program::ID)]
    pub system_program: Program<'info, System>,
}

pub fn handler<'info>(
    ctx: Context<UpdateEmissionDistributorV0>,
    args: UpdateEmissionDistributorArgsV0,
) -> Result<()> {
    // get accounts
    let clockwork_program = &ctx.accounts.clockwork_program;
    let authority = &ctx.accounts.authority;
    let distributor = &mut ctx.accounts.distributor;
    let distributor_thread = &mut ctx.accounts.distributor_thread;
    let mint = &ctx.accounts.mint;
    let system_program = &ctx.accounts.system_program;

    /*if let Some(emission_schedule) = args.emission_schedule {
        ctx.accounts.distributor.emission_schedule = emission_schedule;
    }*/

    if let Some(rewards_escrow) = args.rewards_escrows {
        ctx.accounts.distributor.rewards_escrows = rewards_escrow;
    }

    resize_to_fit(
        &ctx.accounts.payer.to_account_info(),
        &ctx.accounts.system_program.to_account_info(),
        &ctx.accounts.distributor,
    )?;

    // update distributor thread
    // TODO(alex): can probably delete this if 1month epoch
    // cadence is set in stone
    /*let mut trigger: Option<Trigger> = None;
    if let Some(schedule) = args.schedule {
        trigger = Some(Trigger::Cron {
            schedule,
            skippable: true,
        });
    }

    let mint_token_ix = Instruction {
        program_id: crate::ID,
        accounts: crate::accounts::DistributeRndrV0 {
            associated_token_program: associated_token::ID,
            distributor: distributor.key(),
            distributor_thread: distributor_thread.key(),
            mint: mint.key(),
            payer: PAYER_PUBKEY,
            recipient: distributor.recipient.key(),
            recipient_token_account: distributor.recipient_token_account.key(),
            rent: sysvar::rent::ID,
            system_program: system_program::ID,
            token_program: token::ID,
        }.to_account_metas(Some(true)),
        data: crate::instruction::DistributeRndrV0{}.data()
    }.into();

    clockwork_sdk::cpi::thread_update(
        CpiContext::new_with_signer(
            clockwork_program.to_account_info(),
            ThreadUpdate {
                authority: authority.to_account_info(),
                thread: distributor_thread.to_account_info(),
                system_program: system_program.to_account_info(),
            },
            &[&[SEED_DISTRIBUTOR, distributor.mint.as_ref(), distributor.authority.as_ref(), &[distributor.bump]]],
        ),
        ThreadSettings {
            instructions: Some(vec![mint_token_ix]),
            fee: None,
            name: None,
            rate_limit: None,
            trigger,
        },
    )?;*/

    Ok(())
}
