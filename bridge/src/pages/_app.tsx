import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter
} from "@solana/wallet-adapter-wallets";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import {useMemo} from "react";
import {clusterApiUrl} from "@solana/web3.js";

require('@solana/wallet-adapter-react-ui/styles.css');
export default function App({ Component, pageProps }: AppProps) {

  const network =  'localnet' //WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() =>  network === "localnet" ? 'http://localhost:8899' : clusterApiUrl(network), [network]);

  const wallets = useMemo(() => [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
    new TorusWalletAdapter()
  ], [network]);

  return <ConnectionProvider endpoint={endpoint}>
    <WalletProvider wallets={wallets} autoConnect>
  <WalletModalProvider>
    <Component {...pageProps} />
</WalletModalProvider>
</WalletProvider>
</ConnectionProvider>
}
