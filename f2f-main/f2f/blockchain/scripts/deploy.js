const hre = require("hardhat");

function getAddress(name, fallback) {
  const value = process.env[name] || fallback;

  if (!hre.ethers.isAddress(value)) {
    throw new Error(`Invalid ${name} address: ${value}`);
  }

  return value;
}

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  if (!deployer) {
    throw new Error("No deployer signer available");
  }

  const admin = getAddress("HASH_ANCHOR_ADMIN", deployer.address);
  const initialAnchorer = getAddress("HASH_ANCHOR_INITIAL_ANCHORER", deployer.address);

  console.log("Deploying HashAnchor with account:", deployer.address);
  console.log("Admin:", admin);
  console.log("Initial anchorer:", initialAnchorer);

  const HashAnchor = await hre.ethers.getContractFactory("HashAnchor");
  const hashAnchor = await HashAnchor.deploy(admin, initialAnchorer);

  await hashAnchor.waitForDeployment();

  const address = await hashAnchor.getAddress();
  const network = await hre.ethers.provider.getNetwork();

  console.log("HashAnchor deployed to:", address);
  console.log("Chain ID:", network.chainId.toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
