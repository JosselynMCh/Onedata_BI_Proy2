import { useCallback, useEffect, useState } from 'react'
import PageLoader from '../components/PageLoader'
import { apiFetch } from '../lib/api'

const KPI_RANGES = {
  '7d': {
    labels: ['18 Abr', '19 Abr', '20 Abr', '21 Abr', '22 Abr', '23 Abr', '24 Abr'],
    migrated: [100, 100, 100, 100, 100, 100, 100],
    availability: [99.4, 99.6, 99.85, 99.7, 99.2, 99.75, 99.85],
  },
  '30d': {
    labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'],
    migrated: [92, 96, 100, 100],
    availability: [99.5, 99.6, 99.7, 99.8],
  },
  '90d': {
    labels: ['Feb', 'Mar', 'Abr'],
    migrated: [80, 95, 100],
    availability: [99.3, 99.6, 99.7],
  },
}

const SYNC_AREAS_FALLBACK = [
  { id: 1, nombre: 'Campo', time: '14:30', status: 'OK', icon: 'leaf' },
  { id: 2, nombre: 'Packing', time: '14:31', status: 'OK', icon: 'box' },
  {
    id: 3,
    nombre: 'Gestión Humana',
    time: '14:29',
    status: 'OK',
    icon: 'users',
  },
  { id: 4, nombre: 'Comercial', time: '14:30', status: 'OK', icon: 'cart' },
  { id: 5, nombre: 'Finanzas', time: '14:31', status: 'OK', icon: 'coins' },
]

const FALLBACK_ALERTS = [
  {
    id: 'a-1',
    severity: 'CRITICA',
    badge: 'Crítica',
    title: 'Falla en sincronización - Fuente Finanzas',
    timeLabel: 'Hace 15 min',
  },
  {
    id: 'a-2',
    severity: 'MEDIA',
    badge: 'Media',
    title: 'Datos incompletos en reporte de Ventas',
    timeLabel: 'Hace 1 h',
  },
  {
    id: 'a-3',
    severity: 'INFO',
    badge: 'Info',
    title: 'Carga de datos completada - Packing',
    timeLabel: 'Hace 2 h',
  },
]

function AreaRowIcon({ type }) {
  const cls = 'h-4 w-4'
  switch (type) {
    case 'leaf':
      return (
        <svg className={`${cls} text-emerald-600`} viewBox="0 0 24 24" fill="currentColor">
          <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8Z" />
        </svg>
      )
    case 'box':
      return (
        <svg
          className={`${cls} text-blue-600`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
          <path d="m3.3 7 8.7 5 8.7-5" />
          <path d="M12 22V12" />
        </svg>
      )
    case 'users':
      return (
        <svg
          className={`${cls} text-sky-600`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )
    case 'cart':
      return (
        <svg
          className={`${cls} text-indigo-600`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
      )
    case 'coins':
      return (
        <svg
          className={`${cls} text-amber-500`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="8" cy="8" r="6" />
          <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
          <path d="M7 6h1v4" />
        </svg>
      )
    default:
      return null
  }
}

function KpiEvolutionChart({ range }) {
  const dataset = KPI_RANGES[range]
  const width = 520
  const height = 190
  const padLeft = 42
  const padRight = 18
  const padTop = 16
  const padBottom = 26
  const plotW = width - padLeft - padRight
  const plotH = height - padTop - padBottom

  const minY = 97
  const maxY = 100
  const yTicks = [97, 98, 99, 100]

  const getX = (idx) =>
    dataset.labels.length === 1
      ? padLeft + plotW / 2
      : padLeft + (idx / (dataset.labels.length - 1)) * plotW

  const getY = (val) => {
    const clamped = Math.max(minY, Math.min(maxY, val))
    return padTop + plotH - ((clamped - minY) / (maxY - minY)) * plotH
  }

  const migratedPoints = dataset.migrated
    .map((v, i) => `${getX(i)},${getY(v)}`)
    .join(' ')
  const availPoints = dataset.availability
    .map((v, i) => `${getX(i)},${getY(v)}`)
    .join(' ')

  const availAreaPath = `M ${getX(0)},${padTop + plotH} ${dataset.availability
    .map((v, i) => `L ${getX(i)},${getY(v)}`)
    .join(' ')} L ${getX(dataset.availability.length - 1)},${padTop + plotH} Z`

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-48 overflow-visible"
      role="img"
      aria-label="Evolución de KPI"
    >
      <defs>
        <linearGradient id="availAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1677ff" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#1677ff" stopOpacity="0.02" />
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
              className="fill-slate-500 text-[10.5px]"
            >
              {tick}%
            </text>
          </g>
        )
      })}

      {dataset.labels.map((label, i) => (
        <text
          key={label}
          x={getX(i)}
          y={height - 6}
          textAnchor="middle"
          className="fill-slate-500 text-[10.5px]"
        >
          {label}
        </text>
      ))}

      <path d={availAreaPath} fill="url(#availAreaGrad)" />

      <polyline
        fill="none"
        stroke="#16a34a"
        strokeWidth="2"
        points={migratedPoints}
      />
      {dataset.migrated.map((v, i) => (
        <circle
          key={`m-${dataset.labels[i]}`}
          cx={getX(i)}
          cy={getY(v)}
          r="3.5"
          fill="#16a34a"
          stroke="#fff"
          strokeWidth="1.2"
        >
          <title>{`Tableros Migrados (${dataset.labels[i]}): ${v}%`}</title>
        </circle>
      ))}

      <polyline
        fill="none"
        stroke="#1677ff"
        strokeWidth="2"
        points={availPoints}
      />
      {dataset.availability.map((v, i) => (
        <circle
          key={`a-${dataset.labels[i]}`}
          cx={getX(i)}
          cy={getY(v)}
          r="3.5"
          fill="#1677ff"
          stroke="#fff"
          strokeWidth="1.2"
        >
          <title>{`Disponibilidad (${dataset.labels[i]}): ${v}%`}</title>
        </circle>
      ))}
    </svg>
  )
}

