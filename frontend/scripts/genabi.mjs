import * as fs from "fs";
import * as path from "path";

const CONTRACT_NAME = "AskAnon";

// backend root relative to this frontend folder
const rel = "../backend";
const outdir = path.resolve("./abi");

if (!fs.existsSync(outdir)) {
  fs.mkdirSync(outdir);
}

const dir = path.resolve(rel);
const deploymentsDir = path.join(dir, "deployments");

function readDeployment(chainName, chainId, contractName, optional) {
  const chainDeploymentDir = path.join(deploymentsDir, chainName);
  if (!fs.existsSync(chainDeploymentDir)) {
    if (!optional) {
      console.error(`\n===================================================================\n` +
        `Unable to locate '${chainDeploymentDir}' directory.\n` +
        `1) Go to '${dir}'\n2) Run 'npx hardhat deploy --network ${chainName}'.\n` +
        `\n===================================================================\n`);
      process.exit(1);
    }
    return undefined;
  }
  const jsonString = fs.readFileSync(path.join(chainDeploymentDir, `${contractName}.json`), "utf-8");
  const obj = JSON.parse(jsonString);
  obj.chainId = chainId;
  return obj;
}

function readArtifact(contractName) {
  try {
    const artifactPath = path.join(dir, "artifacts", "contracts", `${contractName}.sol`, `${contractName}.json`);
    if (!fs.existsSync(artifactPath)) {
      return undefined;
    }
    const jsonString = fs.readFileSync(artifactPath, "utf-8");
    const obj = JSON.parse(jsonString);
    return { abi: obj.abi };
  } catch {
    return undefined;
  }
}

// Prefer Sepolia if available; otherwise fall back to localhost
let deploySepolia = readDeployment("sepolia", 11155111, CONTRACT_NAME, true);
let deployLocalhost = readDeployment("localhost", 31337, CONTRACT_NAME, true);

if (!deploySepolia && !deployLocalhost) {
  // Fallback to Hardhat artifacts to allow building without any network deployment
  const art = readArtifact(CONTRACT_NAME);
  const fallbackAbi = art ? art.abi : [];
  deploySepolia = { abi: fallbackAbi, address: "0x0000000000000000000000000000000000000000", chainId: 11155111, chainName: "sepolia" };
  deployLocalhost = { abi: fallbackAbi, address: "0x0000000000000000000000000000000000000000", chainId: 31337, chainName: "hardhat" };
}

const chosen = deploySepolia ?? deployLocalhost;

if (deploySepolia && deployLocalhost) {
  if (JSON.stringify(deployLocalhost.abi) !== JSON.stringify(deploySepolia.abi)) {
    console.error(`\n===================================================================\n` +
      `Deployments on localhost and Sepolia differ. Can't use the same abi on both networks.\n` +
      `Consider re-deploying the contracts on both networks.\n` +
      `\n===================================================================\n`);
    process.exit(1);
  }
}

const tsCode = `\n/*\n  This file is auto-generated.\n  Command: 'npm run genabi'\n*/\nexport const ${CONTRACT_NAME}ABI = ${JSON.stringify({ abi: chosen.abi }, null, 2)} as const;\n`;

const tsAddresses = `\n/*\n  This file is auto-generated.\n  Command: 'npm run genabi'\n*/\nexport const ${CONTRACT_NAME}Addresses = {\n  "11155111": { address: "${deploySepolia ? deploySepolia.address : "0x0000000000000000000000000000000000000000"}", chainId: 11155111, chainName: "sepolia" },\n  "31337": { address: "${deployLocalhost ? deployLocalhost.address : "0x0000000000000000000000000000000000000000"}", chainId: 31337, chainName: "hardhat" }\n};\n`;

fs.writeFileSync(path.join(outdir, `${CONTRACT_NAME}ABI.ts`), tsCode, "utf-8");
fs.writeFileSync(path.join(outdir, `${CONTRACT_NAME}Addresses.ts`), tsAddresses, "utf-8");
console.log(`Generated ${path.join(outdir, `${CONTRACT_NAME}ABI.ts`)}`);
console.log(`Generated ${path.join(outdir, `${CONTRACT_NAME}Addresses.ts`)}`);


