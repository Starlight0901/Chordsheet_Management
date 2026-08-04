import { useParams } from 'react-router-dom'
import { WorshipPlanEditor } from '../components/worship/WorshipPlanEditor'

export function WorshipPlanDetailPage() {
  const { planId } = useParams<{ planId: string }>()

  if (!planId) {
    return (
      <div className="mx-auto w-full max-w-5xl rounded-2xl border border-dashed border-ink-600 bg-ink-800/30 px-6 py-16 text-center">
        <p className="text-sm font-medium text-ink-200">Worship plan not found</p>
      </div>
    )
  }

  return <WorshipPlanEditor planId={planId} />
}
