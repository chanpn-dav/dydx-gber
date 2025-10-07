"use client"

import { useEffect, useRef } from "react"

export function LottieAnimation() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let animationInstance: any = null

    const loadLottie = async () => {
      try {
        const lottie = (await import("lottie-web")).default

        if (containerRef.current) {
          animationInstance = lottie.loadAnimation({
            container: containerRef.current,
            renderer: "svg",
            loop: true,
            autoplay: true,
            path: "/animation.json",
            rendererSettings: {
              preserveAspectRatio: "xMidYMid meet",
              clearCanvas: true,
              progressiveLoad: false,
              hideOnTransparent: true,
            },
          })
        }
      } catch (error) {
        console.error("Error loading Lottie:", error)
      }
    }

    loadLottie()

    return () => {
      if (animationInstance) {
        animationInstance.destroy()
      }
    }
  }, [])

  return <div ref={containerRef} className="w-16 h-16" style={{ width: "64px", height: "64px" }} />
}
