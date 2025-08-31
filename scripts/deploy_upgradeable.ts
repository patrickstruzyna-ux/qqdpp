import { ethers, upgrades, network } from "hardhat";
import { verify } from "./verify";

async function main() {
  const LockUpgradeable = await ethers.getContractFactory("LockUpgradeable");
  
  const unlockTime = Math.floor(Date.now() / 1000) + 60; // 1 minute from now
  
  console.log("Deploying LockUpgradeable...");
  const lock = await upgrades.deployProxy(LockUpgradeable, [unlockTime], {
    initializer: 'initialize',
    kind: 'uups',
  });
  await lock.deployed();

  const implementationAddress = await upgrades.erc1967.getImplementationAddress(lock.address);
  const adminAddress = await upgrades.erc1967.getAdminAddress(lock.address);

  console.log("Proxy deployed to:", lock.address);
  console.log("Implementation deployed to:", implementationAddress);
  console.log("Admin deployed to:", adminAddress);

  // Warte auf Block-Bestätigungen für die Verifikation
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("Waiting for block confirmations...");
    await lock.deployTransaction.wait(6);
    
    // Verifiziere Implementation
    await verify(implementationAddress, []);
    console.log("Implementation contract verified");
  }

  // Speichere die Adressen in einer Deployment-Datei
  const fs = require("fs");
  const deployments = {
    network: network.name,
    proxy: lock.address,
    implementation: implementationAddress,
    admin: adminAddress,
    timestamp: new Date().toISOString()
  };

  fs.writeFileSync(
    `deployments/${network.name}.json`,
    JSON.stringify(deployments, null, 2)
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
