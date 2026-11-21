import { useEffect, useState } from 'react'
import PageLoader from '../components/PageLoader'

const FALLBACK_TICKETS = [
  {
    key: 'ODBI-1234',
    summary: 'Caída de dashboards',
    priority: 'Alta',
    status: 'En proceso',
    date: '24/04/2025',
  },
  {
    key: 'ODBI-1235',
    summary: 'Error en reporte ventas',
    priority: 'Media',
    status: 'Resuelto',
    date: '23/04/2025',
  },
  {
    key: 'ODBI-1236',
    summary: 'Solicitud de nuevo acceso',
    priority: 'Baja',
    status: 'Asignado',
    date: '22/04/2025',
  },
]

function priorityBadgeClass(priority) {
  const p = (priority || '').toLowerCase()
  if (p.includes('alta') || p.includes('high') || p.includes('crit')) {
    return 'bg-red-50 text-red-600 border-red-200'
  }
  if (p.includes('media') || p.includes('med')) {
    return 'bg-amber-50 text-amber-700 border-amber-200'
  }
  return 'bg-sky-50 text-sky-700 border-sky-200'
}

function statusBadgeClass(status) {
  const s = (status || '').toLowerCase()
  if (s.includes('resuelto') || s.includes('done') || s.includes('cerrado')) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  }
  if (s.includes('asignado') || s.includes('todo')) {
    return 'bg-violet-50 text-violet-700 border-violet-200'
  }
  return 'bg-sky-50 text-[#0b63d6] border-sky-200'
}

