/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import { Signer, utils, Contract, ContractFactory, Overrides } from "ethers";
import type { Provider, TransactionRequest } from "@ethersproject/providers";
import type { PromiseOrValue } from "../../common";
import type {
  BurnMilkToken,
  BurnMilkTokenInterface,
} from "../../contracts/BurnMilkToken";

const _abi = [
  {
    inputs: [],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint8",
        name: "version",
        type: "uint8",
      },
    ],
    name: "Initialized",
    type: "event",
  },
  {
    inputs: [],
    name: "BURN_ADDRESS",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_amount",
        type: "uint256",
      },
    ],
    name: "burn",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_token",
        type: "address",
      },
    ],
    name: "initialize",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

const _bytecode =
  "0x608060405234801561001057600080fd5b5061002b67f49172581e62eca760c01b61007260201b60201c565b61004567f7be7519451f3b1560c01b61007260201b60201c565b61005f67d94958c9e87a5f6c60c01b61007260201b60201c565b61006d61007560201b60201c565b61020f565b50565b600060019054906101000a900460ff16156100c5576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016100bc906101b8565b60405180910390fd5b60ff801660008054906101000a900460ff1660ff16146101335760ff6000806101000a81548160ff021916908360ff1602179055507f7f26b83ff96e1f2b6a682f133852f6798a09c465da95921460cefb384740249860ff60405161012a91906101f4565b60405180910390a15b565b600082825260208201905092915050565b7f496e697469616c697a61626c653a20636f6e747261637420697320696e69746960008201527f616c697a696e6700000000000000000000000000000000000000000000000000602082015250565b60006101a2602783610135565b91506101ad82610146565b604082019050919050565b600060208201905081810360008301526101d181610195565b9050919050565b600060ff82169050919050565b6101ee816101d8565b82525050565b600060208201905061020960008301846101e5565b92915050565b61074e8061021e6000396000f3fe608060405234801561001057600080fd5b50600436106100415760003560e01c806342966c6814610046578063c4d66de814610062578063fccc28131461007e575b600080fd5b610060600480360381019061005b9190610418565b61009c565b005b61007c600480360381019061007791906104a3565b6101ea565b005b6100866103b1565b60405161009391906104df565b60405180910390f35b6100b06738bad1ae4f765cdc60c01b6103b7565b6100c467304368edc3052ea560c01b6103b7565b80600160003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008282546101139190610529565b9250508190555061012e67f4bf85cbebdda8d760c01b6103b7565b610142672542ade8bf8a2f4960c01b6103b7565b600060029054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166323b872dd3361dead846040518463ffffffff1660e01b81526004016101a39392919061056c565b6020604051808303816000875af11580156101c2573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906101e691906105db565b5050565b6101fe6775d2b89bca25a19760c01b6103b7565b60008060019054906101000a900460ff1615905080801561022f5750600160008054906101000a900460ff1660ff16105b8061025c575061023e306103ba565b15801561025b5750600160008054906101000a900460ff1660ff16145b5b61029b576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016102929061068b565b60405180910390fd5b60016000806101000a81548160ff021916908360ff16021790555080156102d8576001600060016101000a81548160ff0219169083151502179055505b6102ec67889b9f124e31c7b060c01b6103b7565b61030067a0937219b684381b60c01b6103b7565b610313667fbcc748d7d0e960c01b6103b7565b81600060026101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555080156103ad5760008060016101000a81548160ff0219169083151502179055507f7f26b83ff96e1f2b6a682f133852f6798a09c465da95921460cefb384740249860016040516103a491906106fd565b60405180910390a15b5050565b61dead81565b50565b6000808273ffffffffffffffffffffffffffffffffffffffff163b119050919050565b600080fd5b6000819050919050565b6103f5816103e2565b811461040057600080fd5b50565b600081359050610412816103ec565b92915050565b60006020828403121561042e5761042d6103dd565b5b600061043c84828501610403565b91505092915050565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b600061047082610445565b9050919050565b61048081610465565b811461048b57600080fd5b50565b60008135905061049d81610477565b92915050565b6000602082840312156104b9576104b86103dd565b5b60006104c78482850161048e565b91505092915050565b6104d981610465565b82525050565b60006020820190506104f460008301846104d0565b92915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b6000610534826103e2565b915061053f836103e2565b9250828201905080821115610557576105566104fa565b5b92915050565b610566816103e2565b82525050565b600060608201905061058160008301866104d0565b61058e60208301856104d0565b61059b604083018461055d565b949350505050565b60008115159050919050565b6105b8816105a3565b81146105c357600080fd5b50565b6000815190506105d5816105af565b92915050565b6000602082840312156105f1576105f06103dd565b5b60006105ff848285016105c6565b91505092915050565b600082825260208201905092915050565b7f496e697469616c697a61626c653a20636f6e747261637420697320616c72656160008201527f647920696e697469616c697a6564000000000000000000000000000000000000602082015250565b6000610675602e83610608565b915061068082610619565b604082019050919050565b600060208201905081810360008301526106a481610668565b9050919050565b6000819050919050565b600060ff82169050919050565b6000819050919050565b60006106e76106e26106dd846106ab565b6106c2565b6106b5565b9050919050565b6106f7816106cc565b82525050565b600060208201905061071260008301846106ee565b9291505056fea2646970667358221220f50adf70f1349015b91739aeaeec03bbe1838c8f13c55051e6d9ff0ff447209b64736f6c63430008120033";

type BurnMilkTokenConstructorParams =
  | [signer?: Signer]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: BurnMilkTokenConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => xs.length > 1;

export class BurnMilkToken__factory extends ContractFactory {
  constructor(...args: BurnMilkTokenConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
  }

  override deploy(
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<BurnMilkToken> {
    return super.deploy(overrides || {}) as Promise<BurnMilkToken>;
  }
  override getDeployTransaction(
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(overrides || {});
  }
  override attach(address: string): BurnMilkToken {
    return super.attach(address) as BurnMilkToken;
  }
  override connect(signer: Signer): BurnMilkToken__factory {
    return super.connect(signer) as BurnMilkToken__factory;
  }

  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): BurnMilkTokenInterface {
    return new utils.Interface(_abi) as BurnMilkTokenInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): BurnMilkToken {
    return new Contract(address, _abi, signerOrProvider) as BurnMilkToken;
  }
}
