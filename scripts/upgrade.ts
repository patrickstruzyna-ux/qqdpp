import { ethers, upgrades } from "hardhat";

async function main() {
  const proxyAddress = 'YOUR_PROXY_ADDRESS_HERE';
  
  const LockUpgradeableV2 = await ethers.getContractFactory("LockUpgradeableV2");
  console.log("Upgrading LockUpgradeable...");
  
  await upgrades.upgradeProxy(proxyAddress, LockUpgradeableV2);
  console.log("LockUpgradeable upgraded");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});