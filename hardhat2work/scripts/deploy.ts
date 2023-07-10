const { ethers, upgrades } = require('hardhat');
require("dotenv").config();

async function main() {
    const [deployer] = await ethers.getSigners();
  
    console.log("Deploying contracts with the account:", deployer.address);
  
    const weiAmount = (await deployer.getBalance()).toString();
    
    console.log("Account balance:", (await ethers.utils.formatEther(weiAmount)));

    const gas = await ethers.provider.getGasPrice()
  
    const Token = await ethers.getContractFactory("MilkToken");
    //const Burn = await ethers.getContractFactory("BurnMilkToken");

    // upgrade contract
    /* console.log("Upgrading contract...");
     await upgrades.upgradeProxy(
      process.env.CONTRACT_ADDR,
      Token
    );
    console.log("Upgraded successfully"); */
    
    // initial deploy
    const token = await upgrades.deployProxy(Token, [], {
      initializer: "initialize",
      kind: "transparent",
    });
    await token.deployed();
    console.log("Token address:", token.address);

    //const burn = await upgrades.deployProxy(Burn, [token.address], {
    //  initializer: "initialize",
    //  kind: "transparent",
    //  //constructorArgs: [token.address]
    //});
    //await burn.deployed();
    //console.log("Burn address:", burn.address);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
  });
