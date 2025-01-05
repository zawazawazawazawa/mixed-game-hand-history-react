import { PokerHandHistoryForm } from '@/components/PokerHandHistoryForm'
import { GameLayout } from '@/components/GameLayout'

export default function FLOmahaHiLoPage() {
  return (
    <GameLayout>
      <PokerHandHistoryForm 
        gameName="Fixed Limit Omaha High Low Eight or Better" 
        handSize={4} 
        isFixedLimit={true} 
        game_type="flop" 
      />
    </GameLayout>
  )
}

