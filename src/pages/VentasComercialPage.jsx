import { useEffect, useState } from 'react'
import PageLoader from '../components/PageLoader'

const DEST_COLORS = ['#0d6efd', '#109d58', '#5c9ead', '#f59e0b', '#6366f1']

function SalesEvolutionChart({ evolucion }) {
  const rows =
    evolucion.length > 0
      ? evolucion.map((e) => ({
          label: e.periodo,
          sales: Number(e.ventas_usd || 0) / 1000,
          target: 140,
        }))
      : [
          { label: 'Sem 1', sales: 110, target: 120 },
          { label: 'Sem 2', sales: 135, target: 130 },
          { label: 'Sem 3', sales: 155, target: 145 },
          { label: 'Sem 4', sales: 180, target: 165 },
        ]

  const maxVal = Math.max(
    100,
    ...rows.map((r) => Math.max(r.sales, r.target) * 1.15),
  )

  const width = 560
  const height = 215
  const padLeft = 48
  const padRight = 20
  const padTop = 18
  const padBottom = 26
  const plotW = width - padLeft - padRight
  const plotH = height - padTop - padBottom

  const yTicks = [0, 0.33, 0.66, 1].map((f) => Math.round(maxVal * f))
  const slotW = plotW / rows.length
  const barW = Math.min(48, slotW * 0.52)

  const getCenterX = (idx) => padLeft + slotW * idx + slotW / 2
  const getY = (val) => padTop + plotH - (val / maxVal) * plotH

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-52 overflow-visible"
      role="img"
      aria-label="Evolución de ventas"
    >
      {yTicks.map((tick) => {
        const y = getY(tick)
        return (
          <g key={tick}>
            <line
              x1={padLeft}
              y1={y}
              x2={width - padRight}
              y2={y}
              stroke="#e2e8f0"
              strokeWidth="1"
            />
            <text
              x={padLeft - 8}
              y={y + 3.5}
              textAnchor="end"
              className="fill-slate-400 text-[10px]"
            >
              ${tick}K
            </text>
          </g>
        )
      })}

      {rows.map((item, idx) => {
        const cx = getCenterX(idx)
        const topY = getY(item.sales)
        const barH = padTop + plotH - topY
        return (
          <g key={item.label}>
            <rect
              x={cx - barW / 2}
              y={topY}
              width={barW}
              height={barH}
              rx="4"
              fill="#0b63d6"
            >
              <title>{`${item.label}: USD ${(item.sales * 1000).toLocaleString('es-PE')}`}</title>
            </rect>
            <text
              x={cx}
              y={height - 6}
              textAnchor="middle"
              className="fill-slate-500 text-[10.5px]"
            >
              {item.label}
            </text>
          </g>
        )
      })}

      {rows.length > 1 && (
        <polyline
          fill="none"
          stroke="#16a34a"
          strokeWidth="2"
          strokeDasharray="4 4"
          points={rows.map((w, i) => `${getCenterX(i)},${getY(w.target)}`).join(' ')}
        />
      )}
    </svg>
  )
}

