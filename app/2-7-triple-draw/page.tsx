import { PokerHandHistoryForm } from '@/components/PokerHandHistoryForm'
import { GameLayout } from '@/components/GameLayout'

export default function TripleDrawPage() {
  return (
    <GameLayout>
      <PokerHandHistoryForm 
        gameName="Limit 2-7 Triple Draw" 
        handSize={5} 
        isFixedLimit={true} 
        game_type="draw" 
        changeRoundCount={3}
      />
    </GameLayout>
  )
}

