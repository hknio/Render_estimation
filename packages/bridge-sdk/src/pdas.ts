import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID } from "./constants";

export function bridgeKey(
  mint: PublicKey,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("bridge", "utf-8"),
      mint.toBuffer()
    ],
    programId
  );
}

export function transferKey(
  ethTx: PublicKey,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("bridge_transfer", "utf-8"),
      ethTx.toBuffer()
    ],
    programId
  );
}
