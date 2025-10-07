"use client"

import { useEffect, useRef } from "react"
import lottie, { type AnimationItem } from "lottie-web"

interface LottieProps {
  animationData?: any
  loop?: boolean
  autoplay?: boolean
  path?: string
}

export function Lottie({ animationData, loop = true, autoplay = true, path }: LottieProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<AnimationItem | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const loadAnimation = async () => {
      try {
        if (animationData) {
          // Use provided animation data
          animationRef.current = lottie.loadAnimation({
            container: containerRef.current!,
            renderer: "svg",
            loop,
            autoplay,
            animationData,
          })
        } else if (path) {
          // Load from path
          animationRef.current = lottie.loadAnimation({
            container: containerRef.current!,
            renderer: "svg",
            loop,
            autoplay,
            path,
          })
        } else {
          // Default to animation.json
          animationRef.current = lottie.loadAnimation({
            container: containerRef.current!,
            renderer: "svg",
            loop,
            autoplay,
            path: "/animation.json",
          })
        }
      } catch (error) {
        console.error("Error loading Lottie animation:", error)
      }
    }

    loadAnimation()

    return () => {
      animationRef.current?.destroy()
    }
  }, [animationData, loop, autoplay, path])

  return <div ref={containerRef} className="h-full w-full" />
}
