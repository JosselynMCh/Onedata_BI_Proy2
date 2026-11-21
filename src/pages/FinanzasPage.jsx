import { useEffect, useState } from 'react'
import PageLoader from '../components/PageLoader'
import { apiFetch } from '../lib/api'

const MONTH_NAMES = {
  1: 'Ene',
  2: 'Feb',
  3: 'Mar',
  4: 'Abr',
  5: 'May',
  6: 'Jun',
  7: 'Jul',
  8: 'Ago',
  9: 'Sep',
  10: 'Oct',
  11: 'Nov',
  12: 'Dic',
}

const EXPENSE_COLORS = ['#f59e0b', '#84cc16', '#0ea5e9', '#6366f1', '#10b981']

function BudgetEvolutionChart({ rows }) {
  const items =
    rows.length > 0
      ? rows.map((r) => ({
          label: MONTH_NAMES[r.mes] || `M${r.mes}`,
          presup: Number(r.presupuestado || 0) / 1000,
          ejec: Number(r.ejecutado || 0) / 1000,
        }))
      : [
          { label: 'Ago', presup: 240, ejec: 231 },
          { label: 'Sep', presup: 575, ejec: 558 },
          { label: 'Oct', presup: 665, ejec: 654 },
          { label: 'Nov', presup: 717, ejec: 555 },
        ]

  const maxVal = Math.max(
    100,
    ...items.map((r) => Math.max(r.presup, r.ejec) * 1.15),
  )

  const width = 560
  const height = 220
  const padLeft = 48
  const padRight = 22
  const padTop = 18
  const padBottom = 26
  const plotW = width - padLeft - padRight
  const plotH = height - padTop - padBottom

  const yTicks = [0, 0.33, 0.66, 1].map((f) => Math.round(maxVal * f))

  const getX = (idx) =>
    items.length === 1
      ? padLeft + plotW / 2
      : padLeft + (idx / (items.length - 1)) * plotW
  const getY = (val) => padTop + plotH - (val / maxVal) * plotH

  const ejecPoints = items.map((v, i) => `${getX(i)},${getY(v.ejec)}`).join(' ')
  const presupPoints = items
    .map((v, i) => `${getX(i)},${getY(v.presup)}`)
    .join(' ')

  const areaPath = `M ${getX(0)},${padTop + plotH} ${items
    .map((v, i) => `L ${getX(i)},${getY(v.ejec)}`)
    .join(' ')} L ${getX(items.length - 1)},${padTop + plotH} Z`

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-56 overflow-visible"
      role="img"
      aria-label="Evolución financiera presupuesto vs ejecutado"
    >
      <defs>
        <linearGradient id="finAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0d6efd" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#0d6efd" stopOpacity="0.02" />
        </linearGradient>
      </defs>

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
              S/{tick}K
            </text>
          </g>
        )
      })}

      {items.map((item, idx) => (
        <text
          key={item.label}
          x={getX(idx)}
          y={height - 6}
          textAnchor="middle"
          className="fill-slate-500 text-[11px]"
        >
          {item.label}
        </text>
      ))}

      <path d={areaPath} fill="url(#finAreaGrad)" />

      <polyline
        fill="none"
        stroke="#16a34a"
        strokeWidth="2"
        strokeDasharray="5 4"
        points={presupPoints}
      />

      <polyline
        fill="none"
        stroke="#0d6efd"
        strokeWidth="2.2"
        points={ejecPoints}
      />

      {items.map((item, idx) => (
        <circle
          key={`e-${item.label}`}
          cx={getX(idx)}
          cy={getY(item.ejec)}
          r="3.8"
          fill="#0d6efd"
          stroke="#ffffff"
          strokeWidth="1.4"
        >
          <title>{`Ejecutado ${item.label}: S/ ${(item.ejec * 1000).toLocaleString('es-PE')}`}</title>
        </circle>
      ))}
    </svg>
  )
}

