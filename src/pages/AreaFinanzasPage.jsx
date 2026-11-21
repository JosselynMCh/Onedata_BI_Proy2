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

export default function AreaFinanzasPage({ onNavigate }) {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [filterArea, setFilterArea] = useState('Todas')

  useEffect(() => {
    let cancelled = false
    apiFetch('/api/areas/finanzas')
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
    return <PageLoader message="Cargando Análisis de Finanzas..." />
  }

  const porArea = data?.porArea || []
  const porMes = data?.porMes || []
  const areasOpt = ['Todas', ...new Set(porArea.map((a) => a.area))]

  const filteredCecos = porArea.filter(
    (a) => filterArea === 'Todas' || a.area === filterArea,
  )

  return (
    <div className="space-y-5">
      {/* Header + Filtro */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 rounded-xl bg-white border border-slate-200/80 shadow-xs px-5 py-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-[#0d1f3c]">
            Análisis por Área · Finanzas
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Presupuesto por área/centro de costo, ejecución, desviaciones y
            conciliación con Comercial, Campo y Packing
          </p>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1">
            Área
          </label>
          <select
            value={filterArea}
            onChange={(e) => setFilterArea(e.target.value)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs sm:text-sm text-slate-700 focus:border-[#0b63d6] focus:outline-none"
          >
            {areasOpt.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 1: 5 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-4">
          <p className="text-xs font-medium text-slate-500">
            Presupuesto Aprobado
          </p>
          <p className="text-lg sm:text-xl font-extrabold text-[#0d1f3c] mt-1">
            S/ {Math.round(data?.totalPresupuestado || 0).toLocaleString('es-PE')}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-slate-500">
            Centros de costo activos
          </p>
        </section>

        <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-4">
          <p className="text-xs font-medium text-slate-500">
            Ejecución Presupuestal
          </p>
          <p className="text-lg sm:text-xl font-extrabold text-[#0d1f3c] mt-1">
            S/ {Math.round(data?.totalEjecutado || 0).toLocaleString('es-PE')}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-[#0b63d6]">
            {data?.cumplimientoPct ?? 0}% ejecutado
          </p>
        </section>

        <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-4">
          <p className="text-xs font-medium text-slate-500">Saldo Disponible</p>
          <p className="text-lg sm:text-xl font-extrabold text-emerald-700 mt-1">
            S/ {Math.round(data?.saldoDisponible || 0).toLocaleString('es-PE')}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-emerald-600">
            Por ejecutar
          </p>
        </section>

        <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-4">
          <p className="text-xs font-medium text-slate-500">Desviación</p>
          <p
            className={`text-lg sm:text-xl font-extrabold mt-1 ${
              (data?.desviacion || 0) <= 0 ? 'text-emerald-700' : 'text-red-600'
            }`}
          >
            S/ {Math.round(data?.desviacion || 0).toLocaleString('es-PE')}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-slate-500">
            Ejecutado - Planificado
          </p>
        </section>

        <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-4">
          <p className="text-xs font-medium text-slate-500">
            Ingresos Referenciales
          </p>
          <p className="text-lg sm:text-xl font-extrabold text-[#0d1f3c] mt-1">
            S/ {Math.round(data?.ingresosPen || 0).toLocaleString('es-PE')}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-slate-500">
            USD {Math.round(data?.ventasUsd || 0).toLocaleString('es-PE')}
          </p>
        </section>
      </div>

      {/* Row 2: Tabla de Presupuesto por Centro de Costo + Conciliación Inter-Áreas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <section className="lg:col-span-8 rounded-xl bg-white border border-slate-200/80 shadow-xs p-5">
          <h2 className="text-[15px] font-bold text-[#0d1f3c] mb-3">
            Presupuesto y Ejecución por Centro de Costo / Área
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-[13px]">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-2 pr-3">Código</th>
                  <th className="py-2 px-3">Centro de Costo</th>
                  <th className="py-2 px-3">Área</th>
                  <th className="py-2 px-3 text-right">Presupuestado</th>
                  <th className="py-2 px-3 text-right">Ejecutado</th>
                  <th className="py-2 pl-3 text-right">Cumpl.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCecos.map((c) => {
                  const p = Number(c.presupuestado || 0)
                  const e = Number(c.ejecutado || 0)
                  const pct = p > 0 ? ((e / p) * 100).toFixed(1) : '0.0'
                  return (
                    <tr key={c.codigo} className="hover:bg-slate-50/70">
                      <td className="py-2 pr-3 font-semibold text-[#0b63d6] whitespace-nowrap">
                        {c.codigo}
                      </td>
                      <td className="py-2 px-3 font-medium text-slate-800">
                        {c.ceco}
                      </td>
                      <td className="py-2 px-3 text-slate-600">{c.area}</td>
                      <td className="py-2 px-3 text-right text-slate-700 whitespace-nowrap">
                        S/ {Math.round(p).toLocaleString('es-PE')}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-[#0d1f3c] whitespace-nowrap">
                        S/ {Math.round(e).toLocaleString('es-PE')}
                      </td>
                      <td className="py-2 pl-3 text-right font-semibold text-emerald-700">
                        {pct}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="lg:col-span-4 rounded-xl bg-white border border-slate-200/80 shadow-xs p-5 space-y-4">
          <h2 className="text-[15px] font-bold text-[#0d1f3c]">
            Conciliación de Datos y Evolución
          </h2>

          <div className="space-y-2 text-xs">
            <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 flex justify-between">
              <span className="text-slate-600">Campo (Cosecha)</span>
              <span className="font-bold text-[#0d1f3c]">
                {data?.conciliacion?.campoTn ?? 0} tn
              </span>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 flex justify-between">
              <span className="text-slate-600">Packing (Exportable)</span>
              <span className="font-bold text-[#0d1f3c]">
                {data?.conciliacion?.packingTn ?? 0} tn
              </span>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 flex justify-between">
              <span className="text-slate-600">Comercial (Despachos)</span>
              <span className="font-bold text-[#0d1f3c]">
                USD {Math.round(data?.conciliacion?.ventasUsd || 0).toLocaleString('es-PE')}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-2">
            <p className="text-xs font-bold text-[#0d1f3c]">
              Evolución Mensual
            </p>
            {porMes.map((m) => (
              <div
                key={m.mes}
                className="flex items-center justify-between text-xs text-slate-600"
              >
                <span>{MONTH_NAMES[m.mes] || `Mes ${m.mes}`}</span>
                <span>
                  S/ {Math.round(Number(m.ejecutado)).toLocaleString('es-PE')} /{' '}
                  {Math.round(Number(m.presupuestado)).toLocaleString('es-PE')}
                </span>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => onNavigate?.('jira')}
            className="w-full rounded-lg border border-slate-200 py-2 text-xs font-semibold text-[#1565c0] hover:bg-slate-50 cursor-pointer"
          >
            Revisar alertas financieras en Jira →
          </button>
        </section>
      </div>
    </div>
  )
}