export default function JiraServicePage() {
  const [tickets, setTickets] = useState(FALLBACK_TICKETS)
  const [stats, setStats] = useState({ total: 0, abiertos: 0, resueltos: 0 })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch('/api/jira/tickets')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled && json?.ok) {
          if (json.data?.stats) {
            setStats(json.data.stats)
          }
          if (json.data?.tickets?.length > 0) {
            setTickets(
              json.data.tickets.map((t) => ({
                key: t.jira_issue_key || `ONEDATA-${t.id_ticket}`,
                summary: t.titulo || 'Incidencia registrada',
                priority: t.severidad || 'MEDIA',
                status: t.estado_ticket || t.estado_sincronizacion || 'Pendiente',
                date: new Intl.DateTimeFormat('es-PE', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                }).format(new Date(t.fecha_creacion)),
              })),
            )
          }
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
    return <PageLoader message="Cargando Jira Service Management..." />
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="mt-1 h-8 w-8 rounded-lg bg-[#0b63d6] flex items-center justify-center text-white shrink-0 shadow-xs">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3 4.5 10.5a1.5 1.5 0 0 0 0 2.12l4.88 4.88 2.62-2.62-3.31-3.32 5.94-5.94L12 3Zm7.5 7.5-4.88-4.88-2.62 2.62 3.31 3.32-5.94 5.94L12 20.12l7.5-7.5a1.5 1.5 0 0 0 0-2.12Z" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0d1f3c] leading-tight">
            Jira Service Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Gestiona y da seguimiento a tus incidencias
          </p>
        </div>
      </div>

      {/* Row 1: 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {/* Tickets Abiertos */}
        <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-5 flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-sky-50 flex items-center justify-center shrink-0">
            <svg
              className="h-7 w-7 text-[#0b63d6]"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M20 6h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2Zm-6 0h-4V4h4v2Z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-600">
              Tickets Abiertos
            </p>
            <p className="text-xl sm:text-2xl font-extrabold text-[#0d1f3c] mt-0.5 leading-tight">
              {stats.abiertos}
            </p>
            <p className="mt-1 text-xs font-bold text-red-500">
              De {stats.total} registrados
            </p>
          </div>
        </section>

        {/* Tickets Resueltos */}
        <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-5 flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
            <svg
              className="h-7 w-7 text-emerald-600"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17Z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-600">
              Tickets Resueltos
            </p>
            <p className="text-xl sm:text-2xl font-extrabold text-[#0d1f3c] mt-0.5 leading-tight">
              {stats.resueltos}
            </p>
            <p className="mt-1 text-xs font-bold text-emerald-600">
              Sincronizado con Jira
            </p>
          </div>
        </section>

        {/* Tiempo Promedio */}
        <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-5 flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
            <svg
              className="h-7 w-7 text-emerald-700"
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
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-600">
              Tiempo Promedio
            </p>
            <p className="text-xl sm:text-2xl font-extrabold text-[#0d1f3c] mt-0.5 leading-tight">
              2.4 h
            </p>
            <p className="mt-1 text-xs font-bold text-emerald-600">↓ 15%</p>
          </div>
        </section>

        {/* Cumplimiento SLA */}
        <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-5 flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
            <svg
              className="h-7 w-7 text-emerald-700"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="8" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-600">
              Cumplimiento SLA
            </p>
            <p className="text-xl sm:text-2xl font-extrabold text-[#0d1f3c] mt-0.5 leading-tight">
              98.2%
            </p>
            <p className="mt-1 text-xs font-bold text-emerald-600">↑ 0.3%</p>
          </div>
        </section>
      </div>

      {/* Row 2: Mis Tickets + Estado del Servicio */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <section className="lg:col-span-8 rounded-xl bg-white border border-slate-200/80 shadow-xs p-5">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h2 className="text-[16px] font-bold text-[#0d1f3c]">
              Mis Tickets
            </h2>
            <span className="text-xs font-semibold text-[#1565c0]">
              Ver todos →
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-[13px]">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-2.5 pr-4">Clave</th>
                  <th className="py-2.5 px-4">Resumen</th>
                  <th className="py-2.5 px-4">Prioridad</th>
                  <th className="py-2.5 px-4">Estado</th>
                  <th className="py-2.5 pl-4 text-right">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.map((ticket) => (
                  <tr key={ticket.key} className="hover:bg-slate-50/70">
                    <td className="py-3 pr-4 font-semibold text-slate-700 whitespace-nowrap">
                      {ticket.key}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {ticket.summary}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${priorityBadgeClass(
                          ticket.priority,
                        )}`}
                      >
                        ● {ticket.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusBadgeClass(
                          ticket.status,
                        )}`}
                      >
                        {ticket.status}
                      </span>
                    </td>
                    <td className="py-3 pl-4 text-right text-slate-600 whitespace-nowrap">
                      {ticket.date}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="lg:col-span-4 rounded-xl bg-white border border-slate-200/80 shadow-xs pt-5 px-5 pb-0 flex flex-col justify-between overflow-hidden">
          <h2 className="text-[16px] font-bold text-[#0d1f3c]">
            Estado del Servicio
          </h2>

          <div className="my-5 flex flex-col items-center text-center">
            <div className="h-14 w-14 rounded-full bg-emerald-600 flex items-center justify-center text-white text-2xl font-bold shadow-sm">
              ✓
            </div>
            <p className="mt-3 text-lg font-bold text-emerald-700">Operativo</p>
            <p className="mt-1 text-xs text-slate-500 max-w-[200px]">
              Todos los servicios funcionando correctamente.
            </p>
          </div>

          <div className="-mx-5 mt-2">
            <svg
              viewBox="0 0 320 46"
              className="w-full h-11 block"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="jiraUptimeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#16a34a" stopOpacity="0.24" />
                  <stop offset="100%" stopColor="#16a34a" stopOpacity="0.04" />
                </linearGradient>
              </defs>
              <path
                d="M0,24 L35,20 L70,22 L110,16 L150,24 L190,19 L230,26 L275,18 L320,14 L320,46 L0,46 Z"
                fill="url(#jiraUptimeGrad)"
              />
              <polyline
                fill="none"
                stroke="#16a34a"
                strokeWidth="2"
                points="0,24 35,20 70,22 110,16 150,24 190,19 230,26 275,18 320,14"
              />
            </svg>
          </div>
        </section>
      </div>
    </div>
  )
}
