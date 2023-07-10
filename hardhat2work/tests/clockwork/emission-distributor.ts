import {ClockworkProvider} from "@clockwork-xyz/sdk";
import {Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction} from "@solana/web3.js";
import {createAta, createAtaAndMint, createMint, toBN} from "../../packages/spl-utils/src";
import {
  init,
  PROGRAM_ID as EMISSION_DISTRIBUTOR_PROGRAM_ID,
  emissionDistributorKey,
  CLOCKWORK_PID,
  threadKey
} from "../../packages/emission-distributor-sdk/src";
import {
  mintWindowedBreakerKey,
  PROGRAM_ID as CIRCUIT_BREAKER_PROGRAM_ID,
  ThresholdType
} from "../../packages/circuit-breaker-sdk/src";
import {
  emissionScheduleKey,
  PROGRAM_ID as EMISSIONS_SCHEDULE_PROGRAM_ID,
} from "../../packages/emission-schedule-sdk/src"
import * as anchor from "@coral-xyz/anchor";
import BN from "bn.js";
import {getAccount, TOKEN_PROGRAM_ID} from "@solana/spl-token";
import {assert, expect} from "chai";
import {Program} from "@coral-xyz/anchor";
import { EmissionDistributor } from "../../target/types/emission_distributor";
import { EmissionSchedule } from "../../target/types/emission_schedule";


