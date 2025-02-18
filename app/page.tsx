import { PokerHandHistoryForm } from '@/components/PokerHandHistoryForm'
import { GameLayout } from '@/components/GameLayout'

export default function Home() {
  return (
    <GameLayout>
      <PokerHandHistoryForm 
        gameName="No Limit Texas Hold'em" 
        handSize={2} 
        game_type="flop" 
      />

    </GameLayout>
  )
}

