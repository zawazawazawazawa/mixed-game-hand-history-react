import { PokerHandHistoryForm } from '@/components/PokerHandHistoryForm'
import { GameLayout } from '@/components/GameLayout'

export default function NL27SingleDrawPage() {
  return (
    <GameLayout>
      <PokerHandHistoryForm 
        gameName="No Limit 2-7 Single Draw" 
        handSize={5} 
        isFixedLimit={false} 
        game_type="draw" 
        changeRoundCount={1}
      />
    </GameLayout>
  )
}

