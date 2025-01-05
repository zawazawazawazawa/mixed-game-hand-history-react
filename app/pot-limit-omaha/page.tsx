import { FlopGameHandHistoryForm } from '@/components/FlopGameHandHistoryForm'
import { GameLayout } from '@/components/GameLayout'

export default function PotLimitOmahaPage() {
  return (
    <GameLayout>
      <FlopGameHandHistoryForm gameName="Pot Limit Omaha" handSize={4} />
    </GameLayout>
  )
}

