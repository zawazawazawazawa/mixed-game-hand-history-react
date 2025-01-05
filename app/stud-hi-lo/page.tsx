import { PokerHandHistoryForm } from '@/components/PokerHandHistoryForm'
import { GameLayout } from '@/components/GameLayout'

export default function StudHiLoPage() {
  return (
    <GameLayout>
      <PokerHandHistoryForm 
        gameName="Stud High Low Eight or Better" 
        handSize={7} 
        isFixedLimit={true} 
        game_type="stud" 
        studSpecific={true}
      />
    </GameLayout>
  )
}

