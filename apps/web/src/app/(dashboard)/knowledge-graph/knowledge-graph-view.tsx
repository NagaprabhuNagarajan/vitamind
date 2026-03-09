'use client'

import { useState, useEffect, useRef } from 'react'
import { RefreshCw, AlertCircle, Star } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import type { KnowledgeGraph, GraphNode, GraphEdge } from '@/features/knowledge-graph/services/knowledge-graph.service'

const NODE_COLORS: Record<GraphNode['type'], string> = {
  habit: '#6366F1',
  health: '#22C55E',
  productivity: '#F59E0B',
  goal: '#A855F7',
  outcome: '#06B6D4',
}

const DIRECTION_COLORS: Record<GraphEdge['direction'], string> = {
  positive: '#22C55E',
  negative: '#EF4444',
  neutral: '#6B7280',
}

// Simple force-layout positions using a deterministic circle layout
function layoutNodes(nodes: GraphNode[]): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>()
  const cx = 350
  const cy = 280
  const r = 180
  nodes.forEach((n, i) => {
    const angle = (i / nodes.length) * 2 * Math.PI - Math.PI / 2
    positions.set(n.id, {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    })
  })
  return positions
}

export function KnowledgeGraphView() {
  const [graph, setGraph] = useState<KnowledgeGraph | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  async function fetchGraph(force = false) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/knowledge-graph${force ? '?force=true' : ''}`)
      const { data, error: err } = await res.json()
      if (err) throw new Error(err.message)
      setGraph(data as KnowledgeGraph)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load graph')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void fetchGraph() }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Spinner size="lg" />
        <p className="text-sm text-text-tertiary">Computing your knowledge graph…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-red-400 text-sm p-4 card">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
      </div>
    )
  }

  if (!graph) return null

  if (!graph.has_enough_data || graph.nodes.length === 0) {
    return (
      <div className="card p-8 text-center max-w-lg mx-auto">
        <p className="text-4xl mb-4">🧬</p>
        <h3 className="text-base font-semibold text-text-primary mb-2">Building your graph…</h3>
        <p className="text-sm text-text-secondary">{graph.summary}</p>
      </div>
    )
  }

  const positions = layoutNodes(graph.nodes)

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Influence Network</h3>
            <p className="text-xs text-text-tertiary mt-0.5">
              {graph.nodes.length} nodes · {graph.edges.length} connections · computed {new Date(graph.computed_at).toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={() => fetchGraph(true)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border text-text-secondary hover:text-text-primary hover:bg-surface-tertiary transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
        <p className="text-sm text-text-secondary leading-relaxed">{graph.summary}</p>

        {/* Keystone node badge */}
        {graph.keystone_node && (() => {
          const keystone = graph.nodes.find((n) => n.id === graph.keystone_node)
          return keystone ? (
            <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <Star className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
              <span className="text-xs text-text-secondary">Keystone habit: </span>
              <span className="text-xs font-semibold text-text-primary">{keystone.label}</span>
            </div>
          ) : null
        })()}
      </div>

      {/* SVG Graph */}
      <div className="card p-2 overflow-hidden">
        <svg ref={svgRef} viewBox="0 0 700 560" className="w-full" style={{ minHeight: 400 }}>
          <defs>
            <marker id="arrow-pos" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="#22C55E" fillOpacity="0.7" />
            </marker>
            <marker id="arrow-neg" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="#EF4444" fillOpacity="0.7" />
            </marker>
            <marker id="arrow-neu" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="#6B7280" fillOpacity="0.7" />
            </marker>
          </defs>

          {/* Edges */}
          {graph.edges.map((edge, i) => {
            const from = positions.get(edge.from)
            const to = positions.get(edge.to)
            if (!from || !to) return null
            const color = DIRECTION_COLORS[edge.direction]
            const strokeWidth = Math.max(1, edge.strength / 25)
            const markerId = `arrow-${edge.direction === 'positive' ? 'pos' : edge.direction === 'negative' ? 'neg' : 'neu'}`
            // Shorten line so arrow doesn't overlap node circle
            const dx = to.x - from.x
            const dy = to.y - from.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            const nodeR = 22
            const x2 = to.x - (dx / dist) * (nodeR + 10)
            const y2 = to.y - (dy / dist) * (nodeR + 10)
            const x1 = from.x + (dx / dist) * nodeR
            const y1 = from.y + (dy / dist) * nodeR
            const mx = (x1 + x2) / 2
            const my = (y1 + y2) / 2
            const isHovered = hoveredNode === edge.from || hoveredNode === edge.to

            return (
              <g key={i} opacity={hoveredNode && !isHovered ? 0.15 : 1} style={{ transition: 'opacity 0.2s' }}>
                <line
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke={color}
                  strokeWidth={strokeWidth}
                  strokeOpacity={0.6}
                  markerEnd={`url(#${markerId})`}
                />
                {isHovered && (
                  <text x={mx} y={my - 6} textAnchor="middle" fontSize="9" fill={color} fillOpacity="0.9">
                    {edge.label}
                  </text>
                )}
              </g>
            )
          })}

          {/* Nodes */}
          {graph.nodes.map((node) => {
            const pos = positions.get(node.id)
            if (!pos) return null
            const color = NODE_COLORS[node.type]
            const isKeystone = node.id === graph.keystone_node
            const isHovered = hoveredNode === node.id
            const r = isKeystone ? 28 : 22

            return (
              <g
                key={node.id}
                transform={`translate(${pos.x},${pos.y})`}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                opacity={hoveredNode && !isHovered && !graph.edges.some((e) => e.from === hoveredNode || e.to === hoveredNode ? e.from === node.id || e.to === node.id : false) ? 0.4 : 1}
              >
                {/* Glow ring for keystone */}
                {isKeystone && (
                  <circle r={r + 8} fill="none" stroke={color} strokeWidth={1.5} strokeOpacity={0.25} />
                )}
                <circle
                  r={r}
                  fill={color}
                  fillOpacity={0.15}
                  stroke={color}
                  strokeWidth={isHovered ? 2.5 : 1.5}
                  strokeOpacity={isHovered ? 0.9 : 0.6}
                />
                <text textAnchor="middle" dy="0.35em" fontSize="9" fill={color} fillOpacity="0.9" fontWeight="600">
                  {node.label.length > 10 ? node.label.substring(0, 10) + '…' : node.label}
                </text>
                {isHovered && node.description && (
                  <foreignObject x={-80} y={r + 6} width={160} height={40}>
                    <div {...{ xmlns: 'http://www.w3.org/1999/xhtml' } as object} style={{ background: 'rgba(15,15,25,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '4px 8px', fontSize: 9, color: 'rgba(255,255,255,0.7)', lineHeight: 1.4 }}>
                      {node.description}
                    </div>
                  </foreignObject>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="card p-4">
        <p className="text-xs text-text-tertiary uppercase tracking-wider mb-3">Node Types</p>
        <div className="flex flex-wrap gap-4">
          {Object.entries(NODE_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ background: color, opacity: 0.7 }} />
              <span className="text-xs text-text-secondary capitalize">{type}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-4 mt-3">
          {Object.entries(DIRECTION_COLORS).map(([dir, color]) => (
            <div key={dir} className="flex items-center gap-1.5">
              <div className="w-6 h-0.5" style={{ background: color, opacity: 0.7 }} />
              <span className="text-xs text-text-secondary capitalize">{dir} influence</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
