import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID } from "./constants";

export function renderCreditsKey(rcMint: PublicKey, programId = PROGRAM_ID): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("rc", "utf-8"), rcMint.toBuffer()],
    programId
  );
}
