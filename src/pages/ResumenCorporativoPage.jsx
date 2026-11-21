import { useEffect, useState } from 'react'
import PageLoader from '../components/PageLoader'
import { apiFetch } from '../lib/api'

const PERIOD_COMPARISON = [
  {
    label: 'Ingresos',
    current: 2.85,
    previous: 2.53,
    delta: '+12.5%',
    positive: true,
    color: '#0b63d6',
  },
  {
    label: 'Gastos',
    current: 1.92,
    previous: 1.78,
    delta: '+7.9%',
    positive: false,
    color: '#f59e0b',
  },
  {
    label: 'Producción',
    current: 2.48,
    previous: 2.28,
    delta: '+8.8%',
    positive: true,
    color: '#16a34a',
  },
  {
    label: 'Ventas',
    current: 2.15,
    previous: 1.95,
    delta: '+10.2%',
    positive: true,
    color: '#0ea5e9',
  },
]

const AREA_COLORS = ['#0d6efd', '#16a34a', '#14b8a6', '#f59e0b', '#6366f1']

function PeriodComparisonChart() {
  const width = 560
  const height = 215
  const padLeft = 42
  const padRight = 18
  const padTop = 18
  const padBottom = 26
  const plotW = width - padLeft - padRight
  const plotH = height - padTop - padBottom

  const yTicks = [0, 1.0, 2.0, 3.0]
  const slotW = plotW / PERIOD_COMPARISON.length
  const barW = 28
  const gap = 8

  const getY = (val) => padTop + plotH - (val / 3.0) * plotH

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-52 overflow-visible"
      role="img"
      aria-label="Comparación entre períodos"
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
              className="fill-slate-400 text-[10.5px]"
            >
              {tick === 0 ? '0' : `${tick.toFixed(1)}M`}
            </text>
          </g>
        )
      })}

      {PERIOD_COMPARISON.map((item, idx) => {
        const centerX = padLeft + slotW * idx + slotW / 2
        const prevTop = getY(item.previous)
        const currTop = getY(item.current)
        return (
          <g key={item.label}>
            <rect
              x={centerX - barW - gap / 2}
              y={prevTop}
              width={barW}
              height={padTop + plotH - prevTop}
              rx="3"
              fill="#cbd5e1"
            >
              <title>{`${item.label} Período Anterior: ${item.previous}M`}</title>
            </rect>
            <rect
              x={centerX + gap / 2}
              y={currTop}
              width={barW}
              height={padTop + plotH - currTop}
              rx="3"
              fill={item.color}
            >
              <title>{`${item.label} Período Actual: ${item.current}M`}</title>
            </rect>
            <text
              x={centerX}
              y={height - 6}
              textAnchor="middle"
              className="fill-slate-600 text-[11px] font-medium"
            >
              {item.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function AreaResultsDonut({ areaDist }) {
  const total = areaDist.reduce((sum, a) => sum + Number(a.registros || 0), 0)
  const items =
    total > 0
      ? areaDist.map((a, idx) => ({
          name: a.area === 'Gestion Humana' ? 'Gestión Humana' : a.area,
          percent: Math.round((Number(a.registros) / total) * 100),
          color: AREA_COLORS[idx % AREA_COLORS.length],
        }))
      : [
          { name: 'Campo', percent: 22, color: '#0d6efd' },
          { name: 'Packing', percent: 20, color: '#16a34a' },
          { name: 'Gestión Humana', percent: 18, color: '#14b8a6' },
          { name: 'Comercial', percent: 24, color: '#f59e0b' },
          { name: 'Finanzas', percent: 16, color: '#6366f1' },
        ]

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
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-[#0d1f3c]">
            {total > 0 ? total : '100%'}
          </span>
          {total > 0 && (
            <span className="text-[10px] text-slate-500">Registros DW</span>
          )}
        </div>
      </div>

      <ul className="w-full space-y-2 text-xs sm:text-[13px]">
        {items.map((item) => (
          <li
            key={item.name}
            className="flex items-center justify-between gap-3"
          >
            <span className="flex items-center gap-2 text-slate-700 font-medium">
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              {item.name}
            </span>
            <span className="font-bold text-[#0d1f3c]">{item.percent}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function ResumenCorporativoPage({ onNavigate }) {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    apiFetch('/api/dashboard/resumen-corporativo')
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
    return <PageLoader message="Cargando Resumen Corporativo..." />
  }

  const ind = data?.indicadores || {}
  const eco = data?.ecosistema || {}
  const kpi1 = data?.kpiMigracion || {}

  const ingresosPen = ind.ingresosTotalesPen ?? 0
  const gastosPen = ind.gastosOperativosPen ?? 0
  const resultadoPen = ind.resultadoOperativoPen ?? 0
  const cumplimientoPct = ind.cumplimientoPresupuestal ?? 0
  const volumenTn = ind.volumenProduccionTn ?? 0

  const kpi1Pct =
    kpi1.porcentaje_migrado != null
      ? Math.round(Number(kpi1.porcentaje_migrado) * 10) / 10
      : 0
  const kpi2Pct = data?.disponibilidad ?? 0

  const lastUpdateStr =
    data?.ultimaCarga || data?.ultimaVerificacion
      ? new Intl.DateTimeFormat('es-PE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(new Date(data.ultimaCarga || data.ultimaVerificacion))
      : 'Sin registros recientes'

  const alerts = (data?.alertas || []).map((al) => ({
    id: al.id_alerta,
    tipo: al.tipo,
    severity: al.severidad,
    badge:
      al.severidad === 'CRITICA'
        ? 'Crítica'
        : al.severidad === 'ALTA'
          ? 'Alta'
          : al.severidad === 'MEDIA'
            ? 'Media'
            : 'Info',
    title: al.titulo,
    area: al.area || 'Plataforma',
    timeLabel: new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(al.fecha_generacion)),
  }))

  return (
    <div className="space-y-5">
      {/* Header: Propósito + Última actualización (Una sola versión de la verdad) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 rounded-xl bg-white border border-slate-200/80 shadow-xs px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold text-[#0d1f3c]">
              Resumen Corporativo · Una Sola Versión de la Verdad
            </h1>
            <span className="hidden sm:inline-flex items-center rounded-full bg-sky-50 border border-sky-200 px-2.5 py-0.5 text-[11px] font-semibold text-[#0b63d6]">
              Directorio y Gerencia General
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Visión global consolidada del negocio y del ecosistema Data Warehouse
          </p>
        </div>

        <div className="inline-flex items-center gap-2 self-start lg:self-auto rounded-lg bg-[#eaf7ef] border border-emerald-200 px-3.5 py-2 text-xs font-semibold text-emerald-800">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-600 shrink-0" />
          <span>Última carga correcta: {lastUpdateStr}</span>
        </div>
      </div>

      {/* Row 1: 5 Indicadores Corporativos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-4">
          <p className="text-xs font-medium text-slate-500">Ingresos Totales</p>
          <p className="text-lg sm:text-xl font-extrabold text-[#0d1f3c] mt-1">
            S/ {ingresosPen.toLocaleString('es-PE')}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-emerald-600">
            USD {Math.round(ind.ventasUsd || 0).toLocaleString('es-PE')} · Despachos
          </p>
        </section>

        <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-4">
          <p className="text-xs font-medium text-slate-500">
            Gastos Operativos
          </p>
          <p className="text-lg sm:text-xl font-extrabold text-[#0d1f3c] mt-1">
            S/ {Math.round(gastosPen).toLocaleString('es-PE')}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-slate-500">
            Presupuestado: S/ {Math.round(ind.presupuestoPen || 0).toLocaleString('es-PE')}
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
          <p className="mt-1 text-[11px] font-semibold text-emerald-600">
            Margen consolidado
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
            Ejecución vs Presupuesto
          </p>
        </section>

        <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-4">
          <p className="text-xs font-medium text-slate-500">
            Volumen Total Producción
          </p>
          <p className="text-lg sm:text-xl font-extrabold text-[#0d1f3c] mt-1">
            {volumenTn.toLocaleString('es-PE')} tn
          </p>
          <p className="mt-1 text-[11px] font-semibold text-emerald-600">
            Campo + Packing exportable
          </p>
        </section>
      </div>

      {/* Row 2: KPI 1, KPI 2 y Estado del Ecosistema de Datos */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* KPI 1 — Migración de Tableros */}
        <section className="lg:col-span-4 rounded-xl bg-white border border-slate-200/80 shadow-xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0b63d6]">
                KPI 1 · Migración de Tableros
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                  kpi1.estado_kpi === 'CUMPLIDO'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                {kpi1.estado_kpi || 'EN PROCESO'}
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-[#0d1f3c]">
                {kpi1Pct}%
              </span>
              <span className="text-xs text-slate-500">Meta: 100%</span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              {kpi1.dashboards_migrados ?? 0} de {kpi1.total_dashboards ?? 0}{' '}
              tableros gerenciales migrados al Data Warehouse unificado
            </p>
          </div>
          <div className="mt-4 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-[#0b63d6] rounded-full transition-all"
              style={{ width: `${Math.min(100, kpi1Pct)}%` }}
            />
          </div>
        </section>

        {/* KPI 2 — Disponibilidad */}
        <section className="lg:col-span-4 rounded-xl bg-white border border-slate-200/80 shadow-xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                KPI 2 · Disponibilidad
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                  kpi2Pct >= 99.5
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                {kpi2Pct >= 99.5 ? 'CUMPLIDO' : 'EN OBSERVACIÓN'}
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-[#0d1f3c]">
                {kpi2Pct}%
              </span>
              <span className="text-xs text-slate-500">Meta: ≥ 99.5%</span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Disponibilidad del servicio de dashboards corporativos
            </p>
          </div>
          <div className="mt-4 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-emerald-600 rounded-full transition-all"
              style={{ width: `${Math.min(100, kpi2Pct)}%` }}
            />
          </div>
        </section>

        {/* Estado del Ecosistema de Datos */}
        <section className="lg:col-span-4 rounded-xl bg-white border border-slate-200/80 shadow-xs p-5">
          <h2 className="text-sm font-bold text-[#0d1f3c] mb-3">
            Estado del Ecosistema de Datos
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
              <p className="text-[11px] text-slate-500">Fuentes conectadas</p>
              <p className="text-lg font-extrabold text-[#0d1f3c]">
                {eco.fuentesConectadas ?? 0}
                <span className="text-xs font-medium text-slate-400">
                  /{eco.fuentesTotal ?? 0}
                </span>
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
              <p className="text-[11px] text-slate-500">Flujos activos</p>
              <p className="text-lg font-extrabold text-emerald-700">
                {eco.flujosActivos ?? 0}
                <span className="text-xs font-medium text-slate-400">
                  /{eco.flujosTotal ?? 0}
                </span>
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
              <p className="text-[11px] text-slate-500">Procesos fallidos</p>
              <p className="text-lg font-extrabold text-red-600">
                {eco.procesosFallidos ?? 0}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
              <p className="text-[11px] text-slate-500">Alertas pendientes</p>
              <p className="text-lg font-extrabold text-amber-600">
                {eco.alertasPendientes ?? 0}
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Row 3: Comparación entre Períodos + Resultados por Área */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <section className="lg:col-span-7 rounded-xl bg-white border border-slate-200/80 shadow-xs p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h2 className="text-[16px] font-bold text-[#0d1f3c]">
                Comparación entre Períodos
              </h2>
              <p className="text-xs text-slate-500">
                Evolución respecto al período anterior
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-slate-300" />
                Anterior
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-[#0b63d6]" />
                Actual
              </span>
            </div>
          </div>

          <PeriodComparisonChart />

          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-slate-100">
            {PERIOD_COMPARISON.map((item) => (
              <div key={item.label} className="text-center">
                <p className="text-[11px] text-slate-500">{item.label}</p>
                <p
                  className={`text-xs font-bold ${
                    item.positive ? 'text-emerald-600' : 'text-amber-600'
                  }`}
                >
                  {item.delta}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="lg:col-span-5 rounded-xl bg-white border border-slate-200/80 shadow-xs p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-[16px] font-bold text-[#0d1f3c]">
              Consolidación DW por Área
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Distribución de registros unificados en el Data Warehouse
            </p>
          </div>
          <AreaResultsDonut areaDist={data?.areaDist || []} />
        </section>
      </div>

      {/* Row 4: Alertas Corporativas */}
      <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 text-[#0d1f3c] font-bold text-[15px]">
            <svg
              className="h-4 w-4 text-[#0d4ea6]"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2a6 6 0 0 0-6 6v3.586l-.707.707A1 1 0 0 0 6 14h12a1 1 0 0 0 .707-1.707L18 11.586V8a6 6 0 0 0-6-6Zm0 20a3 3 0 0 0 2.995-2.824L15 19h-6a3 3 0 0 0 2.824 2.995L12 22Z" />
            </svg>
            <h2>Alertas Corporativas e Incidencias</h2>
          </div>

          <button
            type="button"
            onClick={() => onNavigate?.('jira')}
            className="text-xs font-semibold text-[#1565c0] hover:underline cursor-pointer"
          >
            Ver tickets en Jira →
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {alerts.length === 0 ? (
            <p className="py-4 text-xs text-slate-500 text-center">
              No hay alertas corporativas pendientes.
            </p>
          ) : (
            alerts.map((al) => (
              <div
                key={al.id}
                className="py-2.5 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span
                    className={`h-5 w-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                      al.severity === 'CRITICA'
                        ? 'bg-red-500 text-white'
                        : al.severity === 'ALTA' || al.severity === 'MEDIA'
                          ? 'bg-amber-400 text-white'
                          : 'bg-sky-500 text-white'
                    }`}
                  >
                    {al.severity === 'CRITICA'
                      ? '!'
                      : al.severity === 'ALTA' || al.severity === 'MEDIA'
                        ? '▲'
                        : 'i'}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-[13px] font-medium text-slate-700 truncate">
                      {al.title}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {al.area} · {al.tipo}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-slate-400">{al.timeLabel}</span>
                  <span
                    className={`inline-flex items-center justify-center min-w-[58px] rounded-md px-2.5 py-0.5 text-[11px] font-semibold ${
                      al.severity === 'CRITICA'
                        ? 'bg-red-50 text-red-600 border border-red-200'
                        : al.severity === 'ALTA' || al.severity === 'MEDIA'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-sky-50 text-sky-700 border border-sky-200'
                    }`}
                  >
                    {al.badge}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
