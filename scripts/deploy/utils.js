const { logger } = require('@treasurenet/logging-middleware');
const fs = require('fs');
const path = require('path');

function getPaths(network) {
  const deployDir = path.join(process.cwd(), 'deployments');
  if (!fs.existsSync(deployDir)) {
    fs.mkdirSync(deployDir);
  }
  return {
    json: path.join(deployDir, `${network}.json`),
  };
}

function loadState(paths, network) {
  // default structure: { entries: [ { network, generatedAt, contracts: { name: {address,block,tx} } } ] }
  if (fs.existsSync(paths.json)) {
    try {
      const data = JSON.parse(fs.readFileSync(paths.json, 'utf8'));
      // legacy single-object format
      if (data.addresses && !data.entries) {
        const contracts = {};
        for (const [k, addr] of Object.entries(data.addresses)) {
          const key = k.endsWith('_ADDRESS') ? k.replace(/_ADDRESS$/, '') : k;
          contracts[key] = {
            address: addr,
            block: data.blocks ? data.blocks[k] : undefined,
            tx: data.txs ? data.txs[k] : undefined,
          };
        }
        return {
          entries: [
            {
              network: data.network || network,
              generatedAt: data.generatedAt || new Date().toISOString(),
              contracts,
            },
          ],
        };
      }
      if (data.entries) return data;
    } catch (err) {
      // fall through to default
    }
  }
  return { entries: [] };
}

function saveState(paths, state) {
  fs.writeFileSync(paths.json, JSON.stringify(state, null, 2));
}

function startNewEntry(state, network) {
  if (!state.entries) state.entries = [];
  state.entries.unshift({
    network,
    generatedAt: new Date().toISOString(),
    contracts: {},
  });
  return state;
}

function currentEntry(state) {
  if (!state.entries || state.entries.length === 0) {
    throw new Error('No deployment entry found; start a new run first.');
  }
  return state.entries[0];
}

function resolveContract(entry, state, key) {
  if (entry && entry.contracts && entry.contracts[key] && entry.contracts[key].address) {
    return entry.contracts[key].address;
  }
  if (state && state.addresses) {
    if (state.addresses[key]) return state.addresses[key];
    if (state.addresses[`${key}_ADDRESS`]) return state.addresses[`${key}_ADDRESS`];
  }
  return undefined;
}

function record(paths, state, name, address, blockNumber, txHash) {
  if (!state) state = { entries: [] };
  const entry = currentEntry(state);
  const key = name.endsWith('_ADDRESS') ? name.replace(/_ADDRESS$/, '') : name;
  entry.contracts[key] = { address, block: blockNumber, tx: txHash };
  logger.info(`${key}: ${address} | tx: ${txHash} | block: ${blockNumber}`);
  saveState(paths, state);
  return state;
}

module.exports = {
  getPaths,
  startNewEntry,
  currentEntry,
  resolveContract,
  loadState,
  record,
};
