import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID } from "./constants";
import { sha256 } from "js-sha256";
import * as anchor from "@coral-xyz/anchor";

export function emissionScheduleKey(
  authority: PublicKey,
  programId = PROGRAM_ID,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      anchor.utils.bytes.utf8.encode("emission_schedule"),
      authority.toBuffer(),
    ],
    programId
  );
}
