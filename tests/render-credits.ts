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

  let renderCreditsProgram: Program<RenderCredits>;
  let burnRewardsProgram: Program<BurnRewards>;
  let emissionScheduleProgram: Program<EmissionSchedule>;
  let rcKey: PublicKey;
  let burnRewardsK: PublicKey;
  let emissionScheduleK: PublicKey;
  let rndrMint: PublicKey;
  let rcMint: PublicKey;
  let burner: PublicKey;
  let recipientTokenAccount: PublicKey;
  let recipientRCTokenAccount: PublicKey;
  let startRndrBal = 10000;
  let startDcBal = 2;
  let rndrDecimals = 8;
  let rcDecimals = 0;
  const provider = anchor.getProvider() as anchor.AnchorProvider;
  provider.connection.onLogs('all', (l, ctx) => {
    console.log(l)
  })
  const me = provider.wallet.publicKey;

  beforeEach(async () => {
    await provider.connection.requestAirdrop(
      me,
      3 * LAMPORTS_PER_SOL
    )
    console.log(`balance ${await provider.connection.getBalance(provider.wallet.publicKey)}` )
    renderCreditsProgram = await initRenderCredits(
      provider,
      RENDER_CREDITS_PROGRAM_ID,
      anchor.workspace.RenderCredits.idl
    );
    burnRewardsProgram = await initBurnRewards(
      provider,
      BURN_REWARDS_PROGRAM_ID,
      anchor.workspace.BurnRewards.idl
    );
    emissionScheduleProgram = await initEmissionSchedule(
      provider,
      EMISSION_SCHEDULE_PROGRAM_ID,
      anchor.workspace.EmissionSchedule.idl
    );
    // fresh start
    rndrMint = await createMint(provider, rndrDecimals, me, me);
    rcMint = await createMint(provider, rcDecimals, me, me);
    burner = await createAtaAndMint(
      provider,
      rndrMint,
      toBN(startRndrBal, rndrDecimals).toNumber(),
      me
    );
    recipientTokenAccount = await createAtaAndMint(
      provider,
      rndrMint,
      toBN(startDcBal, rcDecimals).toNumber(),
      me
    );
    recipientRCTokenAccount = await createAtaAndMint(
      provider,
      rcMint,
      toBN(startDcBal, rcDecimals).toNumber(),
      me
    );

    emissionScheduleK = (await emissionScheduleKey(rndrMint))[0]

    try {
      await emissionScheduleProgram
        .methods
        .initializeEmissionScheduleV0({
          authority: me,
          emissionSchedule: [
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
          ],
        }).
        accounts({
          rndrMint,
          schedule: emissionScheduleK
        }).
        rpc({
          skipPreflight: true
        })
    } catch (e) {
      console.log(`emissionSchedule ${e}`)
      throw e
    }

    burnRewardsK = (await burnRewardsKey(me))[0]

    const method = await renderCreditsProgram.methods
      .initializeRenderCreditsV0({
        authority: me,
        config: {
          windowSizeSeconds: new BN(60),
          thresholdType: ThresholdType.Absolute as never,
          threshold: new BN("10000000000000000000"),
        },
      })
      .accounts({
        rndrMint,
        rcMint,
        payer: me,
        rndrPriceOracle: RNDR_PRICE_ORACLE,
      });
    // @ts-ignore
    rcKey = (await method.pubkeys()).renderCredits!;
    try {
      await method.rpc({
        skipPreflight: true,
      });
    } catch (e) {
      console.log(`initializeRenderCredits err ${e}`)
      throw e
    }
  });

  it("initializes render credits", async () => {
    const renderCreditsAcc =
      await renderCreditsProgram
      .account
      .renderCreditsV0
      .fetch(rcKey);
    assert(renderCreditsAcc?.rcMint.equals(rcMint));
    assert(renderCreditsAcc?.rndrMint.equals(rndrMint));
    assert(renderCreditsAcc?.authority.equals(me));
  });

  describe("with render credits", async () => {

    it("mints some render credits with RNDR amount", async () => {

      await renderCreditsProgram.methods
        .mintRenderCreditsV0({
          rndrAmount: new BN(new BN(10).pow(new BN(8))),
          rcAmount: null,
        })
        .accounts({
          rcMint,
          burner,
          recipientTokenAccount: recipientRCTokenAccount,
        })
        .rpc({ skipPreflight: true });

      const dcAta = await getAssociatedTokenAddress(rcMint, me);
      const dcAtaAcc = await getAccount(provider.connection, dcAta);
      const hntAta = await getAssociatedTokenAddress(rndrMint, me);
      assert(dcAtaAcc.isFrozen);
      const dcBal = await provider.connection.getTokenAccountBalance(dcAta);
      const hntBal = await provider.connection.getTokenAccountBalance(hntAta);
      const pythData = (await provider.connection.getAccountInfo(RNDR_PRICE_ORACLE))!.data;
      const price = parsePriceData(pythData);
      console.log(price);

      const approxEndBal =
        startDcBal +
        Math.floor(
          (price.emaPrice.value - price.emaConfidence!.value * 2) * 10 ** 5
        );
      expect(dcBal.value.uiAmount).to.be.within(
        approxEndBal - 1,
        approxEndBal + 1
      );
      expect(hntBal.value.uiAmount).to.eq(startRndrBal - 1);
    });

    it("mints some data credits with dc amount", async () => {
      let rcAmount = 1428 * 10**5
      await renderCreditsProgram.methods
        .mintRenderCreditsV0({
          rndrAmount: null,
          rcAmount: new BN(rcAmount),
        })
        .accounts({rcMint, burner: burner, recipientTokenAccount: recipientRCTokenAccount })
        .rpc({ skipPreflight: true });

      const dcAta = await getAssociatedTokenAddress(rcMint, me);
      const dcAtaAcc = await getAccount(provider.connection, dcAta);

      assert(dcAtaAcc.isFrozen);
      const dcBal = await provider.connection.getTokenAccountBalance(dcAta);
      const hntBal = await provider.connection.getTokenAccountBalance(
        await getAssociatedTokenAddress(rndrMint, me)
      );
      const pythData = (await provider.connection.getAccountInfo(RNDR_PRICE_ORACLE))!.data;
      const price = parsePriceData(pythData);
      const approxEndBal =
        startRndrBal -
        (Math.floor(rcAmount * 10 ** 11) /
          Number(
            price.emaPrice.valueComponent -
              price.emaConfidence.valueComponent * BigInt(2)
          )) *
          10 ** -rndrDecimals;
      expect(hntBal.value.uiAmount).to.be.within(approxEndBal * 0.999, approxEndBal * 1.001);
      expect(dcBal.value.uiAmount).to.eq(startDcBal + rcAmount);
    });

    it("updates render credits", async () => {
      await renderCreditsProgram.methods
        .updateRenderCreditsV0({
          newAuthority: PublicKey.default,
          rndrPriceOracle: null
        })
        .accounts({
          rcMint: rcMint,
        })
        .rpc();

      const dc = renderCreditsKey(rcMint)[0];
      const dcAcc = await renderCreditsProgram.account.renderCreditsV0.fetch(dc);

      assert.isTrue(PublicKey.default.equals(dcAcc.authority));
    });

    it("burns and updates rewards", async() => {
      try {
        await burnRewardsProgram
          .methods
          .initializeBurnRewardsV0({
            schedule: null,
            authority: me,
          })
          .accounts({
            burnRewards: burnRewardsK,
            emissionSchedule: (await emissionScheduleKey(rndrMint))[0],
            emissionScheduleProgram: EMISSION_SCHEDULE_PROGRAM_ID,
            escrow: burner,
            to: recipientTokenAccount,
            thread: (await threadKey(burnRewardsK))[0],
            clockwork: CLOCKWORK_PID,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            rndrMint,
          }).rpc({
            skipPreflight: true,
            commitment: 'finalized'
          })
      } catch (e) {
        console.log(`burnRewardsProgram ${e}`)
        throw e
      }

      await renderCreditsProgram
        .methods
        .burnRenderCreditsV0({
          amount: new BN(1)
        })
        .accounts({
          burnRewards: burnRewardsK,
          burnRewardsProgram: BURN_REWARDS_PROGRAM_ID,
          emissionSchedule: emissionScheduleK,
          emissionScheduleProgram: EMISSION_SCHEDULE_PROGRAM_ID,
          burner: recipientRCTokenAccount,
          rcMint,
          rndrMint
        })
        .rpc({
          skipPreflight: true,
          commitment: 'finalized'
        })

      const rewards = await burnRewardsProgram
        .account
        .burnRewardsV0
        .fetch(burnRewardsK, 'finalized');
      console.log(`rewards ${JSON.stringify(rewards.rewardsPerEpoch)}`)
      assert.equal(rewards.rewardsPerEpoch[rewards.rewardsPerEpoch.length - 1].rcBurned, new BN(1), "rcBurned != 1")

      const schedule = await emissionScheduleProgram
        .account
        .emissionSchedule
        .fetch(emissionScheduleK, 'finalized');
      console.log(`schedule ${JSON.stringify(schedule.emissionSchedule)}`)
      assert.equal(schedule.emissionSchedule[schedule.emissionSchedule.length - 1].totalRcBurned, new BN(1), "totalRcBurned != 1")
    })
  });
});
