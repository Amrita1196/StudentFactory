const fs = require('fs');
const { ethers } = require('ethers');
const { expect } = require('chai');
const { describe, it } = require('mocha');
const {
	Client,
	AccountId,
	PrivateKey,
	Hbar,
	ContractCreateFlow,
	// eslint-disable-next-line no-unused-vars
	ContractFunctionParameters,
	ContractExecuteTransaction,
	// eslint-disable-next-line no-unused-vars
	TokenId,
	// eslint-disable-next-line no-unused-vars
	ContractId,
	AccountCreateTransaction,
	ContractCallQuery,
} = require('@hashgraph/sdk');
const { default: axios } = require('axios');
require('dotenv').config();

// Get operator from .env file
let operatorKey = PrivateKey.fromString(process.env.MYACCOUNT_PVKEY);
let operatorId = AccountId.fromString(process.env.MYACCOUNT_ID);
const contractName = 'FactoryContract';
const childContractName = 'StudentNestedContract';
const env = process.env.ENVIRONMENT ?? null;

const baseUrlForMainnet = 'https://mainnet-public.mirrornode.hedera.com';
const baseUrlForTestnet = 'https://testnet.mirrornode.hedera.com';
const baseUrlForLocal = 'http://localhost:5551';

const addressRegex = /(\d+\.\d+\.[1-9]\d+)/i;

// reused variable
let contractId;
let contractAddress;
let ifaceFactory, ifaceChild;
let client, baseUrl;
const deployedContracts = [];

describe('Deployment: ', function() {
	it('Should deploy the contract and setup conditions', async function() {
		if (operatorKey === undefined || operatorKey == null || operatorId === undefined || operatorId == null) {
			console.log('Environment required, please specify MYACCOUNT_PVKEY & MYACCOUNT_ID in the .env file');
			process.exit(1);
		}

		console.log('\n-Using ENIVRONMENT:', env);

		if (env.toUpperCase() == 'TEST') {
			client = Client.forTestnet();
			console.log('testing in *TESTNET*');
			baseUrl = baseUrlForTestnet;
		}
		else if (env.toUpperCase() == 'MAIN') {
			client = Client.forMainnet();
			console.log('testing in *MAINNET*');
			baseUrl = baseUrlForMainnet;
		}
		else if (env.toUpperCase() == 'LOCAL') {
			const node = { '127.0.0.1:50211': new AccountId(3) };
			client = Client.forNetwork(node).setMirrorNetwork('127.0.0.1:5600');
			console.log('testing in *LOCAL*');
			const rootId = AccountId.fromString('0.0.2');
			const rootKey = PrivateKey.fromString('302e020100300506032b65700422042091132178e72057a1d7528025956fe39b0b847f200ab59b2fdd367017f3087137');

			// create an operator account on the local node and use this for testing as operator
			client.setOperator(rootId, rootKey);
			operatorKey = PrivateKey.generateED25519();
			operatorId = await accountCreator(operatorKey, 1000);
			baseUrl = baseUrlForLocal;
		}
		else {
			console.log('ERROR: Must specify either MAIN or TEST as environment in .env file');
			return;
		}

		client.setOperator(operatorId, operatorKey);
		// deploy the contract
		console.log('\n-Using Operator:', operatorId.toString());

		const gasLimit = 1200000;

		const json = JSON.parse(fs.readFileSync(`./artifacts/contracts/${contractName}.sol/${contractName}.json`));

		// import ABI
		ifaceFactory = new ethers.utils.Interface(json.abi);

		const childJson = JSON.parse(fs.readFileSync(`./artifacts/contracts/${childContractName}.sol/${childContractName}.json`));
		ifaceChild = new ethers.utils.Interface(childJson.abi);

		const contractBytecode = json.bytecode;

		console.log('\n- Deploying contract...', contractName, '\n\tgas@', gasLimit);

		contractId = await contractDeployFcn(contractBytecode, gasLimit);
		contractAddress = contractId.toSolidityAddress();

		console.log(`Contract created with ID: ${contractId} / ${contractAddress}`);

		console.log('\n-Testing:', contractName);
		expect(contractId.toString().match(addressRegex).length == 2).to.be.true;
	});
});

describe('Testing Factory: ', function() {
	it('Operator creates two contracts', async function() {
		let result = await createContract();
		expect(result).to.be.equal('SUCCESS');
		// check the event was emitted
		await sleep(5000);
		await checkLastMirrorEvent();
		result = await createContract();

		expect(result).to.be.equal('SUCCESS');
		await sleep(5000);
		await checkLastMirrorEvent();
	});

	it('Operator retrieves deployed contracts', async function() {
		const deployedContractList = await getDeployedContracts();
		expect(deployedContractList.length).to.be.equal(2);
		for (let c = 0; c < deployedContractList.length; c++) {
			const contract = ContractId.fromSolidityAddress(deployedContractList[c]);
			const contractAsString = contract.toString();
			expect(contractAsString.match(addressRegex).length == 2).to.be.true;
			deployedContracts.push(contract);
		}
	});
});

