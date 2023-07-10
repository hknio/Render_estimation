const { ethers } = require('hardhat');

async function main() {
    const Contract = await ethers.getContractFactory("MilkToken");

    const contract = await Contract.attach(
       process.env.CONTRACT_ADDR
    );

    await contract.mint(
        process.env.MY_ADDR,
        ethers.utils.parseEther("100.0")
    );

    console.log(`successfully minted `)
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
  });
