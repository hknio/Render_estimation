import { AnchorProvider, Idl, Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID } from "./constants";
import { renderCreditsResolvers } from "./resolvers";
import {RenderCredits} from "@render-foundation/idls/lib/types/render_credits";


export * from "./constants";
export * from "./pdas";

export async function init(
  provider: AnchorProvider,
  programId: PublicKey = PROGRAM_ID,
  idl?: Idl | null
): Promise<Program<RenderCredits>> {
  if (!idl) {
    idl = await Program.fetchIdl(programId, provider);
  }

  const renderCredits = new Program<RenderCredits>(
    idl as RenderCredits,
    programId,
    provider,
    undefined,
    () => renderCreditsResolvers
  ) as Program<RenderCredits>;

  return renderCredits;
}
