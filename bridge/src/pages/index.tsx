import {useState, useEffect, ReactDOM} from 'react'
import detectEthereumProvider from "@metamask/detect-provider";
import dynamic from "next/dynamic";
import {useWallet} from "@solana/wallet-adapter-react";
import Web3 from "web3";
import * as anchor from "@coral-xyz/anchor"
import {TOKEN_CONTRACT_ABI, BURN_CONTRACT_ABI, SignatureComponents, SOLANA_URL} from "@/utils";
import {Connection, PublicKey, Transaction, VersionedMessage, VersionedTransaction} from "@solana/web3.js";
import Contract from "web3-eth-contract";
import * as Confirm from "../../public/confirm-icon.svg"
import {CircleLoader} from "react-spinners";
import Modal from 'react-modal';

declare global {
  interface Window {
    ethereum: any;
  }
}

const WalletMultiButtonDynamic = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

const WalletConnectButtonDynamic = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletConnectButton,
  { ssr: false }
);


interface EthTx {
  txId?: string
  numConfirmations: number
}

interface Error {
  msg: string
}

type Step = 'burningEthRndr' | 'verifyingMintIntent' | 'packagingSolTx' | 'transferringRndr'

const stepOrder: Record<Step, number> = {
  ['burningEthRndr']: 0,
  ['verifyingMintIntent']: 1,
  ['packagingSolTx']: 2,
  ['transferringRndr']: 3,
}

