import { PokerHandHistoryForm } from '@/components/PokerHandHistoryForm'
import { GameLayout } from '@/components/GameLayout'

export default function BadugiPage() {
  return (
    <GameLayout>
      <PokerHandHistoryForm 
        gameName="Limit Badugi" 
        handSize={4} 
        isFixedLimit={true} 
        game_type="draw" 
        changeRoundCount={3}
      />
    </GameLayout>
  )
}

