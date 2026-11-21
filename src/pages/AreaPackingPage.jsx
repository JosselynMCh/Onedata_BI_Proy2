import { useEffect, useState } from 'react'
import PageLoader from '../components/PageLoader'
import { apiFetch } from '../lib/api'

export default function AreaPackingPage() {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [filterLinea, setFilterLinea] = useState('Todas')
  const [filterTurno, setFilterTurno] = useState('Todos')

  useEffect(() => {
    let cancelled = false
    apiFetch('/api/areas/packing')
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
    return <PageLoader message="Cargando Análisis de Packing..." />
  }

  const porLinea = data?.porLinea || []
  const trazabilidad = data?.trazabilidad || []
  const lineasOpt = ['Todas', ...porLinea.map((l) => l.linea)]
  const turnosOpt = ['Todos', ...new Set(trazabilidad.map((t) => t.turno))]

  const filteredTraz = trazabilidad.filter((t) => {
    const lOk = filterLinea === 'Todas' || t.linea === filterLinea
    const tOk = filterTurno === 'Todos' || t.turno === filterTurno
    return lOk && tOk
  })

  const maxLineTn = Math.max(
    1,
    ...porLinea.map((l) => Number(l.toneladas_ingresadas || 0)),
  )

  return (
    <div className="space-y-5">
      {/* Header + Filtros */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 rounded-xl bg-white border border-slate-200/80 shadow-xs px-5 py-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-[#0d1f3c]">
            Análisis por Área · Packing
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Volumen recibido de Campo, procesamiento por línea, mermas, calidad
            y trazabilidad de lotes
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:flex gap-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Línea de Packing
            </label>
            <select
              value={filterLinea}
              onChange={(e) => setFilterLinea(e.target.value)}
              className="w-full md:w-auto h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs sm:text-sm text-slate-700 focus:border-[#0b63d6] focus:outline-none"
            >
              {lineasOpt.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Turno
            </label>
            <select
              value={filterTurno}
              onChange={(e) => setFilterTurno(e.target.value)}
              className="w-full md:w-auto h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs sm:text-sm text-slate-700 focus:border-[#0b63d6] focus:outline-none"
            >
              {turnosOpt.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Row 1: 5 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-4">
          <p className="text-xs font-medium text-slate-500">
            Recibido de Campo
          </p>
          <p className="text-xl font-extrabold text-[#0d1f3c] mt-1">
            {data?.recibidoCampoTn ?? 0} tn
          </p>
          <p className="mt-1 text-[11px] font-semibold text-slate-500">
            Ingresado: {data?.toneladasProcesadas ?? 0} tn
          </p>
        </section>

        <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-4">
          <p className="text-xs font-medium text-slate-500">
            Volumen Empacado
          </p>
          <p className="text-xl font-extrabold text-[#0d1f3c] mt-1">
            {data?.toneladasExportables ?? 0} tn
          </p>
          <p className="mt-1 text-[11px] font-semibold text-emerald-600">
            {(data?.totalCajas ?? 0).toLocaleString('es-PE')} cajas
          </p>
        </section>

        <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-4">
          <p className="text-xs font-medium text-slate-500">
            Rendimiento Proceso
          </p>
          <p className="text-xl font-extrabold text-[#0d1f3c] mt-1">
            {data?.eficienciaPct ?? 0}%
          </p>
          <p className="mt-1 text-[11px] font-semibold text-[#0b63d6]">
            Exportable / Ingresado
          </p>
        </section>

        <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-4">
          <p className="text-xs font-medium text-slate-500">
            Rechazos y Mermas
          </p>
          <p className="text-xl font-extrabold text-amber-700 mt-1">
            {data?.toneladasDescarte ?? 0} tn
          </p>
          <p className="mt-1 text-[11px] font-semibold text-slate-500">
            {data?.mermaPct ?? 0}% descarte
          </p>
        </section>

        <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-4">
          <p className="text-xs font-medium text-slate-500">
            Calidad Inspección
          </p>
          <p className="text-xl font-extrabold text-emerald-700 mt-1">
            {data?.calidadPromedio ?? 0}%
          </p>
          <p className="mt-1 text-[11px] font-semibold text-slate-500">
            Cumplimiento especificaciones
          </p>
        </section>
      </div>

      {/* Row 2: Eficiencia por Línea + Sincronización y Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <section className="lg:col-span-7 rounded-xl bg-white border border-slate-200/80 shadow-xs p-5 space-y-4">
          <h2 className="text-[16px] font-bold text-[#0d1f3c]">
            Eficiencia y Capacidad por Línea de Packing
          </h2>
          <div className="space-y-3">
            {porLinea.map((l) => {
              const ing = Number(l.toneladas_ingresadas || 0)
              const exp = Number(l.toneladas_exportables || 0)
              const pct = Math.round((ing / maxLineTn) * 100)
              const eff = ing > 0 ? ((exp / ing) * 100).toFixed(1) : '0.0'
              return (
                <div key={l.id_linea} className="space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-slate-800">
                      {l.linea} ({l.capacidad_ton_hora || '—'} tn/h)
                    </span>
                    <span className="text-slate-600">
                      Exp: <b className="text-emerald-700">{exp.toFixed(1)} tn</b>{' '}
                      · Descarte: {Number(l.toneladas_descarte || 0).toFixed(1)} tn ·{' '}
                      <b>{eff}%</b>
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#0b63d6]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="lg:col-span-5 rounded-xl bg-white border border-slate-200/80 shadow-xs p-5 space-y-4">
          <h2 className="text-[16px] font-bold text-[#0d1f3c]">
            Sincronización y Alertas Packing
          </h2>
          <div className="space-y-2">
            {(data?.flujosSync || []).map((fl) => (
              <div
                key={fl.id_flujo}
                className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 flex items-center justify-between text-xs"
              >
                <span className="font-medium text-slate-700">{fl.flujo}</span>
                <span className="font-bold text-emerald-700">
                  {fl.estado_ultima_ejecucion || 'OK'}
                </span>
              </div>
            ))}
            {(data?.alertas || []).map((al) => (
              <div
                key={al.id_alerta}
                className="rounded-lg bg-amber-50/70 border border-amber-200/70 px-3 py-2 flex items-center justify-between text-xs"
              >
                <span className="font-medium text-slate-700 truncate">
                  {al.titulo}
                </span>
                <span className="font-bold text-amber-700 shrink-0">
                  {al.severidad}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Row 3: Trazabilidad Lote -> Proceso -> Producto Terminado */}
      <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-5">
        <h2 className="text-[15px] font-bold text-[#0d1f3c] mb-3">
          Trazabilidad de Lotes en Packing
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-[13px]">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                <th className="py-2 pr-3">Fecha</th>
                <th className="py-2 px-3">Línea</th>
                <th className="py-2 px-3">Turno</th>
                <th className="py-2 px-3">Lote Origen</th>
                <th className="py-2 px-3">Cultivo / Calibre</th>
                <th className="py-2 px-3 text-right">Ingresado</th>
                <th className="py-2 px-3 text-right">Exportable</th>
                <th className="py-2 pl-3 text-right">Cajas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTraz.map((row) => (
                <tr
                  key={row.id_produccion_packing}
                  className="hover:bg-slate-50/70"
                >
                  <td className="py-2 pr-3 text-slate-600 whitespace-nowrap">
                    {new Intl.DateTimeFormat('es-PE').format(
                      new Date(row.fecha_proceso),
                    )}
                  </td>
                  <td className="py-2 px-3 font-medium text-slate-800">
                    {row.linea}
                  </td>
                  <td className="py-2 px-3 text-slate-600">{row.turno}</td>
                  <td className="py-2 px-3 font-semibold text-[#0b63d6]">
                    {row.codigo_lote}
                  </td>
                  <td className="py-2 px-3 text-slate-700">
                    {row.cultivo} · {row.calibre}
                  </td>
                  <td className="py-2 px-3 text-right text-slate-600">
                    {Number(row.toneladas_ingresadas).toFixed(2)} tn
                  </td>
                  <td className="py-2 px-3 text-right font-bold text-emerald-700">
                    {Number(row.toneladas_exportables).toFixed(2)} tn
                  </td>
                  <td className="py-2 pl-3 text-right font-semibold text-[#0d1f3c]">
                    {row.cajas_producidas.toLocaleString('es-PE')}
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
