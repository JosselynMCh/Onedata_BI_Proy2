import { useEffect, useState } from 'react'
import PageLoader from '../components/PageLoader'
import { apiFetch } from '../lib/api'

const DIST_COLORS = ['#0d6efd', '#10b981', '#f59e0b', '#6366f1', '#14b8a6']

function canViewSensitiveHrData(roles = []) {
  const allowed = [
    'ADMINISTRADOR',
    'DIRECTORIO',
    'GERENCIA_GENERAL',
    'RECLUTAMIENTO',
    'GERENTE_AREA',
  ]
  return roles.some((r) => allowed.includes(r))
}

function DistrictBarChart({ sedes }) {
  const rows =
    sedes.length > 0
      ? sedes
      : [
          { sede: 'Olmos', cantidad: 45 },
          { sede: 'Chiclayo', cantidad: 38 },
          { sede: 'Motupe', cantidad: 28 },
        ]

  const maxVal = Math.max(10, ...rows.map((r) => Number(r.cantidad || 0) * 1.2))
  const width = 540
  const height = 210
  const padLeft = 40
  const padRight = 20
  const padTop = 18
  const padBottom = 26
  const plotW = width - padLeft - padRight
  const plotH = height - padTop - padBottom

  const yTicks = [0, 0.5, 1].map((f) => Math.round(maxVal * f))
  const slotW = plotW / rows.length
  const barW = Math.min(44, slotW * 0.5)

  const getY = (val) => padTop + plotH - (val / maxVal) * plotH

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-52 overflow-visible"
      role="img"
      aria-label="Distribución de personal por distrito"
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
              {tick}
            </text>
          </g>
        )
      })}

      {rows.map((item, idx) => {
        const cx = padLeft + slotW * idx + slotW / 2
        const topY = getY(Number(item.cantidad || 0))
        const barH = padTop + plotH - topY
        return (
          <g key={item.sede}>
            <rect
              x={cx - barW / 2}
              y={topY}
              width={barW}
              height={barH}
              rx="4"
              fill="#23b26d"
            >
              <title>{`${item.sede}: ${item.cantidad} colaboradores`}</title>
            </rect>
            <text
              x={cx}
              y={height - 6}
              textAnchor="middle"
              className="fill-slate-600 text-[10.5px]"
            >
              {item.sede}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function SedeDonutChart({ sedes }) {
  const total = sedes.reduce((sum, s) => sum + Number(s.cantidad || 0), 0)
  const items =
    total > 0
      ? sedes.map((s, idx) => ({
          name: s.sede,
          percent: Math.round((Number(s.cantidad) / total) * 100),
          cantidad: s.cantidad,
          color: DIST_COLORS[idx % DIST_COLORS.length],
        }))
      : [{ name: 'Sin datos', percent: 100, cantidad: 0, color: '#cbd5e1' }]

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
          <span className="text-lg font-bold text-[#0d1f3c]">{total}</span>
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
            <span className="font-bold text-[#0d1f3c]">
              {item.cantidad} ({item.percent}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function GestionHumanaPage({ user, onNavigate }) {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    apiFetch('/api/dashboard/gestion-humana')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled && json?.ok) setData(json.data)
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
    return <PageLoader message="Cargando Gestión Humana..." />
  }

  const isAuthorized = canViewSensitiveHrData(user?.roles || [])
  const totalTrabajadores = data?.trabajadores?.total ?? 0
  const activos = data?.trabajadores?.activos ?? 0
  const tasaAsistencia = data?.asistencia?.tasa_asistencia ?? 0
  const rotacionPct = data?.rotacionPct ?? 0
  const costoPersonalPen = data?.costoPersonalPen ?? 0

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-white border border-slate-200/80 shadow-xs px-5 py-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-[#0d1f3c]">
            Gestión Humana · Talento y Asistencia
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Colaboradores, distribución territorial, asistencia, rotación,
            contrataciones y costos laborales
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-full bg-sky-50 border border-sky-200 px-3 py-1 text-[11px] font-semibold text-[#0b63d6]">
          Acceso según rol: {user?.roles?.[0] || 'USUARIO'}
        </span>
      </div>

      {/* Row 1: 5 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-4">
          <p className="text-xs font-medium text-slate-500">
            Total Trabajadores
          </p>
          <p className="text-xl font-extrabold text-[#0d1f3c] mt-1">
            {totalTrabajadores}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-emerald-600">
            {activos} activos
          </p>
        </section>

        <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-4">
          <p className="text-xs font-medium text-slate-500">Asistencia</p>
          <p className="text-xl font-extrabold text-[#0d1f3c] mt-1">
            {tasaAsistencia}%
          </p>
          <p className="mt-1 text-[11px] font-semibold text-slate-500">
            {data?.asistencia?.asistieron ?? 0} asistencias /{' '}
            {data?.asistencia?.inasistencias ?? 0} faltas
          </p>
        </section>

        <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-4">
          <p className="text-xs font-medium text-slate-500">
            Rotación de Personal
          </p>
          <p className="text-xl font-extrabold text-[#0d1f3c] mt-1">
            {rotacionPct}%
          </p>
          <p className="mt-1 text-[11px] font-semibold text-emerald-600">
            {data?.rendimiento?.hpw ?? 0} colaboradores HPW
          </p>
        </section>

        <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-4">
          <p className="text-xs font-medium text-slate-500">
            Procesos / Convocatorias
          </p>
          <p className="text-xl font-extrabold text-[#0d1f3c] mt-1">
            {data?.totalConvocatorias ?? 0}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-[#0b63d6]">
            Selección y reclutamiento
          </p>
        </section>

        <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-4">
          <p className="text-xs font-medium text-slate-500">
            Costos de Personal
          </p>
          {isAuthorized ? (
            <>
              <p className="text-xl font-extrabold text-[#0d1f3c] mt-1">
                S/ {Math.round(costoPersonalPen).toLocaleString('es-PE')}
              </p>
              <p className="mt-1 text-[11px] font-semibold text-slate-500">
                Ejecución presupuestal RR.HH.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-amber-700 mt-1.5">
                Restringido por rol
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Información sensible protegida
              </p>
            </>
          )}
        </section>
      </div>

      {/* Row 2: Distribución por Sede + Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <section className="lg:col-span-7 rounded-xl bg-white border border-slate-200/80 shadow-xs p-5">
          <h2 className="text-[16px] font-bold text-[#0d1f3c] mb-2">
            Distribución del Personal por Distrito / Sede
          </h2>
          <DistrictBarChart sedes={data?.distribucionSede || []} />
        </section>

        <section className="lg:col-span-5 rounded-xl bg-white border border-slate-200/80 shadow-xs p-5 flex flex-col justify-between">
          <h2 className="text-[16px] font-bold text-[#0d1f3c] mb-3">
            Participación por Sede
          </h2>
          <SedeDonutChart sedes={data?.distribucionSede || []} />
        </section>
      </div>

      {/* Row 3: Convocatorias + Alertas de Información */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <section className="lg:col-span-6 rounded-xl bg-white border border-slate-200/80 shadow-xs p-5">
          <h2 className="text-[15px] font-bold text-[#0d1f3c] mb-3">
            Estado de Procesos de Selección
          </h2>
          <div className="divide-y divide-slate-100">
            {(data?.convocatorias || []).map((c) => (
              <div
                key={c.estado}
                className="py-2.5 flex items-center justify-between gap-3 text-xs sm:text-[13px]"
              >
                <span className="font-medium text-slate-700">{c.estado}</span>
                <span className="font-bold text-[#0d1f3c]">{c.cantidad}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="lg:col-span-6 rounded-xl bg-white border border-slate-200/80 shadow-xs p-5">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="text-[15px] font-bold text-[#0d1f3c]">
              Alertas de Información de Personal
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
            {(data?.alertas || []).map((al) => (
              <div
                key={al.id_alerta}
                className="py-2.5 flex items-center justify-between gap-3 text-xs"
              >
                <span className="font-medium text-slate-700 truncate">
                  {al.titulo}
                </span>
                <span className="text-[11px] font-semibold text-amber-700 shrink-0">
                  {al.severidad}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
