# Repository Guidelines

## Project Structure & Module Organization
- `contracts/`: Solidity sources per module (Airdrop, Bid, Crosschain, Governance, TAT, TokenLocker, USTN, wrapped assets, mocks).
- `test/`: Hardhat/Mocha/Chai specs (`*.test.js`), with shared helpers in `test/helpers`.
- `scripts/` + `scripts/tasks.sh`: orchestrated deploy/upgrade flows; pair with `--network dev|dev2|testnet|mainnet|ethereum`.
- `deployments/`: saved addresses/artifacts from scripted deploys; align with the target network before committing.
- `docs/`: module notes; `ganache/ganache.sh` starts a local chain; `hardhat.config.js` defines compiler/network settings.

## Build, Test, and Development Commands
- `npm run clean && npm run compile`: clear artifacts and compile (Solidity 0.8.10, optimizer 200).
- `npm run test`: Hardhat tests with c8 summary to `coverage-js/`.
- `npm run coverage:solidity`: solidity-coverage pass.
- `npm run node` or `npm run ganache`: local chain for manual testing; `npm run test:debug` targets ganache.
- Deploy/upgrade via `npm run deploy:base:<env>` or `npm run upgrade:<module>:<env>`; check `scripts/tasks.sh` for step ordering.
- Quality gates: `npm run lint`, `npm run solhint`, `npm run prettier:check`.

## Coding Style & Naming Conventions
- Node 20 required (`nvm use 20`). Solidity: 4-space indent, SPDX headers, PascalCase contracts, MixedCase functions/events; keep `require` messages concise per `.solhint.json`.
- JS tests/scripts: 2-space indent, CommonJS, `ethers` + Hardhat helpers; ESLint config in `.eslintrc.js` governs overrides for tests/scripts.
- Keep contract/test names aligned (e.g., `crosschain-bridge.test.js`); avoid non-deterministic behavior by using seeds, block numbers, or Hardhat time helpers.

## Testing Guidelines
- Add or extend tests with each contract change; cover success/revert paths and emitted events.
- Default to Hardhat network; set `RPC`/`PRIVATE_KEY` in `.env` only when using external nodes. Do not commit secrets.
- Keep coverage from `npm run test` or `npm run coverage:solidity` steady or rising; fix failing/flaky cases rather than skipping. Use `describe` per contract with focused assertions.

## Commit & Pull Request Guidelines
- Follow the observed style: `Feature/<scope> dev-###` or `Fix/<scope>` plus the issue/PR number.
- PRs should state scope, target network (if deploy scripts change), test commands/results, and any new addresses/ABI impacts. Keep diffs focused; split protocol, script, and docs changes when possible.

## Security & Configuration Tips
- `.env` feeds Hardhat (`RPC`, `PRIVATE_KEY` or `PRIVATE_KEYS` comma-separated); never commit keys or private RPC URLs.
- Verify `deployments/<network>` matches `hardhat.config.js` chain IDs before merging deploy changes; use Hardhat Verify where applicable.
- Use least-privilege deployer keys and rotate immediately if exposed.
