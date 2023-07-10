import { AnchorProvider, Idl, Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID } from "./constants";
import { burnRewardsResolvers } from "./resolvers";
import { BurnRewards } from "@render-foundation/idls/lib/types/burn_rewards";


export * from "./constants";
export * from "./pdas";

export async function init(
  provider: AnchorProvider,
  programId: PublicKey = PROGRAM_ID,
  idl?: Idl | null
): Promise<Program<BurnRewards>> {
  if (!idl) {
    idl = await Program.fetchIdl(programId, provider);
  }

  const burnRewards = new Program<BurnRewards>(
    idl as BurnRewards,
    programId,
    provider,
    undefined,
    () => burnRewardsResolvers
  ) as Program<BurnRewards>;

  return burnRewards;
}
