import { AnchorProvider, Idl, Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID } from "./constants";
import { emissionScheduleResolvers } from "./resolvers";
import {EmissionSchedule} from "@render-foundation/idls/lib/types/emission_schedule";


export * from "./constants";
export * from "./pdas";

export async function init(
  provider: AnchorProvider,
  programId: PublicKey = PROGRAM_ID,
  idl?: Idl | null
): Promise<Program<EmissionSchedule>> {
  if (!idl) {
    idl = await Program.fetchIdl(programId, provider);
  }

  const emissionSchedule = new Program<EmissionSchedule>(
    idl as EmissionSchedule,
    programId,
    provider,
    undefined,
    () => emissionScheduleResolvers
  ) as Program<EmissionSchedule>;

  return emissionSchedule;
}
