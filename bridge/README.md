
# Token Bridge

## Development

### Ethereum

the first thing you'll need to do is run a hardhat node in `../hardhat`
```
npx hardhat node
```
then deploy the sample ERC20 contract `MilkToken.sol` 
```
npx hardhat run --network localhost scripts/deploy.ts
```
record the token address it spits out. thats your `NEXT_PUBLIC_ETH_CONTRACT`
you'll need to put that in a `hardhat/.env` along with your own ETH address
you'll be bridging tokens from in the UI:
```
MY_ADDR=<your-ETH-addr>
CONTRACT_ADDR=<contract-addr>
```

now mint 100 tokens to your address
```
npx hardhat run --network localhost scripts/mint.ts
```

### Solana

in the tld of this monorepo, start a validator
`yarn amman start`

in a seperate session init your idls
`./script/init-idls.sh`

now cd into `packages/rndr-admin-cli` and generate
your keypairs `./reset-keypairs.sh`

and then run this script to init all of the spl-tokens and Solana PDAs
you'll need
```
npx ts-node src/deploy.ts -b AaGotZQanCRnQj1ahytxkDCnQMGAbsvn73uv6AzwYc93 --mintBridge true
```

`AaGotZQanCRnQj1ahytxkDCnQMGAbsvn73uv6AzwYc93` is the address of my own shadow net drive
where the NFT metadata and token icons are already uploaded

find the RNDR mint address in the output

### Bridge

in a .env in this dir you'll need
```
ETH_URL='http://127.0.0.1:8545' // your local hardhat node
BRIDGE_PRIV_KEY='177,64,..' // the priv key of the harded bridge signer that invokes the mint SOL side. ask Alex for key
BRIDGE_PROGRAM_KEY='brdgwnNUvW8rGAVzRrpiQiRv8dGBVvrJW79UB61sa16'
NEXT_PUBLIC_CLUSTER='localnet'
RNDR_MINT_KEY=<RNDR-mint-address>
NEXT_PUBLIC_ETH_CONTRACT=<deployed-ERC20-contract-addr-from-above>
```

```
yarn dev
```
to start the server

make sure both Metamask and Solflare/Phantom wallets are pointed to localhost, you have 
some SOL and ETH for TX costs (use one of the pre-populated-by-hardhat ETH wallets), and you've
imported the sample MILK token contract into Metamask
