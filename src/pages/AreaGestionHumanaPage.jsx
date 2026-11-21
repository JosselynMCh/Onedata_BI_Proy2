import { useEffect, useState } from 'react'
import PageLoader from '../components/PageLoader'
import { apiFetch } from '../lib/api'

export default function AreaGestionHumanaPage() {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [filterEstadoConv, setFilterEstadoConv] = useState('Todos')

  useEffect(() => {
    let cancelled = false
    apiFetch('/api/areas/gestion-humana')
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
    return <PageLoader message="Cargando Análisis de Gestión Humana..." />
  }

  const trab = data?.trabajadores || {}
  const asist = data?.asistencia || {}
  const rend = data?.rendimiento || {}
  const sedes = data?.distribucionSede || []
  const convocatorias = data?.convocatorias || []

  const estadosOpt = ['Todos', ...new Set(convocatorias.map((c) => c.estado))]
  const filteredConv = convocatorias.filter(
    (c) => filterEstadoConv === 'Todos' || c.estado === filterEstadoConv,
  )

  const maxSede = Math.max(1, ...sedes.map((s) => Number(s.cantidad || 0)))

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 rounded-xl bg-white border border-slate-200/80 shadow-xs px-5 py-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-[#0d1f3c]">
            Análisis por Área · Gestión Humana
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Personal por sede, asistencia diaria, rotación, desempeño HPW,
            costos laborales y calidad de datos
          </p>
        </div>

        <div className="w-full lg:w-auto">
          <label className="block text-[11px] font-medium text-slate-500 mb-1">
            Estado Convocatoria
          </label>
          <select
            value={filterEstadoConv}
            onChange={(e) => setFilterEstadoConv(e.target.value)}
            className="w-full lg:w-auto h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs sm:text-sm text-slate-700 focus:border-[#0b63d6] focus:outline-none"
          >
            {estadosOpt.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 1: 5 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-4">
          <p className="text-xs font-medium text-slate-500">
            Total Trabajadores
          </p>
          <p className="text-xl font-extrabold text-[#0d1f3c] mt-1">
            {trab.total ?? 0}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-emerald-600">
            {trab.activos ?? 0} activos · {trab.inactivos ?? 0} bajas
          </p>
        </section>

        <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-4">
          <p className="text-xs font-medium text-slate-500">
            Asistencia Diaria
          </p>
          <p className="text-xl font-extrabold text-[#0d1f3c] mt-1">
            {asist.asistio ?? 0} / {asist.total ?? 0}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-slate-500">
            {asist.inasistencia ?? 0} faltas · {asist.justificado ?? 0} justif.
          </p>
        </section>

        <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-4">
          <p className="text-xs font-medium text-slate-500">
            Rotación Laboral
          </p>
          <p className="text-xl font-extrabold text-[#0d1f3c] mt-1">
            {data?.rotacionPct ?? 0}%
          </p>
          <p className="mt-1 text-[11px] font-semibold text-emerald-600">
            Prom. días trabajados: {rend.avg_dias ?? 0}
          </p>
        </section>

        <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-4">
          <p className="text-xs font-medium text-slate-500">
            Desempeño HPW
          </p>
          <p className="text-xl font-extrabold text-[#0d1f3c] mt-1">
            {rend.hpw ?? 0} HPW
          </p>
          <p className="mt-1 text-[11px] font-semibold text-[#0b63d6]">
            Productividad prom: {rend.avg_prod ?? 0} pts
          </p>
        </section>

        <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-4">
          <p className="text-xs font-medium text-slate-500">
            Costos Laborales
          </p>
          <p className="text-xl font-extrabold text-[#0d1f3c] mt-1">
            S/ {Math.round(data?.costoPersonalPen || 0).toLocaleString('es-PE')}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-slate-500">
            Presupuesto ejecutado RR.HH.
          </p>
        </section>
      </div>

      {/* Row 2: Distribución por Sede + Calidad y Sincronización */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <section className="lg:col-span-7 rounded-xl bg-white border border-slate-200/80 shadow-xs p-5 space-y-3">
          <h2 className="text-[16px] font-bold text-[#0d1f3c]">
            Personal por Distrito / Sede
          </h2>
          {sedes.map((s) => (
            <div key={s.sede} className="space-y-1">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-700">{s.sede}</span>
                <span className="font-bold text-[#0d1f3c]">
                  {s.cantidad} colaboradores
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#23b26d]"
                  style={{
                    width: `${Math.round((Number(s.cantidad) / maxSede) * 100)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </section>

        <section className="lg:col-span-5 rounded-xl bg-white border border-slate-200/80 shadow-xs p-5 space-y-3">
          <h2 className="text-[16px] font-bold text-[#0d1f3c]">
            Calidad de Datos y Sincronización
          </h2>
          <div className="space-y-2 text-xs">
            <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 flex justify-between">
              <span className="text-slate-700 font-medium">
                Registros evaluados
              </span>
              <span className="font-bold text-[#0d1f3c]">
                {data?.calidadDatos?.evaluados ?? 0}
              </span>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 flex justify-between">
              <span className="text-slate-700 font-medium">
                Registros correctos / observados
              </span>
              <span className="font-bold text-[#0d1f3c]">
                {data?.calidadDatos?.correctos ?? 0} /{' '}
                {data?.calidadDatos?.observados ?? 0}
              </span>
            </div>
            {(data?.flujosSync || []).map((fl) => (
              <div
                key={fl.id_flujo}
                className="rounded-lg bg-emerald-50/70 border border-emerald-100 px-3 py-2 flex justify-between"
              >
                <span className="text-slate-700 font-medium">{fl.flujo}</span>
                <span className="font-bold text-emerald-700">
                  {fl.estado_ultima_ejecucion || 'OK'}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Row 3: Tabla de Convocatorias */}
      <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-5">
        <h2 className="text-[15px] font-bold text-[#0d1f3c] mb-3">
          Convocatorias y Contratación
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-[13px]">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                <th className="py-2 pr-3">Título</th>
                <th className="py-2 px-3">Campaña</th>
                <th className="py-2 px-3">Fecha Trabajo</th>
                <th className="py-2 px-3">Turno</th>
                <th className="py-2 px-3 text-right">Requeridos</th>
                <th className="py-2 pl-3 text-right">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredConv.map((c) => (
                <tr key={c.id_convocatoria} className="hover:bg-slate-50/70">
                  <td className="py-2 pr-3 font-semibold text-slate-800">
                    {c.titulo}
                  </td>
                  <td className="py-2 px-3 text-slate-600">
                    {c.campana || 'General'}
                  </td>
                  <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                    {new Intl.DateTimeFormat('es-PE').format(
                      new Date(c.fecha_trabajo),
                    )}
                  </td>
                  <td className="py-2 px-3 text-slate-600">{c.turno}</td>
                  <td className="py-2 px-3 text-right font-semibold text-[#0d1f3c]">
                    {c.trabajadores_requeridos}
                  </td>
                  <td className="py-2 pl-3 text-right">
                    <span className="rounded-full bg-sky-50 border border-sky-200 px-2.5 py-0.5 text-[11px] font-semibold text-[#0b63d6]">
                      {c.estado}
                    </span>
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