export default function Home() {

  const [hasProvider, setHasProvider] = useState<boolean | null>(null)
  const [ethWallet, setWallet] = useState({ accounts: [] })

  const [erc20Contract, setERC20Contract] = useState<Contract | undefined>(undefined)
  const [erc20Balance, setERC20Balance] = useState<number>(0)
  const [erc20ToBurn, setERC20ToBurn] = useState<string>('')
  const [erc20Decimals, setERC20Decimals] = useState(0)
  const [erc20Symbol, setERC20Symbol] = useState('')

  const [burnContract, setBurnContract] = useState<Contract | undefined>(undefined);

  const [inputErr, setInputErr] = useState<string>("")
  const [modalOpen, setModalOpen] = useState<boolean>();

  const [ethTx, setEthTx] = useState<EthTx | undefined>(undefined);
  const [error, setError] = useState<Error | undefined>(undefined);

  const [submittedSolTx, setSubmittedSolTx] = useState("");

  const [currentStep, setCurrentStep] = useState<Step | undefined>(undefined);

  const {
    select,
    wallets,
    wallet,
    publicKey,
    disconnect,
    connected,
    signMessage,
    signTransaction
  } = useWallet()


  useEffect(() => {
    const getProvider = async () => {
      const provider = await detectEthereumProvider({ silent: true })
      console.log(provider)
      setHasProvider(Boolean(provider)) // transform provider to true or false
    }

    getProvider()
  }, [])

  const getBalance = async (
    contract: Contract,
    addr: string,
    decimals: number
  ) => {
    return (await contract.methods.balanceOf(addr).call()) / Math.pow(10, decimals)
  }

  useEffect(() => {
    const run = async () => {
      const me = ethWallet.accounts[0]
      console.log(`me: ${me}`)

      const web3 = new Web3(window.ethereum);

      // RNDR: 0x6De037ef9aD2725EB40118Bb1702EBb27e4Aeb24
      const cont = new web3.eth.Contract(TOKEN_CONTRACT_ABI, process.env.NEXT_PUBLIC_ETH_CONTRACT)
      setERC20Contract(cont)

      const decimals = await cont.methods.decimals().call();
      console.log(`decimals ${decimals}`)
      setERC20Decimals(decimals)

      const symbol = await cont.methods.symbol().call();
      console.log(`symbol ${symbol}`)
      setERC20Symbol(symbol)

      const balance = await getBalance(cont, me, decimals)

      setERC20Balance(balance)
      setERC20ToBurn(balance.toString())
      console.log(`balance ${balance}`)

      //const burnCont = new web3.eth.Contract(TOKEN_CONTRACT_ABI, process.env.NEXT_PUBLIC_BURN_CONTRACT!)
      //setBurnContract(burnCont)
    }
    if (ethWallet.accounts.length > 0  && ethWallet.accounts[0] != undefined) {
      run()
    }
  }, [ethWallet.accounts ])

  const updateWallet = async (accounts: any) => {
    setWallet({ accounts })
  }

  const handleConnect = async () => {
    let accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    })
    updateWallet(accounts)
  }

  const burnRndr = async (
    me: string
  ): Promise<any | undefined> => {
    const burn = BigInt(erc20ToBurn)
    const burnAdj = burn * BigInt(Math.pow(10, erc20Decimals))
    console.log(`me: ${me} burn ${burn}`)

    // TODO(alex) couldn't get approve and transferFrom to work from wrapped contract. see:
    //
    // `transfer` to `0xdead` from the original token contract is one step and simpler
    /* const approveTx = await erc20Contract!.methods.approve(process.env.NEXT_PUBLIC_BURN_CONTRACT!, burnAdj).send({from: me})
    console.log(`approve tx ${JSON.stringify(approveTx)}`)
    const burnTx = await burnContract!.methods.burn(burnAdj).send({from: me}) */

    setEthTx({numConfirmations: 0})
    try {
      const burnTx = await erc20Contract!.methods
        .transfer('0x000000000000000000000000000000000000dead', burnAdj)
        .send({from: me})
        .on('transactionHash', function(txHash) {
          console.log(`eth tx hash: ${txHash}`);
          setEthTx((tx) => ({...tx, txId: txHash}))
        })
        .on('confirmation', function(confirmationNumber, receipt) {
          console.log(`confirmation # ${confirmationNumber}, ${typeof confirmationNumber}, ${receipt}`);
          setEthTx((tx) => ({
            ...tx,
            numConfirmations: confirmationNumber
          }))
        })
        .on('receipt', function(receipt) {
          console.log(`receipt ${receipt}`);
        })
        .on('error', function(error, receipt) {
          console.log(error, receipt);
          setError({msg: `burn failed: ${error}`})
        })
      return burnTx
    } catch (e) {
      setError({msg: `send burn tx failed: ${JSON.stringify(e)}`})
      return
    }
  }

  const packageSolTx = async (
    body: string
  ): Promise<{
    res?: any
    error?: string
  }> => {
    return fetch(`/api/transfer`, { method: 'POST', body })
      .then(
        async (res) => {
          if (res.ok) {
            return {res: await res.json()}
          }
          return {
            error: `server failed to packaged sol tx: ${(await res.json()).error}`
          }
        },
        (error) => ({error: error.toString()}),
      )
      .catch((err) => ({error: JSON.stringify(err)}));
  }

  const sendSolTx = async (serializedTx: string): Promise<{resTx?: string, error?: any}> => {
    const conn = new Connection(SOLANA_URL)
    console.log(`sending tx to ${wallet?.adapter.url}`)
    const rawTx = anchor.utils.bytes.hex.decode(serializedTx)
    const tx = Transaction.from(rawTx)

    // new PublicKey(process.env.NEXT_PUBLIC_BRIDGE_PROGRAM_KEY)
    conn.onLogs(
      "all",
      (l, ctx) => {
        if (l.err) {
          console.log(l.err)
        }
      })

    return wallet?.adapter
      .sendTransaction!(tx, conn)
      .then(
        (res) => ({resTx: res}),
      ).catch((err) => ({error: err}))

  }

  const submitTransfer = async () => {
    setError(undefined)
    setSubmittedSolTx("")
    setModalOpen(true)

    const me = ethWallet.accounts[0]

    setCurrentStep('burningEthRndr')
    const burnTx = await burnRndr(me)
    if (!burnTx) {
      return
    }

    console.log(`burn tx ${JSON.stringify(burnTx)}`)
    const balance = await getBalance(erc20Contract!, me, erc20Decimals)
    console.log(`new balance ${balance}`)
    setERC20Balance(balance)

    setCurrentStep('verifyingMintIntent')
    const sigComponents: SignatureComponents = {
      ethTx: burnTx.transactionHash,
      burnedAmount: Number(erc20ToBurn),
      solanaAddr: publicKey!.toString(),
    };
    const msg = anchor.utils.bytes.utf8.encode(
      JSON.stringify(sigComponents),
    );
    const signature = await signMessage!(msg)
    const sigStr = anchor.utils.bytes.hex.encode(
      Buffer.from(signature)
    );
    const body = JSON.stringify({
      ...sigComponents,
      signature: sigStr
    });

    setCurrentStep('packagingSolTx')
    const {res, error: packagingErr} = await packageSolTx(body)
    if (packagingErr) {
      console.log(`packaging err ${packagingErr}`)
      setError({msg: packagingErr})
    }

    setCurrentStep('transferringRndr')
    const {resTx, error} = await sendSolTx(res.tx)
    if (error) {
      console.log()
      setError({msg: JSON.stringify(error)})
    }
    if (resTx) {
      console.log(`success sent sol tx: ${resTx}`)
      setSubmittedSolTx(resTx)
    }
    //setCurrentStep(undefined)
  }

  //Modal.setAppElement('.App');

  const GreenCheck = () =>
    <img style={{marginLeft: '4px', width: '20px', height: '20px'}} src="./green-check.svg"/>

  const RedX = () =>
    <img style={{marginLeft: '4px', width: '20px', height: '20px'}} src="./red-x.svg"/>

  const RenderStep = (stepName: Step) => {
    const render = (() => {
      switch (stepName) {
        case 'burningEthRndr':
          return <p className={"text-sm"}>
            {!ethTx.txId ? 'burning your ETH RNDR...' : `ETH burn tx ${ethTx.txId} confirmations: ${ethTx.numConfirmations}...`}
          </p>
        case 'verifyingMintIntent':
          return <p className={"text-sm"}>
            verifying your intent to receive RNDR on Solana...
          </p>
        case 'packagingSolTx':
          return <p className={"text-sm"}>
            packaging Solana transaction...
          </p>
        case 'transferringRndr':
          return <p className={"text-sm"}>
            your Solana RNDR is on the way...
          </p>
      }});
    return <>
    <div className={"flex flex-row"}>
        {!!currentStep && stepOrder[currentStep] >= stepOrder[stepName] &&
          render() }
        {!!currentStep && stepOrder[currentStep] > stepOrder[stepName] &&
            <GreenCheck/>}
        {!!error && stepOrder[currentStep] == stepOrder[stepName] && <RedX/>}
      </div>
    {!!error && stepOrder[currentStep] == stepOrder[stepName] &&
      <p className={"text-sm text-red-500"}>{error.msg}</p>}
    </>
  }


  return (
    <div className={"pt-10"}>
      <div className="flex flex-row">
        <div className="w-1/3 flex flex-col items-center">
          <p className={"text-2xl"}>Ethereum</p>
          <small className={"w-12/12"}>Metamask Installed: { hasProvider ? 'yes' : 'no'}</small>
          { hasProvider &&
              <button
                  type="button"
                  onClick={handleConnect}
                  className="wallet-adapter-button wallet-adapter-button-trigger"
              >
                { ethWallet.accounts.length == 0 ?
                  'Connect Metamask' :
                  <>
                    <i className={"wallet-adapter-button-start-icon"}>
                      <img src={"https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg"}/>
                    </i>{ethWallet.accounts[0].slice(0, 8)}...
                  </> }
              </button> }
        </div>
        <div className="w-1/3 flex flex-col items-center">
          <p className={"text-2xl"}>Render Token Bridge</p>
          <br/>
          <p className={"text-sm"}>connect your Metamask and Solana wallets and select how much Ethereum RNDR you'd like to transfer over</p>
          <br/>

          <div className={"flex flex-col items-center"}>
            { ethWallet.accounts.length > 0 &&
                <div>
                    <label htmlFor="price" className="block text-sm font-medium leading-6 text-gray-900">
                        To transfer
                    </label>
                    <div className="relative mt-2 rounded-md shadow-sm">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <span className="text-gray-500 sm:text-sm">#</span>
                        </div>
                        <input
                            onChange={e => {
                              const n = Number(e.target.value)
                              if (n > erc20Balance) {
                                setInputErr(`${n} > ${erc20Balance} available balance`)
                              } else {
                                setInputErr('')
                              }
                              setERC20ToBurn(e.target.value)
                            }}
                            type="text"
                            name="price"
                            id="price"
                            value={erc20ToBurn}
                            className="block w-full rounded-md border-0 py-1.5 pl-7 pr-12 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                            placeholder={`${erc20Balance}.00`}
                            aria-describedby="price-currency"
                        />
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                  <span className="text-gray-500 sm:text-sm" id="price-currency">
                    ETH RNDR
                  </span>
                        </div>
                    </div>
                    <p className={"text-sm"} style={{ color: "red" }}>{inputErr}</p>
                </div>
            }
          </div>
          { connected &&
            Number(erc20ToBurn) > 0 &&
            Number(erc20ToBurn) <= erc20Balance &&
              <button
                  type="button"
                  className="flex flex-row rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                  onClick={submitTransfer}
              >
                {!!currentStep && submittedSolTx === "" && !error && <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                            stroke-width="4"></circle>
                    <path className="opacity-75" fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg> }
                  Transfer</button>
          }
          <br/>

          {Object.keys(stepOrder).map((s: Step) => RenderStep(s))}

          { submittedSolTx !== '' &&
              <>
                  <br/>
                  <p className={"text-sm"}>successfully transferred {erc20ToBurn} {erc20Symbol}! solana tx: {submittedSolTx} </p>
              </>
          }
        </div>

        <div className="w-1/3 flex flex-col items-center">
          <p className={"text-2xl"}>Solana</p>
          <WalletMultiButtonDynamic/>
        </div>
      </div>
    </div>
  )
}

{/*<div className="App">
            <Modal
              isOpen={modalOpen}
              style={{
                content: {
                  top: '50%',
                  left: '50%',
                  right: 'auto',
                  bottom: 'auto',
                  marginRight: '-50%',
                  transform: 'translate(-50%, -50%)',
                  width: '60%',
                  height: '60%'
                },
              }}
              contentLabel="model"
            >
              <div>

                <button onClick={() => setModalOpen(false)}>close</button>
<CircleLoader
  color={'black'}
  loading={!!step}
  cssOverride={{
    display: "block",
    margin: "40px auto 0px auto",
    borderColor: "red",
  }}
  size={300}
  aria-label={"loader"}
  data-testid="loader"
/>
</div>
</Modal>
</div>
 */}
{/*style={{wordBreak: 'break-all', ...blackProps.style}} */}