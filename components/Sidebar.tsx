import React from 'react'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Menu, X } from 'lucide-react'

const games = [
  { name: "No Limit Hold'em", path: "/" },
  { name: "Razz", path: "/razz" },
  { name: "Limit Hold'em", path: "/limit-holdem" },
  { name: "Limit Badugi", path: "/badugi" },
  { name: "Seven Card Stud", path: "/seven-card-stud" },
  { name: "No Limit 2-7 Single Draw", path: "/nl-2-7-single-draw" },
  { name: "Limit Omaha Hi/Lo 8 or Better", path: "/fl-omaha-hi-lo" },
  { name: "Pot Limit Omaha", path: "/pot-limit-omaha" },
  { name: "Limit 2-7 Triple Draw", path: "/2-7-triple-draw" },
  { name: "Seven Card Stud Hi/Lo 8 or Better", path: "/stud-hi-lo" }
]

type SidebarProps = {
  isOpen: boolean;
  onToggle: () => void;
}

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="fixed top-4 left-4 z-50 md:left-80 bg-gray-100 md:hidden"
        onClick={onToggle}
      >
        {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </Button>
      <div className={`fixed inset-y-0 left-0 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} w-80 bg-gray-100 transition-transform duration-300 ease-in-out z-40 md:translate-x-0 md:static md:w-80 md:h-screen`}>
        <div className="h-full overflow-y-auto p-4 pt-16 md:pt-4">
          <h2 className="text-xl font-bold mb-4">Game List</h2>
          <nav>
            <ul className="space-y-2">
              {games.map((game, index) => (
                <li key={index}>
                  <Link href={game.path} passHref>
                    <Button variant="ghost" className="w-full justify-start text-left whitespace-normal h-auto py-2">
                      {game.name}
                    </Button>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </>
  )
}

