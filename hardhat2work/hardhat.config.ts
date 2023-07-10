import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import '@openzeppelin/hardhat-upgrades';
//import "hardhat/console.sol";
require('dotenv').config()

const SEPOLIA_API_KEY = process.env.SEPOLIA_API_KEY
//const GOERLI_API_KEY = process.env.GOERLI_API_KEY
//
const priv_key = process.env.ETH_PRIV_KEY
//
const sepoliaUrl = `https://eth-sepolia.g.alchemy.com/v2/${SEPOLIA_API_KEY}`
//const goerliUrl = `https://eth-goerli.g.alchemy.com/v2/${GOERLI_API_KEY}`

const config: HardhatUserConfig = {
  solidity: "0.8.18",
  networks: {
    // sepolia: {
    //   url: sepoliaUrl,
    //   accounts: [priv_key!]
    // },
    /*goerli: {
      url: goerliUrl,
      accounts: [priv_key!]
    },*/
    localhost: {
      url: 'http://127.0.0.1:7545',
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : []

    }
  }
};

export default config;
