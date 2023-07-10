import os from "os";
import yargs from "yargs/yargs";
import * as anchor from "@coral-xyz/anchor";
//import { createA } from "../../spl-utils/src";
import {
  AuthorityType,
  createMint,
  getMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  setAuthority
} from "@solana/spl-token";
import { ShdwDrive } from "@shadow-drive/sdk";
import {Connection, PublicKey, clusterApiUrl, Transaction, SystemProgram, LAMPORTS_PER_SOL} from "@solana/web3.js";
import * as fs from "fs";
import { MINT_SIZE, TOKEN_PROGRAM_ID, createInitializeMintInstruction, getMinimumBalanceForRentExemptMint, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createMintToInstruction } from '@solana/spl-token';
import {createAndMint, exists, loadKeypair} from "./utils";
import {
  init as initRenderCredits,
  renderCreditsKey,
  RNDR_PRICE_ORACLE,
} from "@render-foundation/render-credits-sdk"
import {
  init as initDistributor,
  rndrDistributorKey,
  threadKey,
  CLOCKWORK_PID
} from "@render-foundation/rewards-distributor-sdk";
import {BN} from "bn.js";
import {
  init as initCirc, ThresholdType, thresholdPercent, PROGRAM_ID as CIRCUIT_BREAKER_PROGRAM_ID,
  mintWindowedBreakerKey
} from "@render-foundation/circuit-breaker-sdk"
import {
  init as initBridge,
  PROGRAM_ID as BRIDGE_PROGRAM_ID,
  transferKey,
  bridgeKey
} from "@render-foundation/bridge-sdk";

