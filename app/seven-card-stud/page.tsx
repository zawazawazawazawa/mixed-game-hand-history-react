import { PokerHandHistoryForm } from '@/components/PokerHandHistoryForm'
import { GameLayout } from '@/components/GameLayout'

export default function SevenCardStudPage() {
  return (
    <GameLayout>
      <PokerHandHistoryForm 
        gameName="7 Card Stud High" 
        handSize={7} 
        isFixedLimit={true} 
        game_type="stud" 
        studSpecific={true}
      />
    </GameLayout>
  )
}

