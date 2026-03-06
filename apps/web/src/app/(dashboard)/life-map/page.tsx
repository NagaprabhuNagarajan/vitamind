'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Heart,
  Briefcase,
  Users,
  DollarSign,
  GraduationCap,
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
  Target,
} from 'lucide-react'

// -- Types --------------------------------------------------------------------

interface Goal {
  id: string
  title: string
  status: string
}

interface DomainData {
  score: number
  goalCount: number
  activeGoals: Goal[]
  topInsight: string | null
}

type DomainKey = 'health' | 'career' | 'relationships' | 'finance' | 'learning' | 'personal'

interface LifeMapResponse {
  data: {
    domains: Record<DomainKey, DomainData>
    overallScore: number
    generatedAt: string
  }
}

// -- Constants ----------------------------------------------------------------

const DOMAIN_CONFIG: Record<
  DomainKey,
  { label: string; color: string; icon: typeof Heart }
> = {
  health:        { label: 'Health',        color: '#10B981', icon: Heart },
  career:        { label: 'Career',        color: '#3B82F6', icon: Briefcase },
  relationships: { label: 'Relationships', color: '#EC4899', icon: Users },
  finance:       { label: 'Finance',       color: '#F59E0B', icon: DollarSign },
  learning:      { label: 'Learning',      color: '#A855F7', icon: GraduationCap },
  personal:      { label: 'Personal',      color: '#06B6D4', icon: Sparkles },
}

const DOMAIN_KEYS: DomainKey[] = [
  'health',
  'career',
  'relationships',
  'finance',
  'learning',
  'personal',
]

// -- Radar Chart Geometry -----------------------------------------------------

const CHART_SIZE = 340
const CENTER = CHART_SIZE / 2
const RADIUS = 130

/** Returns the (x, y) coordinates for a point on the hexagonal radar. */
function polarToCart(index: number, value: number, total: number): [number, number] {
  // Start from the top (-PI/2) and go clockwise
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2
  const r = (value / 100) * RADIUS
  return [CENTER + r * Math.cos(angle), CENTER + r * Math.sin(angle)]
}

/** Builds the SVG points string for a hexagonal ring at a given percentage. */
function hexagonPoints(pct: number): string {
  return DOMAIN_KEYS.map((_, i) => polarToCart(i, pct, 6).join(',')).join(' ')
}

// -- Component ----------------------------------------------------------------

