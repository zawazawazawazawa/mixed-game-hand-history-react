import { PokerHandHistoryForm } from '@/components/PokerHandHistoryForm'
import { GameLayout } from '@/components/GameLayout'

export default function RazzPage() {
  return (
    <GameLayout>
      <PokerHandHistoryForm 
        gameName="Razz" 
        handSize={7} 
        isFixedLimit={true} 
        game_type="stud" 
        studSpecific={true}
      />
    </GameLayout>
  )
}

