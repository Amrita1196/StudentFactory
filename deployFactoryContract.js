const { Client, AccountId, PrivateKey, ContractCreateFlow } = require("@hashgraph/sdk");
require("dotenv").config();
const fs = require("fs");

// Configure accounts and keys (testnet credentials)
const operatorId = AccountId.fromString(process.env.MYACCOUNT_ID);
const operatorPrivateKey = PrivateKey.fromString(process.env.MYACCOUNT_PVKEY);

if (operatorId == null || operatorPrivateKey == null) {
    throw new Error("Environment variables MY_ACCOUNT_ID and MY_PRIVATE_KEY are required.");
}

const client = Client.forTestnet().setOperator(operatorId, operatorPrivateKey);

async function deployFactoryContract() {
    // Deploy the Factory Contract
    console.info("========== Deploying Factory Contract ===========");

    const factoryContractByteCode = fs.readFileSync("FactoryContract_sol_FactoryContact.bin", "utf8");

    const factoryContractInstantiateTx = new ContractCreateFlow()
        .setBytecode(factoryContractByteCode)
        .setGas(100000);

    const factoryContractInstantiateSubmit = await factoryContractInstantiateTx.execute(client);
    const factoryContractInstantiateReceipt = await factoryContractInstantiateSubmit.getReceipt(client);
    const factoryContractId = factoryContractInstantiateReceipt.contractId;
    const factoryContractAddress = factoryContractId.toSolidityAddress();

    const factoryContractInstantiateRecord = await factoryContractInstantiateSubmit.getRecord(client);

    console.log("TransactionId:", factoryContractInstantiateRecord.transactionId.toString());
    console.log(`- The Factory Contract ID is: ${factoryContractId}`);
    console.log(`- The Factory Contract address in Solidity format is: ${factoryContractAddress}`);
    console.log("================================================");
    
    process.exit();
}

deployFactoryContract();
