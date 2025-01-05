import { FlopGameHandHistoryForm } from '@/components/FlopGameHandHistoryForm'
import { GameLayout } from '@/components/GameLayout'

export default function FLOmahaHiLoPage() {
  return (
    <GameLayout>
      <FlopGameHandHistoryForm gameName="Fixed Limit Omaha High Low Eight or Better" handSize={4} />
    </GameLayout>
  )
}

