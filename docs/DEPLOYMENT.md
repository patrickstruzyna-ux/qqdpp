# Decentralized Messenger Deployment Guide

## Table of Contents
- [Prerequisites](#prerequisites)
- [Smart Contract Deployment](#smart-contract-deployment)
- [Contract Upgrades](#contract-upgrades)
- [Environment Setup](#environment-setup)
- [Deployment Scripts](#deployment-scripts)

## Prerequisites
- Node.js >= 14.0.0
- npm >= 6.0.0
- Hardhat
- OpenZeppelin Contracts

## Smart Contract Deployment

### Basic Deployment
1. Set up your environment variables in `.env`
2. Run deployment:
```bash
npm run deploy:local    # For local deployment
npm run deploy:sepolia  # For testnet deployment
npm run deploy:mainnet  # For mainnet deployment
```

## Contract Upgrades

### Setup
The project uses OpenZeppelin's upgrade system. Required dependencies:

```bash
npm install @openzeppelin/contracts-upgradeable
npm install --save-dev @openzeppelin/hardhat-upgrades
```

### Upgrade System Architecture

The upgrade system uses three main components:
1. **Proxy Contract**: Entry point for users
2. **Implementation Contract**: Contains actual logic
3. **ProxyAdmin**: Manages upgrade permissions

### Upgrade Guidelines

#### Storage Rules
When upgrading contracts, follow these rules:
- Never modify existing storage variable order
- Only append new storage variables at the end
- Never modify existing storage variable types
- Initialize new variables in the upgrade function

#### Security Considerations
- Always test upgrades on testnet first
- Use multi-sig for production upgrades
- Implement timelock for critical upgrades
- Maintain comprehensive upgrade documentation

### Upgrade Process

1. Deploy initial version:
```bash
npm run deploy:upgradeable
```

2. Store deployed addresses:
- Proxy: [CONTRACT_ADDRESS]
- Implementation: [IMPLEMENTATION_ADDRESS]
- Admin: [ADMIN_ADDRESS]

3. Upgrade to new version:
```bash
npm run upgrade
```

### Example Contract Structure

```solidity
// Base upgradeable contract
contract LockUpgradeable is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    function initialize() public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}

// V2 upgrade example
contract LockUpgradeableV2 is LockUpgradeable {
    // New variables added here
    uint public newFeature;

    // New or modified functions
    function setNewFeature(uint _value) public onlyOwner {
        newFeature = _value;
    }
}
```

## Environment Setup

Required environment variables in `.env`:
```
PRIVATE_KEY=your_private_key_here
SEPOLIA_URL=your_sepolia_rpc_url
MAINNET_URL=your_mainnet_rpc_url
ETHERSCAN_API_KEY=your_etherscan_api_key
```

## Deployment Scripts

Available npm scripts:
```json
{
  "deploy:local": "npx hardhat run scripts/deploy.ts --network localhost",
  "deploy:sepolia": "npx hardhat run scripts/deploy.ts --network sepolia",
  "deploy:mainnet": "npx hardhat run scripts/deploy.ts --network mainnet",
  "deploy:upgradeable": "npx hardhat run scripts/deploy_upgradeable.ts",
  "upgrade": "npx hardhat run scripts/upgrade.ts",
  "verify": "npx hardhat verify",
  "compile": "npx hardhat compile",
  "node": "npx hardhat node"
}
```

## Post-Deployment Verification

1. Verify contract on Etherscan:
```bash
npx hardhat verify --network goerli [CONTRACT_ADDRESS]
```

2. Verify proxy setup:
```bash
npx hardhat verify --network goerli [IMPLEMENTATION_ADDRESS]
```

## Maintenance

### Upgrade Checklist
- [ ] Comprehensive tests for new implementation
- [ ] Audit of storage layout changes
- [ ] Testnet deployment and testing
- [ ] Multi-sig approval (if required)
- [ ] Documentation update
- [ ] Backup of previous implementation

### Emergency Procedures
1. Access Control Issues: Contact admin multi-sig
2. Critical Bugs: Use emergency pause if implemented
3. Data Migration: Follow upgrade pattern

## Support

For technical support or questions about deployment:
- Create an issue in the repository
- Contact the development team
