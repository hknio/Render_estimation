import * as anchor from "@coral-xyz/anchor";
import {AnchorProvider, Program} from "@coral-xyz/anchor";
import { Keypair as HeliumKeypair } from "@helium/crypto";
import { createAta, createAtaAndMint, createMint } from "../packages/spl-utils/src";
import { parsePriceData } from "@pythnetwork/client";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID, createAssociatedTokenAccount,
  createAssociatedTokenAccountIdempotentInstruction, createAssociatedTokenAccountInstruction, getAccount,
  getAssociatedTokenAddress, TOKEN_PROGRAM_ID
} from "@solana/spl-token";
import * as web3 from "@solana/web3.js";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Signer,
  SystemProgram,
  SYSVAR_RENT_PUBKEY, Transaction
} from "@solana/web3.js";
import BN from "bn.js";
import { assert, expect } from "chai";
import {
  renderCreditsKey,
  init as initRenderCredits, RNDR_PRICE_ORACLE,
  PROGRAM_ID as RENDER_CREDITS_PROGRAM_ID,
} from "../packages/render-credits-sdk/src";
import {
  threadKey,
  burnRewardsKey,
  CLOCKWORK_PID,
  init as initBurnRewards,
  PROGRAM_ID as BURN_REWARDS_PROGRAM_ID,
} from "../packages/burn-rewards-sdk/src";
import {
  emissionScheduleKey,
  init as initEmissionSchedule,
  PROGRAM_ID as EMISSION_SCHEDULE_PROGRAM_ID,
} from "../packages/emission-schedule-sdk/src";
import { toBN, toNumber } from "../packages/spl-utils/src";
import { RenderCredits } from "../target/types/render_credits";
import { ThresholdType } from "../packages/circuit-breaker-sdk/src";
import { BurnRewards } from "../packages/idls/lib/types/burn_rewards";
import {EmissionSchedule} from "../packages/idls/lib/types/emission_schedule";

describe("render-credits", () => {
  anchor.setProvider(anchor.AnchorProvider.local("http://127.0.0.1:8899"));

  let emissionScheduleProgram: Program<EmissionSchedule>;
  let rcKey: PublicKey;
  let emissionScheduleK: PublicKey;
  let schedule: any[];
  let rndrMint: PublicKey;
  let rndrDecimals = 8;
  const provider = anchor.getProvider() as anchor.AnchorProvider;
  provider.connection.onLogs('all', (l, ctx) => {
    console.log(l)
  })
  const me = provider.wallet.publicKey;

  before(async () => {
    await provider.connection.requestAirdrop(
      me,
      3 * LAMPORTS_PER_SOL
    )
    console.log(`balance ${await provider.connection.getBalance(provider.wallet.publicKey)}` )
    emissionScheduleProgram = await initEmissionSchedule(
      provider,
      EMISSION_SCHEDULE_PROGRAM_ID,
      anchor.workspace.EmissionSchedule.idl
    );
    // fresh start
    rndrMint = await createMint(provider, rndrDecimals, me, me);
    emissionScheduleK = (await emissionScheduleKey(rndrMint))[0]

    schedule = [
      {
        startUnixTime: new BN(0),
        emissionsPerEpoch: new BN(10),
        emitted: false,
        totalRcBurned: new BN(0),
      },
        {
          startUnixTime: new BN(5),
          emissionsPerEpoch: new BN(5),
          emitted: false,
          totalRcBurned: new BN(0)
        }
      ]

    try {
      await emissionScheduleProgram
        .methods
        .initializeEmissionScheduleV0({
          authority: me,
          emissionSchedule: schedule
        }).
        accounts({
          rndrMint,
          schedule: null
        }).
        rpc({
          skipPreflight: true
        })
    } catch (e) {
      console.log(`emissionSchedule ${e}`)
      throw e
    }
  });

  it("initializes schedule", async () => {
    const retrieved =
      await emissionScheduleProgram
        .account
        .emissionSchedule
        .fetch(rcKey);
    assert.equal(retrieved?.emissionSchedule, schedule);
    assert.equal(retrieved?.authority, me);
  });


  it("updates schedule", async () => {
    const schedule1 = [
      {
        startUnixTime: new BN(0),
        emissionsPerEpoch: new BN(10),
        emitted: false,
        totalRcBurned: new BN(3300),
      },
    ]
    await emissionScheduleProgram
      .methods
      .updateEmissionScheduleV0({
        emissionSchedule: schedule1
      })
      .accounts({
        authority: me,
        schedule: schedule1
      })
      .rpc({
        skipPreflight: true
      })
    const retrieved = await emissionScheduleProgram
      .account
      .emissionSchedule
      .fetch(emissionScheduleK)
    assert.equal(retrieved.emissionSchedule, schedule1)
  });

});
