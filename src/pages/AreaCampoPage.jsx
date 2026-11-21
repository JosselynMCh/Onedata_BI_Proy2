import { useEffect, useState } from 'react'
import PageLoader from '../components/PageLoader'
import ProductionGoogleMap from '../components/ProductionGoogleMap'

const CROP_COLORS = ['#0d6efd', '#16a34a', '#f59e0b', '#7c3aed']

export default function AreaCampoPage() {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [filterCultivo, setFilterCultivo] = useState('Todos')
  const [filterFundo, setFilterFundo] = useState('Todos')

  useEffect(() => {
    let cancelled = false
    fetch('/api/areas/campo')
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
    return <PageLoader message="Cargando Análisis de Campo..." />
  }

  const lotes = data?.lotes || []
  const cosechasDetalle = data?.cosechasDetalle || []
  const cultivosList = ['Todos', ...new Set(lotes.map((l) => l.cultivo))]
  const fundosList = ['Todos', ...new Set(lotes.map((l) => l.fundo))]

  const filteredLotes = lotes.filter((l) => {
    const cOk = filterCultivo === 'Todos' || l.cultivo === filterCultivo
    const fOk = filterFundo === 'Todos' || l.fundo === filterFundo
    return cOk && fOk
  })

  const filteredCosechas = cosechasDetalle.filter((c) => {
    const cOk = filterCultivo === 'Todos' || c.cultivo === filterCultivo
    const fOk = filterFundo === 'Todos' || c.fundo === filterFundo
    return cOk && fOk
  })

  const porCultivo = data?.porCultivo || []
  const maxCultivoTn = Math.max(
    1,
    ...porCultivo.map((c) => Number(c.toneladas || 0)),
  )

  return (
    <div className="space-y-5">
      {/* Header + Filtros */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 rounded-xl bg-white border border-slate-200/80 shadow-xs px-5 py-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-[#0d1f3c]">
            Análisis por Área · Campo
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Campañas agrícolas, superficie, rendimiento por lote/cultivo,
            cosechas e incidencias
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:flex gap-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Fundo
            </label>
            <select
              value={filterFundo}
              onChange={(e) => setFilterFundo(e.target.value)}
              className="w-full md:w-auto h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs sm:text-sm text-slate-700 focus:border-[#0b63d6] focus:outline-none"
            >
              {fundosList.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Cultivo
            </label>
            <select
              value={filterCultivo}
              onChange={(e) => setFilterCultivo(e.target.value)}
              className="w-full md:w-auto h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs sm:text-sm text-slate-700 focus:border-[#0b63d6] focus:outline-none"
            >
              {cultivosList.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Row 1: 5 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-4">
          <p className="text-xs font-medium text-slate-500">
            Superficie Cultivada
          </p>
          <p className="text-xl font-extrabold text-[#0d1f3c] mt-1">
            {data?.totalHectareas ?? 0} ha
          </p>
          <p className="mt-1 text-[11px] font-semibold text-slate-500">
            Disponible: {data?.hectareasDisponibles ?? 0} ha
          </p>
        </section>

        <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-4">
          <p className="text-xs font-medium text-slate-500">
            Cosecha Total
          </p>
          <p className="text-xl font-extrabold text-[#0d1f3c] mt-1">
            {data?.totalToneladas ?? 0} tn
          </p>
          <p className="mt-1 text-[11px] font-semibold text-emerald-600">
            {(data?.totalJabas ?? 0).toLocaleString('es-PE')} jabas
          </p>
        </section>

        <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-4">
          <p className="text-xs font-medium text-slate-500">
            Rendimiento Agrícola
          </p>
          <p className="text-xl font-extrabold text-[#0d1f3c] mt-1">
            {data?.rendimientoTonHa ?? 0} T/ha
          </p>
          <p className="mt-1 text-[11px] font-semibold text-emerald-600">
            {data?.totalLotes ?? 0} lotes activos
          </p>
        </section>

        <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-4">
          <p className="text-xs font-medium text-slate-500">
            Avance de Cosecha
          </p>
          <p className="text-xl font-extrabold text-[#0d1f3c] mt-1">
            {data?.avanceCosechaPct ?? 0}%
          </p>
          <p className="mt-1 text-[11px] font-semibold text-[#0b63d6]">
            Lotes en etapa cosecha
          </p>
        </section>

        <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-4">
          <p className="text-xs font-medium text-slate-500">
            Incidencias de Campo
          </p>
          <p className="text-xl font-extrabold text-amber-700 mt-1">
            {data?.incidencias ?? 0}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-slate-500">
            {(data?.campanas || []).length} campañas registradas
          </p>
        </section>
      </div>

      {/* Row 2: Producción por Cultivo + Mapa Google Maps */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <section className="lg:col-span-6 rounded-xl bg-white border border-slate-200/80 shadow-xs p-5 space-y-4">
          <h2 className="text-[16px] font-bold text-[#0d1f3c]">
            Producción por Cultivo
          </h2>
          <div className="space-y-3">
            {porCultivo.map((c, idx) => {
              const tn = Number(c.toneladas || 0)
              const pct = Math.round((tn / maxCultivoTn) * 100)
              return (
                <div key={c.cultivo} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-slate-700 font-semibold">
                      {c.cultivo} ({Number(c.hectareas).toFixed(1)} ha)
                    </span>
                    <span className="text-[#0d1f3c] font-bold">
                      {tn.toFixed(1)} tn
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: CROP_COLORS[idx % CROP_COLORS.length],
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          <div className="pt-3 border-t border-slate-100">
            <h3 className="text-xs font-bold text-[#0d1f3c] mb-2">
              Campañas y Sincronización
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {(data?.campanas || []).slice(0, 2).map((cam) => (
                <div
                  key={cam.id_periodo}
                  className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2"
                >
                  <p className="font-semibold text-slate-800">{cam.nombre}</p>
                  <p className="text-[11px] text-slate-500">
                    {cam.campana || 'Campaña agrícola'}
                  </p>
                </div>
              ))}
              {(data?.flujosSync || []).map((fl) => (
                <div
                  key={fl.id_flujo}
                  className="rounded-lg bg-emerald-50/70 border border-emerald-100 px-3 py-2 flex items-center justify-between"
                >
                  <span className="font-medium text-slate-700 truncate">
                    {fl.flujo}
                  </span>
                  <span className="text-[11px] font-bold text-emerald-700">
                    {fl.estado_ultima_ejecucion || 'OK'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="lg:col-span-6 rounded-xl bg-white border border-slate-200/80 shadow-xs p-5 flex flex-col">
          <h2 className="text-[16px] font-bold text-[#0d1f3c] mb-3">
            Mapa de Producción (Google Maps)
          </h2>
          <ProductionGoogleMap lotes={filteredLotes} />
        </section>
      </div>

      {/* Row 3: Tabla Detallada de Cosechas por Lote */}
      <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-5">
        <h2 className="text-[15px] font-bold text-[#0d1f3c] mb-3">
          Registro Detallado de Cosechas por Lote
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-[13px]">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                <th className="py-2 pr-3">Fecha</th>
                <th className="py-2 px-3">Turno</th>
                <th className="py-2 px-3">Lote</th>
                <th className="py-2 px-3">Fundo</th>
                <th className="py-2 px-3">Cultivo</th>
                <th className="py-2 px-3 text-right">Jabas</th>
                <th className="py-2 pl-3 text-right">Cosechado (tn)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCosechas.map((row) => (
                <tr key={row.id_cosecha} className="hover:bg-slate-50/70">
                  <td className="py-2 pr-3 text-slate-600 whitespace-nowrap">
                    {new Intl.DateTimeFormat('es-PE').format(
                      new Date(row.fecha_cosecha),
                    )}
                  </td>
                  <td className="py-2 px-3 text-slate-600">{row.turno}</td>
                  <td className="py-2 px-3 font-semibold text-[#0d1f3c]">
                    {row.codigo_lote}
                  </td>
                  <td className="py-2 px-3 text-slate-700">{row.fundo}</td>
                  <td className="py-2 px-3 text-slate-700">{row.cultivo}</td>
                  <td className="py-2 px-3 text-right text-slate-600">
                    {row.jabas_recolectadas ?? 0}
                  </td>
                  <td className="py-2 pl-3 text-right font-bold text-emerald-700">
                    {Number(row.toneladas_cosechadas).toFixed(2)} tn
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