export const run = async (args: any = process.argv) => {
  const yarg = yargs(args).options({
    wallet: {
      alias: "k",
      describe: "Anchor wallet keypair",
      default: `${os.homedir()}/.config/solana/id.json`,
    },
    url: {
      alias: "u",
      default: "http://127.0.0.1:8899",
      describe: "The solana url",
    },
    bucket: {
      alias: "b",
      default: "AaGotZQanCRnQj1ahytxkDCnQMGAbsvn73uv6AzwYc93",
      describe: "shadow drive url"
    },
    rndrKeypair: {
      type: "string",
      describe: "Keypair of the RNDR token",
      default: `${__dirname}/../keypairs/rndr.json`,
    },
    rcKeypair: {
      type: "string",
      describe: "Keypair of the Render Credit token",
      default: `${__dirname}/../keypairs/rc.json`,
    },
    escrowAccounts: {
      alias: 'a',
      type: "array",
      describe: "rewards escrow accounts",
      default: [`${__dirname}/../keypairs/escrow1.json` ]
    },
    escrowPercentages: {
      alias: 'p',
      type: 'array',
      default: [`100`]
    },
    mintBridge: {
      type: 'boolean',
      default: false
    },
    metaplexPid: {
      alias: 'm',
      describe: "metadata-token program id",
      default: 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
    }
  });

  const argv = await yarg.argv;

  console.log(`url ${argv.url}`)
  console.log(`rndr kp ${argv.rndrKeypair.toString()}`)
  console.log(`rc kp ${argv.rcKeypair.toString()}`)
  console.log(`mint to bridge ${argv.mintBridge}`)

  process.env.ANCHOR_WALLET = argv.wallet;
  process.env.ANCHOR_PROVIDER_URL = argv.url;
  anchor.setProvider(anchor.AnchorProvider.local(argv.url));

  const provider = anchor.getProvider() as anchor.AnchorProvider;

  const circuitBreakerProgram = await initCirc(provider);
  console.log(`inited circ`)
  const distributorProgram = await initDistributor(provider);
  console.log(`inited dist`)
  const renderCreditsProgram = await initRenderCredits(provider);
  console.log(`inited cred`)

  for (const p of [
    circuitBreakerProgram,
    distributorProgram,
    renderCreditsProgram
  ]) {
   provider.connection.onLogs(p.programId, (l, ctx) => {
      console.log(l)
    })
  }

  // shdw drive deployed recently to devnet but still only usablre in prod
  const shdwDriveConn = new Connection(
    clusterApiUrl(`mainnet-beta`)
  )

  const drive = await new ShdwDrive(shdwDriveConn, provider.wallet).init()
  //console.log(`drive ${drive..toString()}`)
  let bucket = argv.bucket
  let bucketUrl = `https://shdw-drive.genesysgo.net/${bucket}`
  //if (argv.bucket == "") {
  //  console.log(`creating bucket`)
  //  const resp = await drive.createStorageAccount("Render", "2MB", "v2")
  //  bucket = resp.shdw_bucket
  //  console.log(`created bucket ${bucket}`)
  //}

  const uploadAssets = async () => {
    const bucketKey = new PublicKey(bucket)
    const files =  await drive.listObjects(bucketKey)
    const toUpload =  [
      'rndr.png',
      'rndr.json',
      "rc.png",
      "rc.json"
    ].filter((k) => !files.keys.includes(k) )
    for (const f of toUpload) {
      console.log(`uploading ${f}`)
      const fc = fs.readFileSync(`${process.cwd()}/assets/${f}`)
      const resp = await drive.uploadFile(new PublicKey(bucket), {name: f, file: fc})
      if (resp.upload_errors.length > 0) {
        throw new Error(`failed uploading ${f}: ${resp.upload_errors}`)
      }
      console.log(`uploaded ${f}`)
    }
  }
  await uploadAssets()

  const rndrMintKp = loadKeypair(argv.rndrKeypair);
  const rcMintKp = loadKeypair(argv.rcKeypair);
  let authority = provider.wallet.publicKey;
  const authorityKp = loadKeypair(argv.wallet);

  const mpId = new PublicKey(argv.metaplexPid)
  console.log(`mpId ${mpId.toString()}`)
  if (!await exists(provider.connection, rndrMintKp.publicKey)) {
    console.log(`creating RNDR mint ${rndrMintKp.publicKey}`)
    await createAndMint({
      provider,
      mintKeypair: rndrMintKp,
      amount: 0,
      metadataUrl: `${bucketUrl}/rndr.json`,
      updateAuthority: authority,
      metadataPid: mpId
    });
  }

  const rndrDecimals = (await getMint(provider.connection, rndrMintKp.publicKey)).decimals

  if (argv.mintBridge) {
    const totalSupply = BigInt(536870912) * BigInt( 10 ** rndrDecimals)
    const bridgeProgram = await initBridge(provider)
    const bridgePDA = bridgeKey(rndrMintKp.publicKey)[0]
    await bridgeProgram.methods.initializeBridgeV0({
      authority: provider.publicKey
    }).accounts({
      bridge: bridgePDA,
      mint: rndrMintKp.publicKey,
    }).rpc({skipPreflight: true})

    const rewardsEscrowAcct = await getOrCreateAssociatedTokenAccount(provider.connection, authorityKp, rndrMintKp.publicKey, bridgePDA, true)
    console.log(`minting to bridge escrow ${rewardsEscrowAcct.address.toString()}`)
    ///= await get(rndrMint, bridgePDA, true)
    await mintTo(
      provider.connection,
      authorityKp,
      rndrMintKp.publicKey,
      rewardsEscrowAcct.address,
      provider.publicKey,
      totalSupply
    )
  }

  /*const circKey = mintWindowedBreakerKey(rcKeypair.publicKey)[0];
  if (!(await exists(provider.connection, circKey))) {
    console.log(`creating RC circuit-breaker PDA ${circKey.toString()}`)
    await circuitBreakerProgram
      .methods
      .initializeMintWindowedBreakerV0({
        authority: authority,
        mintAuthority: authority, // replace with dao or squads
        config: {
          windowSizeSeconds: new BN(10),
          thresholdType: ThresholdType.Percent as never,
          threshold: thresholdPercent(50),
        } as never,
      })
      .accounts({
        mint: rcKeypair.publicKey,
      }).rpc({ skipPreflight: true });
  }*/


  if (!await exists(provider.connection, rcMintKp.publicKey)) {

    console.log(`creating RC mint ${rcMintKp.publicKey}`)
    await createAndMint({
      provider,
      mintKeypair: rcMintKp,
      amount: 0,
      decimals: 0,
      metadataUrl: `${bucketUrl}/rc.json`,
      updateAuthority: authority,
      metadataPid: mpId
    });
  }


  const rcKey = renderCreditsKey(rcMintKp.publicKey)[0];
  if (!(await exists(provider.connection, rcKey))) {
    console.log(`creating render-credits PDA ${rcKey.toString()}`)
    await renderCreditsProgram.methods
      .initializeRenderCreditsV0({
        authority,
        config: {
          windowSizeSeconds: new anchor.BN(60 * 60),
          thresholdType: ThresholdType.Absolute as never,
          threshold: new anchor.BN(1000000000000),
        },
      })
      .accounts({
        rndrMint: rndrMintKp.publicKey,
        rcMint: rcMintKp.publicKey,
        rndrPriceOracle: RNDR_PRICE_ORACLE
      })
      .rpc({ skipPreflight: true });
  }

  const distributorKey = rndrDistributorKey(rndrMintKp.publicKey)[0];
  if (!(await exists(provider.connection, distributorKey))) {
    console.log(`creating distributor`)

    console.log(`escrowAccts ${argv.escrowAccounts} pcts ${argv.escrowPercentages}`)
    if (argv.escrowAccounts.length !== argv.escrowPercentages.length) {
      throw new Error("escrow accts len != escrow pcts len")
    }

    const accts = argv.escrowAccounts.map((act, i) =>
      ({ account: loadKeypair(act as string).publicKey,
        percent: Number(argv.escrowPercentages[i])
      })
    )

    console.log(`escrow accts ${JSON.stringify(accts)}`)
    const [thread] = threadKey(distributorKey)

    const secondsIn30Days = 30 * 24 * 60 * 60
    await distributorProgram.methods
      .initializeRndrDistributorV0({
        authority,
        rewardsAccounts: accts,
        //TODO(alex): finish and double check based on https://docs.google.com/spreadsheets/d/1vgNamfJsJeCOUnFGtrdBw7GJCtN25bXEIFOluJQAO64/edit#gid=365524340
        emissionSchedule: [
          {
            startUnixTime: new BN(0),
            emissionsPerEpoch: new BN(760567).mul(
              new BN(10).pow(new BN(rndrDecimals))
            )
          },
          {
            startUnixTime: new BN(secondsIn30Days).mul(new BN(13)),
            emissionsPerEpoch: new BN(492132).mul(new BN(10).pow(new BN(rndrDecimals))),
          },
          {
            startUnixTime: new BN(secondsIn30Days).mul(new BN(37)),
            emissionsPerEpoch: new BN(380284).mul(new BN(10).pow(new BN(rndrDecimals)))
          }
        ],
        // 10 min "*/10 * * * *"
        // 30 days
        schedule: "0 0 1 * *"
      })
      .preInstructions([anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({
        units: 1400000,
      })])
      .accounts({
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        circuitBreaker: mintWindowedBreakerKey(rndrMintKp.publicKey)[0],
        circuitBreakerProgram: CIRCUIT_BREAKER_PROGRAM_ID,
        mintAuthority: authority,
        freezeAuthority: authority,
        mint: rndrMintKp.publicKey,
        distributor: distributorKey,
        thread,
        clockwork: CLOCKWORK_PID
      }).rpc({skipPreflight: true})
  }
}

run()
