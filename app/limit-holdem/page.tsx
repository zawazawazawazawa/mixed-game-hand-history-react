import { PokerHandHistoryForm } from '@/components/PokerHandHistoryForm'
import { GameLayout } from '@/components/GameLayout'

export default function LimitHoldemPage() {
  return (
    <GameLayout>
      <PokerHandHistoryForm 
        gameName="Limit Texas Hold'em" 
        handSize={2} 
        isFixedLimit={true} 
        game_type="flop" 
      />
    </GameLayout>
  )
}

