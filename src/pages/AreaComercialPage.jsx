import { useEffect, useState } from 'react'
import PageLoader from '../components/PageLoader'
import { apiFetch } from '../lib/api'

const MARKET_COLORS = ['#0d6efd', '#10b981', '#f59e0b', '#6366f1']

export default function AreaComercialPage() {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [filterPais, setFilterPais] = useState('Todos')
  const [filterEstado, setFilterEstado] = useState('Todos')

  useEffect(() => {
    let cancelled = false
    apiFetch('/api/areas/comercial')
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
    return <PageLoader message="Cargando Análisis Comercial..." />
  }

  const porProducto = data?.porProducto || []
  const porCliente = data?.porCliente || []
  const porMercado = data?.porMercado || []
  const ordenes = data?.ordenes || []

  const paisesOpt = ['Todos', ...porMercado.map((m) => m.destino)]
  const estadosOpt = ['Todos', ...new Set(ordenes.map((o) => o.estado))]

  const filteredClientes = porCliente.filter(
    (c) => filterPais === 'Todos' || c.pais === filterPais,
  )
  const filteredOrdenes = ordenes.filter((o) => {
    const eOk = filterEstado === 'Todos' || o.estado === filterEstado
    return eOk
  })

  const totalVentas = Number(data?.totalVentasUsd || 0)
  const maxProd = Math.max(1, ...porProducto.map((p) => Number(p.importe_usd || 0)))

  return (
    <div className="space-y-5">
      {/* Header + Filtros */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 rounded-xl bg-white border border-slate-200/80 shadow-xs px-5 py-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-[#0d1f3c]">
            Análisis por Área · Comercial
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Ventas por producto, precios promedio, concentración de clientes,
            mercados y órdenes de despacho
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:flex gap-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Mercado / País
            </label>
            <select
              value={filterPais}
              onChange={(e) => setFilterPais(e.target.value)}
              className="w-full md:w-auto h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs sm:text-sm text-slate-700 focus:border-[#0b63d6] focus:outline-none"
            >
              {paisesOpt.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Estado Despacho
            </label>
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="w-full md:w-auto h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs sm:text-sm text-slate-700 focus:border-[#0b63d6] focus:outline-none"
            >
              {estadosOpt.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Row 1: Ventas por Producto + Ventas por Mercado */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <section className="lg:col-span-7 rounded-xl bg-white border border-slate-200/80 shadow-xs p-5 space-y-3">
          <h2 className="text-[16px] font-bold text-[#0d1f3c]">
            Ventas y Precios Promedio por Producto
          </h2>
          {porProducto.map((p) => {
            const imp = Number(p.importe_usd || 0)
            const pct = Math.round((imp / maxProd) * 100)
            return (
              <div key={p.producto} className="space-y-1">
                <div className="flex flex-wrap justify-between gap-2 text-xs">
                  <span className="font-semibold text-slate-800">
                    {p.producto} ({Number(p.toneladas).toFixed(1)} tn ·{' '}
                    {p.cajas} cajas)
                  </span>
                  <span className="text-slate-600">
                    Prom: <b>USD {p.precio_prom}/kg</b> ·{' '}
                    <b className="text-[#0b63d6]">
                      USD {Math.round(imp).toLocaleString('es-PE')}
                    </b>
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
        </section>

        <section className="lg:col-span-5 rounded-xl bg-white border border-slate-200/80 shadow-xs p-5 space-y-3">
          <h2 className="text-[16px] font-bold text-[#0d1f3c]">
            Concentración por Mercado y Sincronización
          </h2>
          <div className="space-y-2.5">
            {porMercado.map((m, idx) => {
              const share =
                totalVentas > 0
                  ? Math.round((Number(m.importe_usd) / totalVentas) * 100)
                  : 0
              return (
                <div
                  key={m.destino}
                  className="flex items-center justify-between text-xs rounded-lg bg-slate-50 border border-slate-100 px-3 py-2"
                >
                  <span className="flex items-center gap-2 font-semibold text-slate-800">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{
                        backgroundColor:
                          MARKET_COLORS[idx % MARKET_COLORS.length],
                      }}
                    />
                    {m.destino} ({m.ordenes} órd.)
                  </span>
                  <span className="font-bold text-[#0d1f3c]">
                    USD {Math.round(Number(m.importe_usd)).toLocaleString('es-PE')}{' '}
                    ({share}%)
                  </span>
                </div>
              )
            })}
            {(data?.flujosSync || []).map((fl) => (
              <div
                key={fl.id_flujo}
                className="flex items-center justify-between text-xs rounded-lg bg-emerald-50/70 border border-emerald-100 px-3 py-2"
              >
                <span className="font-medium text-slate-700">{fl.flujo}</span>
                <span className="font-bold text-emerald-700">
                  {fl.estado_ultima_ejecucion || 'OK'}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Row 2: Clientes + Órdenes de Despacho */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <section className="lg:col-span-5 rounded-xl bg-white border border-slate-200/80 shadow-xs p-5">
          <h2 className="text-[15px] font-bold text-[#0d1f3c] mb-3">
            Ventas por Cliente
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-2 pr-2">Cliente</th>
                  <th className="py-2 px-2">País</th>
                  <th className="py-2 px-2 text-right">Vol. (tn)</th>
                  <th className="py-2 pl-2 text-right">Importe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredClientes.map((c) => (
                  <tr key={c.cliente} className="hover:bg-slate-50/70">
                    <td className="py-2 pr-2 font-semibold text-slate-800">
                      {c.cliente}
                    </td>
                    <td className="py-2 px-2 text-slate-600">{c.pais}</td>
                    <td className="py-2 px-2 text-right text-slate-600">
                      {Number(c.toneladas).toFixed(1)}
                    </td>
                    <td className="py-2 pl-2 text-right font-bold text-[#0d1f3c]">
                      USD {Math.round(Number(c.importe_usd)).toLocaleString('es-PE')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="lg:col-span-7 rounded-xl bg-white border border-slate-200/80 shadow-xs p-5">
          <h2 className="text-[15px] font-bold text-[#0d1f3c] mb-3">
            Órdenes de Despacho y Entregas
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-2 pr-2">Guía / Orden</th>
                  <th className="py-2 px-2">Cliente</th>
                  <th className="py-2 px-2">Destino</th>
                  <th className="py-2 px-2 text-right">Monto</th>
                  <th className="py-2 pl-2 text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrdenes.map((o) => (
                  <tr key={o.id_despacho} className="hover:bg-slate-50/70">
                    <td className="py-2 pr-2 font-semibold text-[#0b63d6] whitespace-nowrap">
                      {o.numero_guia_o_orden}
                    </td>
                    <td className="py-2 px-2 text-slate-800">{o.cliente}</td>
                    <td className="py-2 px-2 text-slate-600">
                      {o.puerto_o_destino || '—'}
                    </td>
                    <td className="py-2 px-2 text-right font-bold text-[#0d1f3c] whitespace-nowrap">
                      {o.moneda} {Number(o.monto_total).toLocaleString('es-PE')}
                    </td>
                    <td className="py-2 pl-2 text-right">
                      <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-700">
                        {o.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