export default function LifeMapPage() {
  const [data, setData] = useState<LifeMapResponse['data'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedDomain, setExpandedDomain] = useState<DomainKey | null>(null)

  useEffect(() => {
    async function fetchLifeMap() {
      try {
        const res = await fetch('/api/v1/life-map')
        const json: LifeMapResponse = await res.json()
        setData(json.data)
      } catch {
        // Silently handle — the empty state will render
      } finally {
        setLoading(false)
      }
    }
    fetchLifeMap()
  }, [])

  const isEmpty = useMemo(() => {
    if (!data) return true
    if (data.overallScore !== 0) return false
    return DOMAIN_KEYS.every((k) => data.domains[k].goalCount === 0)
  }, [data])

  // -- Radar polygon path for the user's scores
  const scorePath = useMemo(() => {
    if (!data) return ''
    return DOMAIN_KEYS.map((key, i) =>
      polarToCart(i, data.domains[key].score, 6).join(','),
    ).join(' ')
  }, [data])

  // -- Render -----------------------------------------------------------------

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold gradient-text">Life Map</h1>
        <p className="text-xs text-text-tertiary mt-1">
          A holistic view of your life domains
        </p>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-text-tertiary" />
        </div>
      )}

      {/* Empty state */}
      {!loading && isEmpty && (
        <div className="card p-12 text-center space-y-3">
          <Target className="w-10 h-10 text-text-tertiary mx-auto" />
          <h3 className="text-base font-semibold text-text-primary">
            Your Life Map is waiting
          </h3>
          <p className="text-sm text-text-tertiary max-w-md mx-auto">
            Start by setting goals in different life domains to see your Life Map come alive.
          </p>
        </div>
      )}

      {/* Main content */}
      {!loading && !isEmpty && data && (
        <>
          {/* Radar Chart */}
          <div className="card p-6 flex flex-col items-center">
            <svg
              viewBox={`0 0 ${CHART_SIZE} ${CHART_SIZE}`}
              width="100%"
              style={{ maxWidth: 400 }}
            >
              {/* Concentric hexagonal grid lines at 25%, 50%, 75%, 100% */}
              {[25, 50, 75, 100].map((pct) => (
                <polygon
                  key={pct}
                  points={hexagonPoints(pct)}
                  fill="none"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth={1}
                />
              ))}

              {/* Axis lines from center to each vertex */}
              {DOMAIN_KEYS.map((_, i) => {
                const [x, y] = polarToCart(i, 100, 6)
                return (
                  <line
                    key={i}
                    x1={CENTER}
                    y1={CENTER}
                    x2={x}
                    y2={y}
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth={1}
                  />
                )
              })}

              {/* User score polygon */}
              <polygon
                points={scorePath}
                fill="rgba(99,102,241,0.2)"
                stroke="rgba(99,102,241,0.7)"
                strokeWidth={2}
              />

              {/* Score dots at each vertex */}
              {DOMAIN_KEYS.map((key, i) => {
                const [x, y] = polarToCart(i, data.domains[key].score, 6)
                return (
                  <circle
                    key={key}
                    cx={x}
                    cy={y}
                    r={4}
                    fill={DOMAIN_CONFIG[key].color}
                    stroke="rgba(0,0,0,0.3)"
                    strokeWidth={1}
                  />
                )
              })}

              {/* Axis labels with domain name and score */}
              {DOMAIN_KEYS.map((key, i) => {
                // Position labels slightly beyond the outer hexagon
                const [x, y] = polarToCart(i, 118, 6)
                const config = DOMAIN_CONFIG[key]
                const score = data.domains[key].score
                return (
                  <text
                    key={key}
                    x={x}
                    y={y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={11}
                    fontWeight={600}
                    fill={config.color}
                  >
                    <tspan x={x} dy="-0.5em">
                      {config.label}
                    </tspan>
                    <tspan x={x} dy="1.2em" fontSize={10} fontWeight={500} fill="#94A3B8">
                      {score}%
                    </tspan>
                  </text>
                )
              })}
            </svg>

            {/* Overall Score — centered below the chart */}
            <div className="mt-6 text-center">
              <p className="text-xs text-text-tertiary uppercase tracking-wider mb-1">
                Overall Score
              </p>
              <p
                className="text-4xl font-bold"
                style={{
                  background: 'linear-gradient(135deg, #6366F1, #A855F7)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {data.overallScore}
              </p>
            </div>
          </div>

          {/* Domain Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DOMAIN_KEYS.map((key) => {
              const domain = data.domains[key]
              const config = DOMAIN_CONFIG[key]
              const Icon = config.icon
              const isExpanded = expandedDomain === key

              return (
                <div
                  key={key}
                  className="card p-5 transition-colors cursor-pointer"
                  style={{ borderColor: `${config.color}20` }}
                  onClick={() => setExpandedDomain(isExpanded ? null : key)}
                >
                  {/* Card header */}
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        background: `${config.color}18`,
                        border: `1px solid ${config.color}30`,
                      }}
                    >
                      <Icon style={{ color: config.color, width: 18, height: 18 }} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-text-primary">
                          {config.label}
                        </p>
                        <div className="flex items-center gap-2">
                          <span
                            className="text-xs font-medium"
                            style={{ color: config.color }}
                          >
                            {domain.score}%
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5 text-text-tertiary" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-text-tertiary" />
                          )}
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div
                        className="mt-2 h-1.5 rounded-full overflow-hidden"
                        style={{ background: 'rgba(255,255,255,0.06)' }}
                      >
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${domain.score}%`,
                            background: config.color,
                            opacity: 0.8,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Goal count and insight */}
                  <div className="mt-3 flex items-center gap-3">
                    <span
                      className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                      style={{
                        background: `${config.color}15`,
                        color: config.color,
                      }}
                    >
                      {domain.goalCount} {domain.goalCount === 1 ? 'goal' : 'goals'}
                    </span>
                    {domain.topInsight && (
                      <p className="text-[11px] text-text-tertiary truncate flex-1">
                        {domain.topInsight}
                      </p>
                    )}
                  </div>

                  {/* Expanded: active goals list */}
                  {isExpanded && domain.activeGoals.length > 0 && (
                    <div
                      className="mt-4 pt-3 space-y-2"
                      style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <p className="text-[10px] text-text-tertiary uppercase tracking-wider">
                        Active Goals
                      </p>
                      {domain.activeGoals.map((goal) => (
                        <div
                          key={goal.id}
                          className="flex items-center gap-2 py-1.5 px-2 rounded-lg"
                          style={{ background: 'rgba(255,255,255,0.03)' }}
                        >
                          <div
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ background: config.color }}
                          />
                          <span className="text-xs text-text-secondary truncate">
                            {goal.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {isExpanded && domain.activeGoals.length === 0 && (
                    <div
                      className="mt-4 pt-3"
                      style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <p className="text-xs text-text-tertiary">
                        No active goals in this domain yet.
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
