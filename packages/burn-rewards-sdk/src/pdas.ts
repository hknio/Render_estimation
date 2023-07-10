import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID } from "./constants";
import { sha256 } from "js-sha256";
import * as anchor from "@coral-xyz/anchor";

export function burnRewardsKey(
  owner: PublicKey,
  programId = PROGRAM_ID,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      anchor.utils.bytes.utf8.encode("burn_rewards"),
      owner.toBuffer(),
    ],
    programId
  );
}

export const CLOCKWORK_PID = new PublicKey("CLoCKyJ6DXBJqqu2VWx9RLbgnwwR6BMHHuyasVmfMzBh");

export function threadKey(
  authority: PublicKey,
  threadId: string = "receive_rewards",
  programId: PublicKey = CLOCKWORK_PID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("thread", "utf8"),
      authority.toBuffer(),
      Buffer.from(threadId, "utf8"),
    ],
    programId
  )
}