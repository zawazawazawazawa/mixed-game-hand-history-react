import { PokerHandHistoryForm } from '@/components/PokerHandHistoryForm'
import { GameLayout } from '@/components/GameLayout'

export default function PotLimitOmahaPage() {
  return (
    <GameLayout>
      <PokerHandHistoryForm 
        gameName="Pot Limit Omaha" 
        handSize={4} 
        game_type="flop" 
      />
    </GameLayout>
  )
}

