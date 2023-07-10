// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import {TOKEN_CONTRACT_ABI, ETH_URL, SOLANA_URL, Transfer, BURN_CONTRACT_ABI} from "@/utils";
import Web3 from "web3";
import {signature} from "@solana/web3.js/src/layout";
import {Transaction as EthTransaction} from "web3-eth/types";
import nacl from 'tweetnacl';
import * as anchor from '@coral-xyz/anchor';
import {Connection, Keypair, PublicKey, Signer, SystemProgram} from "@solana/web3.js";
import {AnchorProvider} from "@coral-xyz/anchor";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import * as abiDecoder from 'abi-decoder';
import {
  transferKey,
  bridgeKey,
  PROGRAM_ID as BRIDGE_PROGRAM_ID,
  init as initBridge
} from "@render-foundation/bridge-sdk"
import {PROGRAM_ID as CIRCUIT_BREAKER_PROGRAM_ID} from "@render-foundation/circuit-breaker-sdk"
import {PROGRAM_ID as REWARDS_DISTRIBUTOR_PROGRAM_ID} from "@render-foundation/rewards-distributor-sdk"
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccount,
  getAssociatedTokenAddress, getMint, getOrCreateAssociatedTokenAccount,
  TOKEN_PROGRAM_ID
} from "@solana/spl-token";


type Data = {
  tx: string
} | {
  error: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data | undefined>
) {

  if (req.method != "POST") {
    res.status(405).send(undefined)
    return
  }

  const transfer: Transfer = JSON.parse(req.body)
  console.log(`transfer ${JSON.stringify(transfer)}`)

  const transfererKey = new PublicKey(transfer.solanaAddr)
  const {signature, ...sigComponents} =  transfer

  if (!nacl.sign.detached.verify(
    anchor.utils.bytes.utf8.encode(
      JSON.stringify(sigComponents),
    ),
    anchor.utils.bytes.hex.decode(signature),
    transfererKey.toBytes(),
  )) {
    res.status(403).send({error: `invalid signature ${signature}`})
    return
  }

  console.log(`verified signer`)

  const ethProvider = new Web3.providers.HttpProvider(ETH_URL)
  const web3 = new Web3(ethProvider)
  const tx = await web3.eth.getTransaction(transfer.ethTx)
  console.log(`eth tx ${JSON.stringify(tx)}`)

  const prov = new Web3.providers.HttpProvider(ETH_URL)
  const ethWeb3 = new Web3(prov);
  const cont = new ethWeb3.eth.Contract(TOKEN_CONTRACT_ABI, process.env.NEXT_PUBLIC_ETH_CONTRACT)
  const decimals = await cont.methods.decimals().call();
  const reqAmt = BigInt(transfer.burnedAmount) * BigInt(Math.pow(10, Number(decimals)))

  const err = validateOp(tx, reqAmt)
  if (err) {
    res.status(400).send({error: err})
  }

  const kp = Keypair.fromSecretKey(
    Uint8Array.from(
      process.env.BRIDGE_PRIV_KEY!.split(',').map((n) =>
        parseInt(n),
      ),
    ),
  )
  const wallet = new NodeWallet(kp)

  const conn = new Connection(SOLANA_URL);
  const bridgeProgramId = new PublicKey(process.env.NEXT_PUBLIC_BRIDGE_PROGRAM_KEY)
  const provider = new AnchorProvider(conn, wallet, {});
  provider.connection.onLogs(
    bridgeProgramId,
    (l, ctx) => {
    console.log(l)
  })
  const bridgeProgram = await initBridge(provider) /*new anchor.Program<Bridge>(
    IDL as unknown as Bridge,
    bridgeProgramId,
    provider,
  );*/

  const rndrMint = new PublicKey(process.env.RNDR_MINT_KEY!)

  const rndrDecimals = (await getMint(conn, rndrMint)).decimals
  console.log(`rndrDecimals ${rndrDecimals}`)

  const tokenAccount = await getAssociatedTokenAddress(rndrMint, transfererKey)

  console.log(`creating sol tx`)

  // eth txs should be able to be converted to bs58 like this for use
  // in seeds
  const ethTxBs58 = new PublicKey(anchor.utils.bytes.bs58.encode(
    anchor.utils.bytes.hex.decode(transfer.ethTx),
  ));

  const solanaAmt = new anchor.BN(Number(transfer.burnedAmount.toString()) * Math.pow(10, rndrDecimals))

  const bridgePDA = bridgeKey(rndrMint)[0]
  const rewardsEscrowAcct = await getAssociatedTokenAddress(rndrMint, bridgePDA, true)

  const solTx = await bridgeProgram.methods
    .bridgeMintRndrV0({
      ethAddr: ethTxBs58,
      amount: solanaAmt
    })
    .preInstructions([anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({
      units: 1400000,
    })])
    .accounts({
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      circuitBreakerProgram: CIRCUIT_BREAKER_PROGRAM_ID,
      rewardsDistributorProgram: REWARDS_DISTRIBUTOR_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      bridge: bridgePDA,
      bridgeEscrow: rewardsEscrowAcct,
      mint: rndrMint,
      to: tokenAccount,
      transfer: transferKey(ethTxBs58)[0],
      signer: kp.publicKey,
      payer: new PublicKey(transfer.solanaAddr)
    })
    .transaction()

  solTx.recentBlockhash = (await conn.getLatestBlockhash()).blockhash
  // first kp pays i.e. user
  solTx.setSigners(transfererKey, kp.publicKey)
  solTx.partialSign(kp)

  const serTx = anchor.utils.bytes.hex.encode(solTx.serialize(
    {requireAllSignatures: false}
  ))
  console.log(`successfully serialized sol tx ${serTx}`)

  res.status(200).json({ tx: serTx })
}

const validateOp = (
  tx: EthTransaction,
  reqAmt: bigint
): string | undefined => {

  abiDecoder.addABI(TOKEN_CONTRACT_ABI)
  let op: any;
  try {
    op = abiDecoder.decodeMethod(tx.input)
  } catch (e) {
    return "failed to decode eth tx"
  }

  const exp =  process.env.NEXT_PUBLIC_ETH_CONTRACT!.toLowerCase()
  if (tx.to.toLowerCase() != exp) {
    return `ETH contract ${tx.to} doesn't match expected`
  }

  if (op.name != "transfer"
    || op.params[0].name != "to"
    || op.params[1].name != "amount"
    || BigInt(op.params[1].value) != reqAmt
  ) {
    console.log(`invalid op ${JSON.stringify(op)}`)
    return "invalid transaction operation"
  }

  //TODO cannot get `approve` then `transferFrom` working via wrapped contract
  /*if (op.name != "burn" || op.params[0].name != "_amount" || BigInt(op.params[0].value) != amt) {
    console.log(`invalid op ${JSON.stringify(op)}`)
    return "invalid transaction operation"
  }*/
}