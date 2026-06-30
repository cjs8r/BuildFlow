/**
 * ProgressBar — shows actual progress vs expected progress.
 *
 * actualPct   : 0–100, the value to fill (e.g. % complete, or % of budget spent)
 * expectedPct : 0–100, where the marker should appear
 * gapLabel    : plain-language gap string (e.g. "3 days ahead", "$1,800 over")
 * ahead       : boolean — true = green, false = red/orange
 * behindBy    : 0–100 numeric gap, used to pick orange vs red
 */
export default function ProgressBar({ actualPct, expectedPct, gapLabel, ahead, behindBy = 0 }) {
  const actual   = Math.min(100, Math.max(0, actualPct   ?? 0))
  const expected = Math.min(100, Math.max(0, expectedPct ?? 0))

  // Color logic
  let fillColor = 'bg-emerald-500'
  if (!ahead) {
    fillColor = behindBy > 15 ? 'bg-red-500' : 'bg-amber-500'
  }

  const gapColor = ahead ? 'text-emerald-600' : behindBy > 15 ? 'text-red-600' : 'text-amber-600'

  return (
    <div className="space-y-1 min-w-0">
      <div className="relative h-3 rounded-full bg-charcoal-200 overflow-visible">
        {/* Actual fill */}
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${fillColor}`}
          style={{ width: `${actual}%` }}
        />
        {/* Expected marker */}
        {expected > 0 && expected < 100 && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-0.5 h-5 bg-charcoal-700 rounded-full z-10"
            style={{ left: `${expected}%` }}
            title={`Expected: ${Math.round(expected)}%`}
          />
        )}
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-charcoal-500">
          Actual <span className="font-semibold text-charcoal-700">{Math.round(actual)}%</span>
          &nbsp;·&nbsp;Expected <span className="font-semibold text-charcoal-700">{Math.round(expected)}%</span>
        </span>
        {gapLabel && (
          <span className={`font-semibold ${gapColor}`}>{gapLabel}</span>
        )}
      </div>
    </div>
  )
}