export default function DashboardEjecutivoPage({ onNavigate }) {
  const [dashboardData, setDashboardData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [kpiRange, setKpiRange] = useState('7d')

  const fetchDashboardData = useCallback(async () => {
    const res = await apiFetch('/api/dashboard/ejecutivo')
    if (!res.ok) return null
    const json = await res.json()
    return json.ok ? json.data : null
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchDashboardData()
      .then((data) => {
        if (!cancelled && data) {
          setDashboardData(data)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [fetchDashboardData])

  if (isLoading) {
    return <PageLoader message="Cargando Dashboard Ejecutivo..." />
  }

  const kpi1Percent =
    dashboardData?.kpiMigracion?.porcentaje_migrado != null
      ? `${Math.round(Number(dashboardData.kpiMigracion.porcentaje_migrado))}%`
      : '—'

  const kpi1Subtitle = dashboardData?.kpiMigracion
    ? `${dashboardData.kpiMigracion.dashboards_migrados} de ${dashboardData.kpiMigracion.total_dashboards} migrados · ${
        dashboardData.kpiMigracion.estado_kpi === 'CUMPLIDO'
          ? 'Objetivo cumplido'
          : 'En proceso'
      }`
    : 'Cargando...'

  const kpi2Num =
    dashboardData?.disponibilidadPromedio != null
      ? Number(dashboardData.disponibilidadPromedio)
      : 0

  const kpi2Status = kpi2Num >= 99.5 ? 'En objetivo' : 'Fuera de objetivo'

  const syncTime = dashboardData?.ultimaSincronizacion
    ? new Intl.DateTimeFormat('es-PE', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(new Date(dashboardData.ultimaSincronizacion))
    : '—'

  const iconOrder = ['leaf', 'box', 'users', 'cart', 'coins']
  const syncAreas =
    dashboardData?.syncAreas?.length > 0
      ? dashboardData.syncAreas.map((a, idx) => ({
          id: a.id_area,
          nombre: a.area === 'Gestion Humana' ? 'Gestión Humana' : a.area,
          time: a.ultima_ejecucion
            ? new Intl.DateTimeFormat('es-PE', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              }).format(new Date(a.ultima_ejecucion))
            : '—',
          status: a.con_alerta ? 'ALERTA' : 'OK',
          icon: iconOrder[idx % iconOrder.length],
        }))
      : SYNC_AREAS_FALLBACK

  const alerts =
    dashboardData?.alertas?.length > 0
      ? dashboardData.alertas.slice(0, 3).map((al) => ({
          id: al.id_alerta,
          severity: al.severidad,
          badge:
            al.severidad === 'CRITICA'
              ? 'Crítica'
              : al.severidad === 'ALTA' || al.severidad === 'MEDIA'
                ? 'Media'
                : 'Info',
          title: al.titulo,
          timeLabel: new Intl.DateTimeFormat('es-PE', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          }).format(new Date(al.fecha_generacion)),
        }))
      : FALLBACK_ALERTS

  return (
    <div className="relative space-y-5">
      {/* Subtle decorative curves in top-right matching reference */}
      <div className="pointer-events-none fixed top-14 right-0 w-96 h-40 overflow-hidden opacity-45 hidden lg:block">
        <svg viewBox="0 0 400 180" className="w-full h-full">
          <path
            d="M120,-20 C200,80 300,20 420,90 L420,-20 Z"
            fill="#d9f2e6"
          />
          <path
            d="M210,-20 C270,95 340,40 420,120 L420,-20 Z"
            fill="#dcebfa"
          />
        </svg>
      </div>

      {/* Row 1: 2 Large KPI Cards */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* KPI 1: Tableros Migrados */}
        <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs overflow-hidden flex flex-col justify-between">
          <div className="p-5 sm:p-6 flex items-center gap-5">
            <div className="h-14 w-14 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
              <svg
                className="h-7 w-7 text-emerald-600"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <rect x="4" y="13" width="3.5" height="7" rx="1" />
                <rect x="10.25" y="9" width="3.5" height="11" rx="1" />
                <rect x="16.5" y="4" width="3.5" height="16" rx="1" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">
                Tableros Migrados
              </p>
              <div className="mt-1 flex items-center gap-2.5">
                <span className="text-3xl sm:text-4xl font-extrabold text-[#0d1f3c] leading-none">
                  {kpi1Percent}
                </span>
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-bold">
                  ✓
                </span>
              </div>
              <p className="mt-1.5 text-xs font-medium text-slate-500">
                {kpi1Subtitle}
              </p>
            </div>
          </div>
          <div className="h-1.5 w-full bg-slate-100">
            <div className="h-full bg-emerald-600 w-full rounded-r-full" />
          </div>
        </section>

        {/* KPI 2: Disponibilidad del Servicio */}
        <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs overflow-hidden flex flex-col justify-between">
          <div className="p-5 sm:p-6 flex items-center gap-5">
            <div className="h-14 w-14 rounded-full bg-sky-50 flex items-center justify-center shrink-0">
              <svg
                className="h-7 w-7 text-[#1677ff]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="9" />
                <polyline points="12 7 12 12 15 14" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">
                Disponibilidad del Servicio
              </p>
              <div className="mt-1 flex items-center gap-2.5">
                <span className="text-3xl sm:text-4xl font-extrabold text-[#0d1f3c] leading-none">
                  {kpi2Num}%
                </span>
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-bold">
                  ✓
                </span>
              </div>
              <p className="mt-1.5 text-xs font-medium text-slate-500">
                ≥ 99.5% &nbsp;·&nbsp; {kpi2Status}
              </p>
            </div>
          </div>
          <div className="h-1.5 w-full bg-slate-100">
            <div
              className="h-full bg-[#0d6efd] rounded-r-full"
              style={{ width: `${Math.min(100, Math.max(0, kpi2Num))}%` }}
            />
          </div>
        </section>
      </div>

      {/* Row 2: Evolución de KPI & Estado de Sincronización */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Evolución de KPI */}
        <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[#0d1f3c] font-bold text-[15px]">
              <svg
                className="h-4 w-4 text-[#0d4ea6]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 17l6-6 4 4 8-8" />
                <path d="M17 7h4v4" />
              </svg>
              <h2>Evolución de KPI</h2>
            </div>

            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
              {[
                { key: '7d', label: '7 días' },
                { key: '30d', label: '30 días' },
                { key: '90d', label: '90 días' },
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setKpiRange(opt.key)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    kpiRange === opt.key
                      ? 'bg-[#0d6efd] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3">
            <KpiEvolutionChart range={kpiRange} />
          </div>

          <div className="mt-2 flex items-center justify-center gap-6 text-xs text-slate-600 font-medium">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
              Tableros Migrados
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#1677ff]" />
              Disponibilidad
            </span>
          </div>
        </section>

        {/* Estado de Sincronización */}
        <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-5">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 text-[#0d1f3c] font-bold text-[15px]">
              <svg
                className="h-4 w-4 text-[#0d4ea6]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                <path d="M16 16h5v5" />
              </svg>
              <h2>Estado de Sincronización</h2>
            </div>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-medium text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Actualizado: {syncTime}
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {syncAreas.map((area) => (
              <div
                key={area.id}
                className="py-2.5 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="h-7 w-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                    <AreaRowIcon type={area.icon} />
                  </div>
                  <span className="text-sm font-semibold text-slate-800 truncate">
                    {area.nombre}
                  </span>
                </div>

                <span className="text-xs text-slate-500 hidden sm:inline">
                  Última sincronización: {area.time}
                </span>

                <span className="inline-flex items-center justify-center rounded-md bg-emerald-50 border border-emerald-200 px-3 py-0.5 text-xs font-bold text-emerald-700">
                  {area.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Row 3: Alertas Recientes & Accesos Rápidos */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Alertas Recientes */}
        <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-5">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 text-[#0d1f3c] font-bold text-[15px]">
              <svg
                className="h-4 w-4 text-[#0d4ea6]"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2a6 6 0 0 0-6 6v3.586l-.707.707A1 1 0 0 0 6 14h12a1 1 0 0 0 .707-1.707L18 11.586V8a6 6 0 0 0-6-6Zm0 20a3 3 0 0 0 2.995-2.824L15 19h-6a3 3 0 0 0 2.824 2.995L12 22Z" />
              </svg>
              <h2>Alertas Recientes</h2>
            </div>

            <button
              type="button"
              onClick={() => onNavigate?.('alertas')}
              className="text-xs font-semibold text-[#1565c0] hover:underline cursor-pointer"
            >
              Ver todas →
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {alerts.map((al) => (
              <div
                key={al.id}
                className="py-2.5 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span
                    className={`h-5 w-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                      al.severity === 'CRITICA'
                        ? 'bg-red-500 text-white'
                        : al.severity === 'MEDIA' || al.severity === 'ALTA'
                          ? 'bg-amber-400 text-white'
                          : 'bg-sky-500 text-white'
                    }`}
                  >
                    {al.severity === 'CRITICA'
                      ? '!'
                      : al.severity === 'MEDIA' || al.severity === 'ALTA'
                        ? '▲'
                        : 'i'}
                  </span>
                  <span className="text-xs sm:text-[13px] font-medium text-slate-700 truncate">
                    {al.title}
                  </span>
                </div>

                <span className="text-xs text-slate-400 shrink-0 hidden sm:inline">
                  {al.timeLabel}
                </span>

                <span
                  className={`inline-flex items-center justify-center min-w-[54px] rounded-md px-2.5 py-0.5 text-[11px] font-semibold ${
                    al.severity === 'CRITICA'
                      ? 'bg-red-50 text-red-600 border border-red-200'
                      : al.severity === 'MEDIA' || al.severity === 'ALTA'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-sky-50 text-sky-700 border border-sky-200'
                  }`}
                >
                  {al.badge}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Accesos Rápidos */}
        <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-5">
          <div className="flex items-center gap-2 text-[#0d1f3c] font-bold text-[15px] mb-4">
            <svg
              className="h-4 w-4 text-[#0d4ea6]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            <h2>Accesos Rápidos</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                id: 'tableros-resumen',
                label: 'Ver Tableros Ejecutivos',
                icon: 'chart',
              },
              {
                id: 'reportes',
                label: 'Descargar Reportes',
                icon: 'doc',
              },
              {
                id: 'fuentes-datos',
                label: 'Gestionar Datos',
                icon: 'settings',
              },
              {
                id: 'soporte',
                label: 'Soporte',
                icon: 'support',
              },
            ].map((tile) => (
              <button
                key={tile.id}
                type="button"
                onClick={() => onNavigate?.(tile.id)}
                className="flex flex-col items-center justify-center gap-2.5 rounded-xl bg-[#f3f6fb] hover:bg-[#e5eef9] border border-slate-200/70 p-4 text-center transition-colors cursor-pointer"
              >
                <div className="text-[#0c4a9c]">
                  {tile.icon === 'chart' && (
                    <svg
                      className="h-6 w-6"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <rect x="4" y="12" width="3" height="8" rx="0.5" />
                      <rect x="10.5" y="6" width="3" height="14" rx="0.5" />
                      <rect x="17" y="9" width="3" height="11" rx="0.5" />
                    </svg>
                  )}
                  {tile.icon === 'doc' && (
                    <svg
                      className="h-6 w-6"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="9" y1="15" x2="15" y2="15" />
                      <line x1="9" y1="11" x2="13" y2="11" />
                    </svg>
                  )}
                  {tile.icon === 'settings' && (
                    <svg
                      className="h-6 w-6"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.77 1.04 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
                    </svg>
                  )}
                  {tile.icon === 'support' && (
                    <svg
                      className="h-6 w-6"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3Z" />
                      <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3Z" />
                    </svg>
                  )}
                </div>
                <span className="text-xs font-medium text-[#0d284d] leading-snug">
                  {tile.label}
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
