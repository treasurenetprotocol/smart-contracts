#!/usr/bin/env node
/**
 * Sync target options in .github/workflows/deploy-contracts.yaml
 * based on deploy:*:* and upgrade:*:* scripts in package.json.
 * Adds a trailing "custom" option for manual input.
 */

const fs = require('fs');
const path = require('path');

const pkgPath = path.join(process.cwd(), 'package.json');
const workflowPath = path.join(process.cwd(), '.github/workflows/deploy-contracts.yaml');

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

const extractTargets = (action) => {
  const targets = new Set();
  Object.keys(pkg.scripts || {}).forEach((name) => {
    const parts = name.split(':');
    if (parts.length >= 3 && parts[0] === action) {
      targets.add(parts[1]);
    }
  });
  return Array.from(targets);
};

const deployTargets = extractTargets('deploy');
const upgradeTargets = extractTargets('upgrade');

const allTargets = Array.from(new Set([...deployTargets, ...upgradeTargets])).sort();
allTargets.push('custom');

const workflow = fs.readFileSync(workflowPath, 'utf8');
const optionsRegex = /(target:\n[\s\S]*?options:\n)([\s\S]*?)\n\s+network:/;

const newOptionsBlock = allTargets.map((t) => `          - ${t}`).join('\n');

if (!optionsRegex.test(workflow)) {
  throw new Error('Could not find target options block in deploy-contracts.yaml');
}

const updated = workflow.replace(optionsRegex, `$1${newOptionsBlock}\n      network:`);
fs.writeFileSync(workflowPath, updated);

console.log('Updated target options:', allTargets.join(', '));
