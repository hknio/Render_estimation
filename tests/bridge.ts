import * as anchor from "@coral-xyz/anchor";
import {Program} from "@coral-xyz/anchor";
import {Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction} from "@solana/web3.js";
import {createAta, createAtaAndMint, createMint, toBN} from "../packages/spl-utils/src";
import BN from "bn.js";
import {
  mintWindowedBreakerKey,
  PROGRAM_ID as CIRCUIT_BREAKER_PROGRAM_ID,
  ThresholdType
} from "../packages/circuit-breaker-sdk/src";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
  TOKEN_PROGRAM_ID,
  mintTo,
} from "@solana/spl-token";
import {
  init as initBridge,
  PROGRAM_ID as BRIDGE_PROGRAM_ID,
  transferKey,
  bridgeKey
} from "../packages/bridge-sdk/src";
import { EmissionDistributor } from "../packages/idls/lib/types/emission_distributor";
import { Bridge } from "../packages/idls/lib/types/bridge";
import {loadKeypair} from "./utils/solana";
import os from "os";

describe("bridge", () => {
  anchor.setProvider(anchor.AnchorProvider.local("http://127.0.0.1:8899"));

  let bridgeProgram: Program<Bridge>;
  let rndrMint: PublicKey;
  let rcMint: PublicKey;
  let burner: PublicKey;
  let recipientTokenAccount: PublicKey;
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
    await provider.connection.requestAirdrop(me, 3 * LAMPORTS_PER_SOL)
    console.log(`balance ${await provider.connection.getBalance(provider.wallet.publicKey)}` )
    bridgeProgram = await initBridge(
      provider,
      BRIDGE_PROGRAM_ID,
      anchor.workspace.Bridge.idl
    )
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
      rcMint,
      toBN(startDcBal, rcDecimals).toNumber(),
      me
    );

  });

  it("bridge txs", async () => {

    const escrow1 = Keypair.generate().publicKey;
    const escrow1Ata = await createAta(provider, rndrMint, escrow1, escrow1)
    const escrow1Pct = 20
    const escrow2 = Keypair.generate().publicKey;
    const escrow2Ata = await createAta(provider, rndrMint, escrow2, escrow2)
    const escrow2Pct = 80

    const mekp = loadKeypair(`${os.homedir()}/.config/solana/id.json`)

    const bridgePDA = bridgeKey(rndrMint)[0]
    await bridgeProgram.methods
      .initializeBridgeV0({authority: me})
      .accounts({
        bridge: bridgePDA,
        mint: rndrMint,
      }).rpc({skipPreflight: true})

    const rewardsEscrowAcct = await getOrCreateAssociatedTokenAccount(provider.connection, mekp, rndrMint, bridgePDA, true)
    await mintTo(
      provider.connection,
      mekp,
      rndrMint,
      rewardsEscrowAcct.address,
      me,
      10000000,
    )

    const [circuitBreaker] = mintWindowedBreakerKey(rndrMint)

    const ethAddr = Keypair.generate().publicKey;

    const bridge = Keypair.fromSecretKey(
      Uint8Array.from([17,228,89,214,219,13,158,250,114,38,190,139,106,25,220,21,215,252,36,226,74,158,128,0,137,206,41,201,95,227,124,14,187,118,32,93,209,59,179,105,94,159,116,227,10,11,62,241,110,205,185,24,10,49,219,232,126,52,240,84,154,202,128,169])
    )

    const tokenAcct = await getAssociatedTokenAddress(
      rndrMint,
      mekp.publicKey
    )

    await bridgeProgram.methods
    .bridgeMintRndrV0({
      ethAddr: ethAddr,
      amount: new BN(2000)
    })
    .accounts({
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      circuitBreakerProgram: CIRCUIT_BREAKER_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      bridgeEscrow: rewardsEscrowAcct.address,
      bridge: bridgePDA,
      mint: rndrMint,
      to: tokenAcct,
      transfer: transferKey(ethAddr)[0],
      signer: bridge.publicKey,
      payer: me
    })
    .signers([mekp , bridge])
    //.signers([kp])
    .rpc({skipPreflight: true})
  })

});
