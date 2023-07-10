import { ataResolver, combineResolvers, resolveIndividual } from "@render-foundation/spl-utils";
import { circuitBreakerResolvers } from "@render-foundation/circuit-breaker-sdk";
import {PublicKey} from "@solana/web3.js";
import {AnchorProvider} from "@coral-xyz/anchor";

export const renderCreditsResolvers = combineResolvers(
  circuitBreakerResolvers,
  ataResolver({
    instruction: "mintRenderCreditsV0",
    account: "recipientTokenAccount",
    mint: "rcMint",
    owner: "recipient",
  }),
  ataResolver({
    instruction: "mintRenderCreditsV0",
    account: "burner",
    mint: "rndrMint",
    owner: "owner",
  }),
  resolveIndividual(async ({ path, accounts, provider, args }) => {
    if (path[path.length - 1] === "recipient" && !accounts.recipient && (provider as AnchorProvider).wallet) {
      return (provider as AnchorProvider).wallet.publicKey;
    }
  })
);
