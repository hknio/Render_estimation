import { Bridge } from "@render-foundation/idls/lib/types/bridge";
import { AnchorProvider, Idl, Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { PROGRAM_ID } from "./constants";

export * from "./constants";
export * from "./pdas";

export async function init(
  provider: AnchorProvider,
  programId: PublicKey = PROGRAM_ID,
  idl?: Idl | null
): Promise<Program<Bridge>> {
  if (!idl) {
    idl = await Program.fetchIdl(programId, provider);
  }

  const bridge = new Program<Bridge>(
    idl as Bridge,
    programId,
    provider,
    undefined,
  ) as Program<Bridge>;

  return bridge;
}