function DestinationDonutChart({ destinos }) {
  const total = destinos.reduce((sum, d) => sum + Number(d.ventas_usd || 0), 0)
  const items =
    total > 0
      ? destinos.map((d, idx) => ({
          name: d.destino || 'Otros',
          percent: Math.round((Number(d.ventas_usd) / total) * 100),
          color: DEST_COLORS[idx % DEST_COLORS.length],
        }))
      : [{ name: 'Sin datos', percent: 100, color: '#cbd5e1' }]

  const radius = 42
  const circumference = 2 * Math.PI * radius
  const segments = items.reduce(
    (acc, item) => {
      const dash = (item.percent / 100) * circumference
      const nextOffset = acc.offset + dash
      acc.items.push({ ...item, dash, offset: acc.offset })
      return { offset: nextOffset, items: acc.items }
    },
    { offset: 0, items: [] },
  ).items

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-5 my-auto">
      <div className="relative h-32 w-32 shrink-0 flex items-center justify-center">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          {segments.map((seg) => (
            <circle
              key={seg.name}
              cx="60"
              cy="60"
              r={radius}
              fill="transparent"
              stroke={seg.color}
              strokeWidth="18"
              strokeDasharray={`${seg.dash} ${circumference - seg.dash}`}
              strokeDashoffset={-seg.offset}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-[#0d1f3c]">100%</span>
        </div>
      </div>

      <ul className="w-full space-y-2 text-xs sm:text-[13px]">
        {items.map((ch) => (
          <li
            key={ch.name}
            className="flex items-center justify-between gap-3"
          >
            <span className="flex items-center gap-2 text-slate-700 font-medium">
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: ch.color }}
              />
              {ch.name}
            </span>
            <span className="font-bold text-[#0d1f3c]">{ch.percent}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function VentasComercialPage({ onNavigate }) {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch('/api/dashboard/ventas-comercial')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled && json?.ok) {
          setData(json.data)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (isLoading) {
    return <PageLoader message="Cargando Ventas y Comercial..." />
  }

  const kpis = data?.kpis || {}
  const totalVentas = Number(kpis.total_ventas_usd || 0)
  const totalToneladas = kpis.total_toneladas ?? 0
  const totalCajas = kpis.total_cajas ?? 0
  const cumplimientoPct = kpis.cumplimiento_meta_pct ?? 0
  const rentabilidadPct = kpis.margen_comercial_pct ?? 0

  const clients = (data?.topClientes || []).map((c) => {
    const val = Number(c.ventas_usd || 0)
    const pct = totalVentas > 0 ? ((val / totalVentas) * 100).toFixed(1) : '0.0'
    return {
      name: c.cliente,
      pais: c.pais,
      toneladas: Number(c.toneladas || 0).toFixed(1),
      sales: `USD ${Math.round(val).toLocaleString('es-PE')}`,
      share: `${pct}%`,
    }
  })

  const alerts = (data?.alertas || []).map((al) => ({
    id: al.id_alerta,
    severity:
      al.severidad === 'CRITICA' || al.severidad === 'ALTA'
        ? 'WARN'
        : al.severidad === 'MEDIA'
          ? 'INFO'
          : 'OK',
    title: al.titulo,
    timeLabel: new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(al.fecha_generacion)),
  }))

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-xl bg-white border border-slate-200/80 shadow-xs px-5 py-4">
        <h1 className="text-lg sm:text-xl font-bold text-[#0d1f3c]">
          Ventas y Comercial
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Seguimiento consolidado de ventas, volumen comercializado, metas,
          destinos y rentabilidad
        </p>
      </div>

      {/* Row 1: 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 text-emerald-700 font-bold text-lg">
            $
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-600">Ventas Totales</p>
            <p className="text-xl font-extrabold text-[#0d1f3c] mt-0.5">
              USD {Math.round(totalVentas).toLocaleString('es-PE')}
            </p>
            <p className="mt-1 text-xs font-semibold text-emerald-600">
              {kpis.clientes_activos ?? 0} clientes activos
            </p>
          </div>
        </section>

        <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-sky-50 flex items-center justify-center shrink-0 text-[#0b63d6] font-bold text-sm">
            TN
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-600">
              Volumen Comercializado
            </p>
            <p className="text-xl font-extrabold text-[#0d1f3c] mt-0.5">
              {totalToneladas} tn
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {totalCajas.toLocaleString('es-PE')} cajas despachadas
            </p>
          </div>
        </section>

        <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 text-emerald-600 font-bold text-lg">
            ✓
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-600">
              Cumplimiento de Metas
            </p>
            <p className="text-xl font-extrabold text-[#0d1f3c] mt-0.5">
              {cumplimientoPct}%
            </p>
            <p className="mt-1 text-xs font-semibold text-emerald-600">
              Meta: USD {(kpis.meta_comercial_usd || 0).toLocaleString('es-PE')}
            </p>
          </div>
        </section>

        <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center shrink-0 text-amber-600 font-bold text-lg">
            %
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-600">
              Rentabilidad Comercial
            </p>
            <p className="text-xl font-extrabold text-[#0d1f3c] mt-0.5">
              {rentabilidadPct}%
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Ticket prom: USD{' '}
              {Math.round(kpis.ticket_promedio || 0).toLocaleString('es-PE')}
            </p>
          </div>
        </section>
      </div>

      {/* Row 2: Evolución de Ventas + Ventas por Mercado/Destino */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <section className="lg:col-span-7 rounded-xl bg-white border border-slate-200/80 shadow-xs p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <h2 className="text-[16px] font-bold text-[#0d1f3c]">
              Evolución de Ventas
            </h2>
            <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-[#0b63d6]" />
                Ventas
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 border-t-2 border-dashed border-emerald-600" />
                Meta
              </span>
            </div>
          </div>
          <SalesEvolutionChart evolucion={data?.evolucion || []} />
        </section>

        <section className="lg:col-span-5 rounded-xl bg-white border border-slate-200/80 shadow-xs p-5 flex flex-col justify-between">
          <h2 className="text-[16px] font-bold text-[#0d1f3c] mb-3">
            Ventas por Mercado / Destino
          </h2>
          <DestinationDonutChart destinos={data?.destinos || []} />
        </section>
      </div>

      {/* Row 3: Ventas por Producto + Clientes Principales + Alertas Comerciales */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <section className="lg:col-span-4 rounded-xl bg-white border border-slate-200/80 shadow-xs p-5">
          <h2 className="text-[15px] font-bold text-[#0d1f3c] mb-3">
            Ventas por Producto
          </h2>
          <div className="space-y-2.5">
            {(data?.productos || []).map((prod) => (
              <div
                key={prod.producto}
                className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2.5 text-xs"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 truncate">
                    {prod.producto}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {Number(prod.toneladas || 0).toFixed(1)} tn ·{' '}
                    {prod.cajas} cajas
                  </p>
                </div>
                <span className="font-bold text-[#0d1f3c] shrink-0">
                  USD {Math.round(Number(prod.importe_usd || 0)).toLocaleString('es-PE')}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="lg:col-span-4 rounded-xl bg-white border border-slate-200/80 shadow-xs p-5">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="text-[15px] font-bold text-[#0d1f3c]">
              Clientes Principales
            </h2>
            <button
              type="button"
              onClick={() => onNavigate?.('reportes')}
              className="text-xs font-semibold text-[#1565c0] hover:underline cursor-pointer"
            >
              Exportar →
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-2 pr-2">Cliente</th>
                  <th className="py-2 px-2">Importe</th>
                  <th className="py-2 pl-2 text-right">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clients.map((client) => (
                  <tr key={client.name} className="hover:bg-slate-50/70">
                    <td className="py-2 pr-2">
                      <p className="font-semibold text-slate-800">
                        {client.name}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {client.pais} · {client.toneladas} tn
                      </p>
                    </td>
                    <td className="py-2 px-2 font-semibold text-slate-700 whitespace-nowrap">
                      {client.sales}
                    </td>
                    <td className="py-2 pl-2 text-right font-bold text-[#0d1f3c]">
                      {client.share}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="lg:col-span-4 rounded-xl bg-white border border-slate-200/80 shadow-xs p-5">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="text-[15px] font-bold text-[#0d1f3c]">
              Alertas Comerciales
            </h2>
            <button
              type="button"
              onClick={() => onNavigate?.('jira')}
              className="text-xs font-semibold text-[#1565c0] hover:underline cursor-pointer"
            >
              Jira →
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {alerts.map((al) => (
              <div
                key={al.id}
                className="py-2.5 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`h-5 w-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                      al.severity === 'WARN'
                        ? 'bg-amber-400 text-white'
                        : al.severity === 'INFO'
                          ? 'bg-sky-500 text-white'
                          : 'bg-emerald-500 text-white'
                    }`}
                  >
                    {al.severity === 'WARN'
                      ? '▲'
                      : al.severity === 'INFO'
                        ? 'i'
                        : '✓'}
                  </span>
                  <span className="text-xs font-medium text-slate-700 truncate">
                    {al.title}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 shrink-0">
                  {al.timeLabel}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
