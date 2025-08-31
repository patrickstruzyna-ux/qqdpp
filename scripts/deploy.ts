import { ethers } from "hardhat";

async function main() {
  // Deploy Contract
  const MessengerContract = await ethers.getContractFactory("MessengerContract");
  const messenger = await MessengerContract.deploy();
  await messenger.deployed();

  console.log("MessengerContract deployed to:", messenger.address);

  // Verify contract if not on localhost
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("Waiting for block confirmations...");
    await messenger.deployTransaction.wait(6);
    
    await verify(messenger.address, []);
  }
}

async function verify(contractAddress: string, args: any[]) {
  console.log("Verifying contract...");
  try {
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: args,
    });
  } catch (e) {
    if ((e as Error).message.toLowerCase().includes("already verified")) {
      console.log("Already verified!");
    } else {
      console.log(e);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