describe("token-manager", () => {
  anchor.setProvider(anchor.AnchorProvider.local("http://127.0.0.1:8899"));

  let emissionDistributorProgram: Program<EmissionDistributor>;
  let emissionScheduleProgram: Program<EmissionSchedule>;
  let rndrMint: PublicKey;
  let rndrDecimals = 8;
  const provider = anchor.getProvider() as anchor.AnchorProvider;
  provider.connection.onLogs('all', (l, ctx) => {
    console.log(l)
  })
  const me = provider.wallet.publicKey;

  beforeEach(async () => {
    emissionDistributorProgram = await init(
      provider,
      EMISSION_DISTRIBUTOR_PROGRAM_ID,
      anchor.workspace.EmissionDistributor.idl
    );
    // fresh start
    rndrMint = await createMint(provider, rndrDecimals, me, me);
  });

  it("distributes tokens", async () => {
    const clockworkProvider = ClockworkProvider.fromAnchorProvider(provider);
    // 👇 will get fixed in future version of ClockworkProvider
    //clockworkProvider.threadProgram.provider.connection = AnchorProvider.defaultOptions();
    const THREAD_PROGRAM_ID = new PublicKey("CLoCKyJ6DXBJqqu2VWx9RLbgnwwR6BMHHuyasVmfMzBh");

    const authority = provider.wallet.publicKey;
    const escrow1 = Keypair.generate().publicKey;
    const escrow1Ata = await createAta(provider, rndrMint, escrow1, escrow1)
    const escrow1Pct = 20
    const escrow2 = Keypair.generate().publicKey;
    const escrow2Ata = await createAta(provider, rndrMint, escrow2, escrow2)
    const escrow2Pct = 80

    const [distributor] = emissionDistributorKey(rndrMint)
    const [circuitBreaker] = mintWindowedBreakerKey(rndrMint)
    const [thread] = threadKey(distributor)
    console.log(`distributor ${distributor.toString()}`)
    console.log(`threadK ${thread.toString()}`)

    try {

      await emissionScheduleProgram.methods
        .initializeEmissionScheduleV0({
        authority: authority,
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
      }).rpc({
        skipPreflight: true
      })

      await emissionDistributorProgram.methods
        .initializeEmissionDistributorV0({
          authority: me,
          rewardsAccounts: [
            { account: escrow1,
              percent: escrow1Pct
            },
            { account: escrow2,
              percent: escrow2Pct
            }
          ],

          schedule: "*/10 * * * * * *"
        })
        .preInstructions([anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({
          units: 1400000,
        })])
        .accounts({
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          circuitBreaker,
          circuitBreakerProgram: CIRCUIT_BREAKER_PROGRAM_ID,
          mintAuthority: me,
          freezeAuthority: me,
          mint: rndrMint,
          emissionDistributor: distributor,
          thread,
          clockwork: CLOCKWORK_PID,
          emissionSchedule: (await emissionScheduleKey(authority))[0],
          emissionScheduleProgram: EMISSIONS_SCHEDULE_PROGRAM_ID
        }).rpc({
          skipPreflight: true
        })

      /*const kp = loadKeypair(`${os.homedir()}/.config/solana/id.json`)
      const thread = await createDistributorThread(
        program,
        clockworkProvider,
        kp,
        distributor,
        rndrMint,
        [escrow1, escrow2]
      );*/

      //const [thread] = clockworkProvider.getThreadPDA(me, "mint_rndr");

      // Verifying that  has received the tokens
      console.log(`Verifying that Thread distributed 10 tokens to escrows...`);
      await waitForThreadExec(clockworkProvider, thread);
      const escrow1Amt = await verifyAmount(provider.connection, escrow1Ata, BigInt(escrow1Pct / 10));
      console.log(`escrow1 has received ${escrow1Amt} tokens`);
      const escrow2Amt = await verifyAmount(provider.connection, escrow2Ata, BigInt(escrow2Pct / 10));
      console.log(`escrow2 has received ${escrow2Amt} tokens`);

      // Verifying that we can change the distributor information
      /*const newAmount = BigInt(2_000);
      console.log(`Asking Thread to mint to Charlie every 10s (instead of Bob) at ${newAmount} tokens`);
      const cronSchedule = "*!/10 * * * * * *";
      await program.methods
        .updateRndrDistributorV0({
          newRecipient: escrow2,
          mintAmount: new anchor.BN(newAmount.toString()),
          schedule: cronSchedule
        })
        .accounts({
          systemProgram: SystemProgram.programId,
          clockworkProgram: THREAD_PROGRAM_ID,
          authority: authority,
          mint: rndrMint,
          distributor: distributor,
          distributorThread: thread,
        })
        .rpc();
      const mintAmount = (await program.account.rndrDistributor.fetch(distributor)).mintAmount;
      assert.equal(mintAmount.toString(), newAmount.toString());

      // Verifying that Charlie has received the tokens
      console.log(`Verifying that Thread distributed ${newAmount} tokens to Charlie instead of Bob`);
      await waitForThreadExec(clockworkProvider, thread);

      const charlieAmountLOL = (await getAccount(provider.connection, escrow2Ata)).amount;
      console.log(`CHARLIE AMOUNT: ${charlieAmountLOL}`);

      const charlieAmount = await verifyAmount(provider.connection, escrow2Ata, newAmount);
      console.log(`Charlie has received ${charlieAmount} tokens`);

      const bobAmount2 = await verifyAmount(provider.connection, bobAta, bobAmount);
      console.log(`Bob is not receiving tokens anymore and holds ${bobAmount2} `);*/
    } catch (e) {
      // ❌
      // 'Program log: Instruction: ThreadCreate',
      //     'Program 11111111111111111111111111111111 invoke [2]',
      //     'Allocate: account Address { address: ..., base: None } already in use'
      //
      // -> If you encounter this error, the thread address you are trying to assign is already in use,
      //    you can just change the threadLabel, to generate a new address.
      // -> OR update the thread with a ThreadUpdate instruction (more on this in another guide)


      // ❌
      // 'Program log: AnchorError caused by account: thread. Error Code: AccountNotSystemOwned.
      // Error Number: 3011. Error Message: The given account is not owned by the system program.',
      //
      // -> Same as the above, actually
      //    What's happening is that, the account is now owned by the ThreadProgram,
      //    and thus the Account has been successfully created.
      //    The account owner is now the ThreadProgram, but in your program you are expecting a SystemAccount
      // -> What to do? -> (Same as the first error) for your tests it's fine to just use a new address.
      console.error(e);
      // @ts-ignore
      expect.fail(e);
    }
  });
})

const verifyAmount = async (
  connection: Connection,
  ata: PublicKey,
  expectedAmount: bigint
) => {
  console.log(`fetching amt ${ata.toString()}`)
  const amount = (await getAccount(connection, ata)).amount;
  assert.equal(amount.toString(), expectedAmount.toString());
  return amount;
}



let lastThreadExec = new BN(0);
const waitForThreadExec = async (
  clockworkProvider: ClockworkProvider,
  thread: PublicKey,
  maxWait: number = 60
) => {
  let i = 1;
  while (true) {
    const threadPDA = (await clockworkProvider.getThreadAccount(thread));
    const execContext = threadPDA.execContext
    if (execContext) {
      if (lastThreadExec.toString() == "0" || execContext.lastExecAt > lastThreadExec) {
        lastThreadExec = execContext.lastExecAt;
        break;
      }
    }
    if (i == maxWait) throw Error("Timeout");
    console.log(`waiting ${i} thread ${JSON.stringify(threadPDA)}`)
    i += 1;
    await new Promise((r) => setTimeout(r, i * 1000));
  }
}