describe('Testing deployed contracts: ', function() {
	it('Operator adds one student to first deployed contract via Factory', async function() {
		const result = await addStudentViaFactory(0, 1, 'A', 1000, 1, 'John', 100, 1);
		expect(result).to.be.equal('SUCCESS');
	});

	it('Operator adds three students to contract 2 directly', async function() {
		let result = await addStudentDirect(deployedContracts[1], 2, 'B', 2000, 2, 'Jane', 90, 1);
		expect(result).to.be.equal('SUCCESS');
		result = await addStudentDirect(deployedContracts[1], 3, 'C', 3000, 3, 'Jack', 80, 1);
		expect(result).to.be.equal('SUCCESS');
		result = await addStudentDirect(deployedContracts[1], 4, 'D', 4000, 4, 'Jill', 70, 1);
		expect(result).to.be.equal('SUCCESS');
	});

	it('Operator gets student 2 - loop (contract 2 direct)', async function() {
		const jack = await getStudentDirectLoop(deployedContracts[1], 3);
		expect(jack['name']).to.be.equal('Jack');
	});

	it('Operator gets student 3 - map (contract 2 direct)', async function() {
		const jill = await getStudentDirectMap(deployedContracts[1], 4);
		expect(jill['name']).to.be.equal('Jill');
	});

	it('Operator gets all students (directly)', async function() {
		const students = await getStudentsDirect(deployedContracts[1]);
		expect(students.length).to.be.equal(3);
		// console.log(students);
	});

	it('Operator gets all students (from Factory)', async function() {
		const students = await getStudentsViaFactory(1);
		expect(students.length).to.be.equal(3);
	});
});

async function addStudentDirect(directContractId, stRollNo, stClass, stFees, stId, stName, stMarks, stResult) {
	const [contractExecuteRx] = await contractExecuteFcn(directContractId, 500_000, 'addStudentDetails', [stRollNo, stClass, stFees, stId, stName, stMarks, stResult], true);
	return contractExecuteRx.status.toString();
}

async function addStudentViaFactory(contractOffset, stRollNo, stClass, stFees, stId, stName, stMarks, stResult) {
	const [contractExecuteRx] = await contractExecuteFcn(contractId, 500_000, 'addStudentToContract', [contractOffset, stRollNo, stClass, stFees, stId, stName, stMarks, stResult]);
	return contractExecuteRx.status.toString();
}

async function getStudentDirectLoop(directContractId, stId) {
	const resultsObj = await contractQueryFcn(directContractId, 100_000, 'getAllStudentsDetailsById', [stId], true);
	return resultsObj['studentInfo'];

}

async function getStudentDirectMap(directContractId, stId) {
	const resultsObj = await contractQueryFcn(directContractId, 100_000, 'getStudentsFromMap', [stId], true);
	return resultsObj['studentInfo'];
}

async function getStudentsViaFactory(contractOffset) {
	const resultsObj = await contractQueryFcn(contractId, 200_000, 'getStudents', [contractOffset]);
	return resultsObj['students'];
}

async function getStudentsDirect(directContractId) {
	const resultsObj = await contractQueryFcn(directContractId, 200_000, 'getAllStudentsDetails', [], true);
	return resultsObj['studentList'];
}

async function createContract() {
	const [contractExecuteRx] = await contractExecuteFcn(contractId, 500_000, 'createContract', []);
	return contractExecuteRx.status.toString();
}

async function getDeployedContracts() {
	const resultsObj = await contractQueryFcn(contractId, 500_000, 'getDeployedContracts', []);
	return resultsObj['contracts'];
}

/**
 * Helper function for calling view functions on a contract
 * @param {ContractId} cId the contract to call
 * @param {number | Long.Long} gasLim the max gas
 * @param {string} fcnName name of the function to call
 * @param {ContractFunctionParameters} params the function arguments
 * @param {boolean} child if true, use the child deployment
 * @param {string | number | Hbar | Long.Long | BigNumber} amountHbar max pmt
 * @returns {} decoded results
 */
async function contractQueryFcn(cId, gasLim, fcnName, params, child = false, amountHbar = 2) {
	const encodedCommand = child ? ifaceChild.encodeFunctionData(fcnName, params) : ifaceFactory.encodeFunctionData(fcnName, params);

	// convert to UINT8ARRAY after stripping the '0x'
	const contractCall = await new ContractCallQuery()
		.setContractId(cId)
		.setGas(gasLim)
		.setFunctionParameters(Buffer.from(encodedCommand.slice(2), 'hex'))
		.setMaxQueryPayment(new Hbar(amountHbar))
		.execute(client);

	return child ? ifaceChild.decodeFunctionResult(fcnName, contractCall.bytes) : ifaceFactory.decodeFunctionResult(fcnName, contractCall.bytes);
}

