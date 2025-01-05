'use client'

import React, { useState } from 'react'
import { Sidebar } from './Sidebar'

type GameLayoutProps = {
  children: React.ReactNode
}

export function GameLayout({ children }: GameLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  return (
    <div className={`flex flex-col md:flex-row min-h-screen bg-gray-200 ${isSidebarOpen ? 'md:ml-80' : ''}`}>
      <Sidebar isOpen={isSidebarOpen} onToggle={toggleSidebar} />
      <div className={`flex-1 p-4 pt-16 md:pt-4 bg-white transition-all duration-300 ${isSidebarOpen ? 'md:ml-80' : ''}`}>
        {children}
      </div>
    </div>
  )
}