function CostByAreaPie({ conceptos }) {
  const total = conceptos.reduce((sum, c) => sum + Number(c.monto_pen || 0), 0)
  const items =
    total > 0
      ? conceptos.map((c, idx) => ({
          name: c.concepto === 'Gestion Humana' ? 'Gestión Humana' : c.concepto,
          percent: Math.round((Number(c.monto_pen) / total) * 100),
          monto: Number(c.monto_pen),
          color: EXPENSE_COLORS[idx % EXPENSE_COLORS.length],
        }))
      : [{ name: 'Sin datos', percent: 100, monto: 0, color: '#cbd5e1' }]

  const radius = 32
  const circumference = 2 * Math.PI * radius
  const slices = items.reduce(
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
      <div className="h-36 w-36 shrink-0 flex items-center justify-center">
        <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
          {slices.map((slice) => (
            <circle
              key={slice.name}
              cx="64"
              cy="64"
              r={radius}
              fill="transparent"
              stroke={slice.color}
              strokeWidth={radius * 2}
              strokeDasharray={`${slice.dash} ${circumference - slice.dash}`}
              strokeDashoffset={-slice.offset}
            />
          ))}
        </svg>
      </div>

      <ul className="w-full space-y-2.5 text-xs sm:text-[13px]">
        {items.map((item) => (
          <li
            key={item.name}
            className="flex items-center justify-between gap-2"
          >
            <span className="flex items-center gap-2 text-slate-700 font-medium">
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              {item.name}
            </span>
            <span className="font-bold text-[#0d1f3c]">
              {item.percent}% (S/ {Math.round(item.monto / 1000)}K)
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function FinanzasPage({ onNavigate }) {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    apiFetch('/api/dashboard/finanzas')
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
    return <PageLoader message="Cargando Finanzas..." />
  }

  const ingresosPen = data?.ingresosPen ?? 0
  const gastosPen = data?.totalCostosPen ?? 0
  const presupuestadoPen = data?.totalPresupuestadoPen ?? 0
  const resultadoPen = data?.resultadoOperativoPen ?? 0
  const cumplimientoPct = data?.cumplimientoPct ?? 0
  const desviacionPen = data?.desviacionPen ?? 0
  const desviacionPct = data?.desviacionPct ?? 0

  const alerts = (data?.alertas || []).map((al) => ({
    id: al.id_alerta,
    severity:
      al.severidad === 'CRITICA'
        ? 'CRITICA'
        : al.severidad === 'ALTA' || al.severidad === 'MEDIA'
          ? 'WARN'
          : 'INFO',
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
          Finanzas · Control Presupuestal
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Ingresos, costos por área, desviación presupuestal y alertas
          financieras sin duplicidad de fuentes
        </p>
      </div>

      {/* Row 1: 5 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-4">
          <p className="text-xs font-medium text-slate-500">Ingresos</p>
          <p className="text-lg sm:text-xl font-extrabold text-[#0d1f3c] mt-1">
            S/ {Math.round(ingresosPen).toLocaleString('es-PE')}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-emerald-600">
            USD {Math.round(data?.ventasUsd || 0).toLocaleString('es-PE')}
          </p>
        </section>

        <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-4">
          <p className="text-xs font-medium text-slate-500">Gastos y Costos</p>
          <p className="text-lg sm:text-xl font-extrabold text-[#0d1f3c] mt-1">
            S/ {Math.round(gastosPen).toLocaleString('es-PE')}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-slate-500">
            Presupuesto: S/ {Math.round(presupuestadoPen).toLocaleString('es-PE')}
          </p>
        </section>

        <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-4">
          <p className="text-xs font-medium text-slate-500">
            Resultado Operativo
          </p>
          <p
            className={`text-lg sm:text-xl font-extrabold mt-1 ${
              resultadoPen >= 0 ? 'text-emerald-700' : 'text-red-600'
            }`}
          >
            S/ {Math.round(resultadoPen).toLocaleString('es-PE')}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-slate-500">
            Ingresos - Gastos
          </p>
        </section>

        <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-4">
          <p className="text-xs font-medium text-slate-500">
            Cumplimiento Presupuestal
          </p>
          <p className="text-lg sm:text-xl font-extrabold text-[#0d1f3c] mt-1">
            {cumplimientoPct}%
          </p>
          <p className="mt-1 text-[11px] font-semibold text-[#0b63d6]">
            Ejecutado vs Planificado
          </p>
        </section>

        <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-4">
          <p className="text-xs font-medium text-slate-500">
            Desviación Presupuestal
          </p>
          <p
            className={`text-lg sm:text-xl font-extrabold mt-1 ${
              desviacionPen <= 0 ? 'text-emerald-700' : 'text-red-600'
            }`}
          >
            S/ {Math.round(desviacionPen).toLocaleString('es-PE')}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-slate-500">
            Variación: {desviacionPct}%
          </p>
        </section>
      </div>

      {/* Row 2: Evolución Financiera + Costos por Área */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <section className="lg:col-span-7 rounded-xl bg-white border border-slate-200/80 shadow-xs p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <h2 className="text-[16px] font-bold text-[#0d1f3c]">
              Evolución Financiera (Presupuesto vs Ejecutado)
            </h2>
            <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#0d6efd]" />
                Ejecutado
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3.5 border-t-2 border-dashed border-emerald-600" />
                Planificado
              </span>
            </div>
          </div>

          <BudgetEvolutionChart rows={data?.presupuestoPorMes || []} />
        </section>

        <section className="lg:col-span-5 rounded-xl bg-white border border-slate-200/80 shadow-xs p-5 flex flex-col justify-between">
          <h2 className="text-[16px] font-bold text-[#0d1f3c] mb-4">
            Costos por Área
          </h2>
          <CostByAreaPie conceptos={data?.costosPorConcepto || []} />
        </section>
      </div>

      {/* Row 3: Alertas Presupuestales */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <section className="lg:col-span-7 rounded-xl bg-white border border-slate-200/80 shadow-xs p-5">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="text-[15px] font-bold text-[#0d1f3c]">
              Alertas Presupuestales
            </h2>
            <button
              type="button"
              onClick={() => onNavigate?.('jira')}
              className="text-xs font-semibold text-[#1565c0] hover:underline cursor-pointer"
            >
              Ver en Jira →
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {alerts.map((al) => (
              <div
                key={al.id}
                className="py-2.5 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`h-5 w-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                      al.severity === 'CRITICA'
                        ? 'bg-red-500 text-white'
                        : al.severity === 'WARN'
                          ? 'bg-amber-400 text-white'
                          : 'bg-sky-500 text-white'
                    }`}
                  >
                    {al.severity === 'CRITICA'
                      ? '!'
                      : al.severity === 'WARN'
                        ? '▲'
                        : 'i'}
                  </span>
                  <span className="text-xs sm:text-[13px] font-medium text-slate-700 truncate">
                    {al.title}
                  </span>
                </div>
                <span className="text-xs text-slate-400 shrink-0">
                  {al.timeLabel}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="lg:col-span-5 rounded-xl bg-[#eaf7ef] border border-emerald-200/80 shadow-xs p-5 flex items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-emerald-600 flex items-center justify-center text-white text-lg font-bold shrink-0">
            ✓
          </div>
          <div>
            <p className="text-sm font-bold text-[#0d1f3c]">
              {(data?.cecosEnAlerta || []).length > 0
                ? `${data.cecosEnAlerta.length} centros de costo > 90% ejecución`
                : 'Presupuesto bajo control'}
            </p>
            <p className="text-xs text-slate-600 mt-0.5">
              Cumplimiento global: {cumplimientoPct}%
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