/**
 * Helper function to deploy the contract
 * @param {string} bytecode bytecode from compiled SOL file
 * @param {number} gasLim gas limit as a number
 * @returns {ContractId | null} the contract ID or null if failed
 */
async function contractDeployFcn(bytecode, gasLim) {
	const contractCreateTx = new ContractCreateFlow()
		.setBytecode(bytecode)
		.setGas(gasLim);
	const contractCreateSubmit = await contractCreateTx.execute(client);
	const contractCreateRx = await contractCreateSubmit.getReceipt(client);
	return contractCreateRx.contractId;
}

/**
 * Helper function to create new accounts
 * @param {PrivateKey} privateKey new accounts private key
 * @param {string | number} initialBalance initial balance in hbar
 * @returns {AccountId} the newly created Account ID object
 */
async function accountCreator(privateKey, initialBalance, maxTokenAssociations = 0) {
	const response = await new AccountCreateTransaction
		.setInitialBalance(new Hbar(initialBalance))
		.setMaxAutomaticTokenAssociations(maxTokenAssociations)
		.setKey(privateKey.publicKey)
		.execute(client);
	const receipt = await response.getReceipt(client);
	return receipt.accountId;
}

/**
 * Helper function for calling the contract methods
 * @param {ContractId} cId the contract to call
 * @param {number | Long.Long} gasLim the max gas
 * @param {string} fcnName name of the function to call
 * @param {ContractFunctionParameters} params the function arguments
 * @param {boolean} child if true, use the child deployment
 * @param {string | number | Hbar | Long.Long | BigNumber} amountHbar the amount of hbar to send in the methos call
 * @returns {[TransactionReceipt, any, TransactionRecord]} the transaction receipt and any decoded results
 */
async function contractExecuteFcn(cId, gasLim, fcnName, params, child = false, amountHbar = 0) {
	const encodedCommand = child ? ifaceChild.encodeFunctionData(fcnName, params) : ifaceFactory.encodeFunctionData(fcnName, params);
	// convert to UINT8ARRAY after stripping the '0x'
	const contractExecuteTx = await new ContractExecuteTransaction()
		.setContractId(cId)
		.setGas(gasLim)
		.setFunctionParameters(Buffer.from(encodedCommand.slice(2), 'hex'))
		.setPayableAmount(amountHbar)
		.execute(client);

	const contractExecuteRx = await contractExecuteTx.getReceipt(client);
	// get the results of the function call;
	const record = await contractExecuteTx.getRecord(client);

	let contractResults;
	try {
		contractResults = child ? ifaceChild.decodeFunctionResult(fcnName, record.contractFunctionResult.bytes) : ifaceFactory.decodeFunctionResult(fcnName, record.contractFunctionResult.bytes);
	}
	catch (e) {
		if (e.data == '0x') {
			console.log(contractExecuteTx.transactionId.toString(), 'No data returned from contract - check the call');
		}
		else {
			console.log('Error', contractExecuteTx.transactionId.toString(), e);
			console.log(ifaceFactory.parseError(record.contractFunctionResult.bytes));
		}
	}
	// console.log('Contract Results:', contractResults);
	return [contractExecuteRx, contractResults, record];
}


async function checkLastMirrorEvent() {
	const url = `${baseUrl}/api/v1/contracts/${contractId.toString()}/results/logs?order=desc&limit=1`;

	await axios.get(url)
		.then(function(response) {
			const jsonResponse = response.data;

			jsonResponse.logs.forEach(log => {
				// decode the event data
				if (log.data == '0x') return;
				const event = ifaceFactory.parseLog({ topics: log.topics, data: log.data });

				let outputStr = 'Block: ' + log.block_number
						+ ' : Tx Hash: ' + log.transaction_hash
						+ ' : Event: ' + event.name + ' : ';

				for (let f = 0; f < event.args.length; f++) {
					const field = event.args[f];

					let output;
					if (typeof field === 'string') {
						output = field.startsWith('0x') ? AccountId.fromSolidityAddress(field).toString() : field;
					}
					else {
						output = field.toString();
					}
					output = f == 0 ? output : ' : ' + output;
					outputStr += output;
				}
				console.log(outputStr);
			});

		})
		.catch(function(err) {
			console.error(err);
			return null;
		});
}

/*
 * basic sleep function
 * @param {number} ms milliseconds to sleep
 * @returns {Promise}
 */
// eslint-disable-next-line no-unused-vars
function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}