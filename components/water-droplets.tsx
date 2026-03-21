"use client"

import { useEffect, useState } from "react"

interface Droplet {
  id: number
  left: number
  delay: number
  duration: number
  size: number
  opacity: number
}

export function WaterDroplets() {
  const [droplets, setDroplets] = useState<Droplet[]>([])

  useEffect(() => {
    // Generate random droplets
    const generateDroplets = () => {
      const newDroplets: Droplet[] = []
      for (let i = 0; i < 40; i++) {
        newDroplets.push({
          id: i,
          left: Math.random() * 100,
          delay: Math.random() * 10,
          duration: 8 + Math.random() * 12, // 8-20 seconds
          size: 2 + Math.random() * 4, // 2-6px
          opacity: 0.15 + Math.random() * 0.25, // 0.15-0.4 opacity
        })
      }
      setDroplets(newDroplets)
    }

    generateDroplets()
  }, [])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-[1]">
      {droplets.map((droplet) => (
        <div
          key={droplet.id}
          className="absolute rounded-full bg-white/30"
          style={{
            left: `${droplet.left}%`,
            width: `${droplet.size}px`,
            height: `${droplet.size * 2}px`,
            opacity: droplet.opacity,
            animation: `dropletFall ${droplet.duration}s linear ${droplet.delay}s infinite`,
            boxShadow: `0 0 ${droplet.size}px rgba(255, 255, 255, 0.3)`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes dropletFall {
          0% {
            transform: translateY(-20px);
            opacity: 0;
          }
          10% {
            opacity: ${0.15 + Math.random() * 0.25};
          }
          90% {
            opacity: ${0.15 + Math.random() * 0.25};
          }
          100% {
            transform: translateY(100vh);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}
