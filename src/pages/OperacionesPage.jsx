import { useEffect, useState } from 'react'
import PageLoader from '../components/PageLoader'
import { apiFetch } from '../lib/api'

function PackingLineBarChart({ lines }) {
  const rows =
    lines.length > 0
      ? lines.map((l) => ({
          label: l.linea,
          ingresadas: Number(l.toneladas_ingresadas || 0),
          exportables: Number(l.toneladas_exportables || 0),
        }))
      : [
          { label: 'Línea 1', ingresadas: 40, exportables: 36 },
          { label: 'Línea 2', ingresadas: 35, exportables: 32 },
        ]

  const maxVal = Math.max(
    10,
    ...rows.map((r) => Math.max(r.ingresadas, r.exportables) * 1.2),
  )

  const width = 540
  const height = 215
  const padLeft = 42
  const padRight = 20
  const padTop = 18
  const padBottom = 26
  const plotW = width - padLeft - padRight
  const plotH = height - padTop - padBottom

  const yTicks = [0, 0.33, 0.66, 1].map((f) => Math.round(maxVal * f))
  const slotW = plotW / rows.length
  const barW = Math.min(42, slotW * 0.28)
  const gap = 8

  const getY = (val) => padTop + plotH - (val / maxVal) * plotH

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-52 overflow-visible"
      role="img"
      aria-label="Producción Packing ingresada vs exportable"
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
              {tick} tn
            </text>
          </g>
        )
      })}

      {rows.map((line, idx) => {
        const centerX = padLeft + slotW * idx + slotW / 2
        const ingTop = getY(line.ingresadas)
        const expTop = getY(line.exportables)
        return (
          <g key={line.label}>
            <rect
              x={centerX - barW - gap / 2}
              y={ingTop}
              width={barW}
              height={padTop + plotH - ingTop}
              rx="3"
              fill="#0b63d6"
            >
              <title>{`Ingresado ${line.label}: ${line.ingresadas.toFixed(1)} tn`}</title>
            </rect>
            <rect
              x={centerX + gap / 2}
              y={expTop}
              width={barW}
              height={padTop + plotH - expTop}
              rx="3"
              fill="#34c38f"
            >
              <title>{`Exportable ${line.label}: ${line.exportables.toFixed(1)} tn`}</title>
            </rect>
            <text
              x={centerX}
              y={height - 6}
              textAnchor="middle"
              className="fill-slate-600 text-[10.5px] font-medium"
            >
              {line.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export default function OperacionesPage({ onNavigate }) {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    apiFetch('/api/dashboard/operaciones')
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
    return <PageLoader message="Cargando Operaciones..." />
  }

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
          Operaciones · Campo y Packing
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Visión consolidada en toneladas (tn) de cosecha, procesamiento,
          mermas, tiempos y sincronización
        </p>
      </div>

      {/* Row 1: 5 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-4">
          <p className="text-xs font-medium text-slate-500">Producción Total</p>
          <p className="text-xl font-extrabold text-[#0d1f3c] mt-1">
            {data?.produccionTotalTn ?? 0} tn
          </p>
          <p className="mt-1 text-[11px] font-semibold text-emerald-600">
            Campo: {data?.tonCampo ?? 0} tn · Packing:{' '}
            {data?.tonPackingExportables ?? 0} tn
          </p>
        </section>

        <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-4">
          <p className="text-xs font-medium text-slate-500">
            Rendimiento de Campo
          </p>
          <p className="text-xl font-extrabold text-[#0d1f3c] mt-1">
            {data?.rendimientoCampoTonHa ?? 0} T/ha
          </p>
          <p className="mt-1 text-[11px] font-semibold text-emerald-600">
            Promedio por hectárea
          </p>
        </section>

        <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-4">
          <p className="text-xs font-medium text-slate-500">
            Eficiencia Packing
          </p>
          <p className="text-xl font-extrabold text-[#0d1f3c] mt-1">
            {data?.eficienciaPackingPct ?? 0}%
          </p>
          <p className="mt-1 text-[11px] font-semibold text-[#0b63d6]">
            {(data?.totalCajas ?? 0).toLocaleString('es-PE')} cajas empacadas
          </p>
        </section>

        <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-4">
          <p className="text-xs font-medium text-slate-500">
            Mermas y Rechazos
          </p>
          <p className="text-xl font-extrabold text-amber-700 mt-1">
            {data?.tonPackingDescarte ?? 0} tn ({data?.mermaPct ?? 0}%)
          </p>
          <p className="mt-1 text-[11px] font-semibold text-slate-500">
            Descarte en proceso
          </p>
        </section>

        <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-4">
          <p className="text-xs font-medium text-slate-500">
            Tiempo Promedio Flujos
          </p>
          <p className="text-xl font-extrabold text-[#0d1f3c] mt-1">
            {data?.duracionPromMin ?? 0} min
          </p>
          <p className="mt-1 text-[11px] font-semibold text-emerald-600">
            Calidad empaque: {data?.calidadPromedio ?? 0}%
          </p>
        </section>
      </div>

      {/* Row 2: Producción Packing por Línea + Estado de Sincronización */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <section className="lg:col-span-7 rounded-xl bg-white border border-slate-200/80 shadow-xs p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <h2 className="text-[16px] font-bold text-[#0d1f3c]">
              Producción de Packing por Línea (Ingresado vs Exportable)
            </h2>
            <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-[#0b63d6]" />
                Ingresado (tn)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-[#34c38f]" />
                Exportable (tn)
              </span>
            </div>
          </div>

          <PackingLineBarChart lines={data?.packingPorLinea || []} />
        </section>

        <section className="lg:col-span-5 rounded-xl bg-white border border-slate-200/80 shadow-xs p-5">
          <h2 className="text-[16px] font-bold text-[#0d1f3c] mb-3">
            Estado de Sincronización Operativa
          </h2>
          <div className="divide-y divide-slate-100">
            {(data?.flujosSync || []).map((fl) => (
              <div
                key={fl.id_flujo}
                className="py-2.5 flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 truncate">
                    {fl.flujo}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {fl.area_origen} ·{' '}
                    {fl.ultima_ejecucion
                      ? new Intl.DateTimeFormat('es-PE', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        }).format(new Date(fl.ultima_ejecucion))
                      : 'Sin ejecución'}
                  </p>
                </div>
                <span
                  className={`rounded-md px-2.5 py-0.5 text-[11px] font-bold shrink-0 ${
                    fl.estado_ultima_ejecucion === 'EXITOSO'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {fl.estado_ultima_ejecucion || 'OK'}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Row 3: Alertas Operativas */}
      <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-5">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-[15px] font-bold text-[#0d1f3c]">
            Alertas Operativas
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
    </div>
  )
}
