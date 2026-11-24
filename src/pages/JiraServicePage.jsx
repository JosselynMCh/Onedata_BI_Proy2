import { useCallback, useEffect, useState } from 'react'
import PageLoader from '../components/PageLoader'
import { apiFetch } from '../lib/api'

function priorityBadgeClass(priority) {
  const p = (priority || '').toLowerCase()
  if (p.includes('crit') || p.includes('alta') || p.includes('high')) {
    return 'bg-red-50 text-red-600 border-red-200'
  }
  if (p.includes('med')) {
    return 'bg-amber-50 text-amber-700 border-amber-200'
  }
  return 'bg-sky-50 text-sky-700 border-sky-200'
}

export default function JiraServicePage() {
  const [tickets, setTickets] = useState([])
  const [stats, setStats] = useState({ total: 0, abiertos: 0, resueltos: 0 })
  const [jiraConfigured, setJiraConfigured] = useState(false)
  const [projectKey, setProjectKey] = useState(null)
  const [alertasSinTicket, setAlertasSinTicket] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newSeverity, setNewSeverity] = useState('MEDIA')
  const [selectedAlertId, setSelectedAlertId] = useState('')
  const [feedback, setFeedback] = useState(null)

  const loadTickets = useCallback(async () => {
    try {
      const res = await apiFetch('/api/jira/tickets')
      const json = res.ok ? await res.json() : null
      if (json?.ok) {
        setJiraConfigured(Boolean(json.data?.jiraConfigured))
        setProjectKey(json.data?.projectKey || null)
        setStats(json.data?.stats || { total: 0, abiertos: 0, resueltos: 0 })
        setTickets(json.data?.tickets || [])
        setAlertasSinTicket(json.data?.alertasSinTicket || [])
      }
    } catch {
      // handled silently
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void Promise.resolve().then(loadTickets)
  }, [loadTickets])

  const handleCreateTicket = async (e) => {
    e.preventDefault()
    if (!selectedAlertId && !newTitle.trim()) {
      setFeedback({
        type: 'error',
        message: 'Ingresa un título o selecciona una alerta pendiente.',
      })
      return
    }

    setFeedback(null)
    try {
      const res = await apiFetch('/api/jira/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_alerta: selectedAlertId || undefined,
          titulo: newTitle.trim(),
          mensaje: newDesc.trim(),
          severidad: newSeverity,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) {
        setFeedback({
          type: 'error',
          message: json.message || 'No se pudo crear el ticket.',
        })
        return
      }
      setNewTitle('')
      setNewDesc('')
      setSelectedAlertId('')
      setShowCreateForm(false)
      setFeedback({
        type: 'success',
        message: json.syncedWithJira
          ? `Ticket ${json.ticket.jira_issue_key} creado y sincronizado con Jira.`
          : 'Ticket registrado en One-Data BI (pendiente de sincronización con Jira).',
      })
      loadTickets()
    } catch {
      setFeedback({
        type: 'error',
        message: 'Error de conexión al crear el ticket.',
      })
    }
  }

  const handleStatusChange = async (idTicket, newStatus) => {
    try {
      const res = await apiFetch(`/api/jira/tickets/${idTicket}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado_ticket: newStatus }),
      })
      if (res.ok) {
        loadTickets()
      }
    } catch {
      // handled silently
    }
  }

  const handleSyncAll = async () => {
    setIsSyncing(true)
    setFeedback(null)
    try {
      const res = await apiFetch('/api/jira/sync', { method: 'POST' })
      const json = await res.json()
      setFeedback({
        type: res.ok && json.ok ? 'success' : 'error',
        message: json.message,
      })
      if (res.ok && json.ok) {
        loadTickets()
      }
    } catch {
      setFeedback({
        type: 'error',
        message: 'No se pudo conectar con el servidor para sincronizar.',
      })
    } finally {
      setIsSyncing(false)
    }
  }

  if (isLoading) {
    return <PageLoader message="Cargando Jira Service Management..." />
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-1 h-8 w-8 rounded-lg bg-[#0b63d6] flex items-center justify-center text-white shrink-0 shadow-xs">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3 4.5 10.5a1.5 1.5 0 0 0 0 2.12l4.88 4.88 2.62-2.62-3.31-3.32 5.94-5.94L12 3Zm7.5 7.5-4.88-4.88-2.62 2.62 3.31 3.32-5.94 5.94L12 20.12l7.5-7.5a1.5 1.5 0 0 0 0-2.12Z" />
            </svg>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-[#0d1f3c] leading-tight">
                Jira Service Management
              </h1>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${
                  jiraConfigured
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                {jiraConfigured
                  ? `Conectado (${projectKey})`
                  : 'Modo BD local (configura API Token Jira)'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Gestiona, crea y sincroniza tus incidencias con Jira Cloud
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleSyncAll}
            disabled={isSyncing}
            className="h-9 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3.5 text-xs sm:text-sm font-semibold text-[#0d1f3c] transition-colors cursor-pointer disabled:opacity-50"
          >
            <span>{isSyncing ? 'Sincronizando...' : '↻ Sincronizar Jira'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCreateForm((prev) => !prev)}
            className="h-9 inline-flex items-center gap-1.5 rounded-lg bg-[#0b5ed7] hover:bg-[#094db3] px-4 text-xs sm:text-sm font-semibold text-white shadow-xs transition-colors cursor-pointer"
          >
            <span>{showCreateForm ? 'Cerrar' : '+ Nuevo Ticket'}</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`rounded-lg px-4 py-2.5 text-xs sm:text-sm font-medium border ${
            feedback.type === 'error'
              ? 'bg-red-50 text-red-700 border-red-200'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {showCreateForm && (
        <form
          onSubmit={handleCreateTicket}
          className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-5 space-y-4"
        >
          <h2 className="text-sm font-bold text-[#0d1f3c]">
            Crear Nuevo Ticket en Jira Service Management
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs sm:text-sm">
            {alertasSinTicket.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Vincular alerta existente (opcional)
                </label>
                <select
                  value={selectedAlertId}
                  onChange={(e) => setSelectedAlertId(e.target.value)}
                  className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-slate-700 focus:border-[#0b63d6] focus:outline-none"
                >
                  <option value="">Nueva incidencia manual</option>
                  {alertasSinTicket.map((a) => (
                    <option key={a.id_alerta} value={a.id_alerta}>
                      [{a.severidad}] {a.titulo}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Resumen / Título
              </label>
              <input
                type="text"
                disabled={Boolean(selectedAlertId)}
                placeholder="Ej. Falla en flujo de Packing"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full h-9 rounded-lg border border-slate-200 px-3 text-slate-800 disabled:bg-slate-50 focus:border-[#0b63d6] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Prioridad / Severidad
              </label>
              <select
                disabled={Boolean(selectedAlertId)}
                value={newSeverity}
                onChange={(e) => setNewSeverity(e.target.value)}
                className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-slate-700 disabled:bg-slate-50 focus:border-[#0b63d6] focus:outline-none"
              >
                <option value="CRITICA">CRITICA</option>
                <option value="ALTA">ALTA</option>
                <option value="MEDIA">MEDIA</option>
                <option value="BAJA">BAJA</option>
              </select>
            </div>
          </div>

          {!selectedAlertId && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Descripción
              </label>
              <textarea
                rows={2}
                placeholder="Describe el detalle de la incidencia..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-3 text-xs sm:text-sm text-slate-800 focus:border-[#0b63d6] focus:outline-none"
              />
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded-lg bg-[#0b5ed7] hover:bg-[#094db3] px-4 py-2 text-xs sm:text-sm font-semibold text-white cursor-pointer"
            >
              Guardar y Enviar a Jira
            </button>
          </div>
        </form>
      )}

      {/* Row 1: 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
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
              Gestión activa
            </p>
          </div>
        </section>

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
            <span className="text-xs text-slate-500">
              Cambia el estado directamente en la tabla
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-[13px]">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-2.5 pr-3">Clave</th>
                  <th className="py-2.5 px-3">Resumen</th>
                  <th className="py-2.5 px-3">Prioridad</th>
                  <th className="py-2.5 px-3">Estado</th>
                  <th className="py-2.5 px-3">Sync</th>
                  <th className="py-2.5 pl-3 text-right">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.map((t) => {
                  const keyLabel = t.jira_issue_key || `ONEDATA-${t.id_ticket}`
                  return (
                    <tr key={t.id_ticket} className="hover:bg-slate-50/70">
                      <td className="py-3 pr-3 font-semibold whitespace-nowrap">
                        {t.url_ticket ? (
                          <a
                            href={t.url_ticket}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#0b63d6] hover:underline"
                          >
                            {keyLabel} ↗
                          </a>
                        ) : (
                          <span className="text-slate-700">{keyLabel}</span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-800">
                        {t.titulo}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${priorityBadgeClass(
                            t.severidad,
                          )}`}
                        >
                          ● {t.severidad}
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <select
                          value={t.estado_ticket || 'Abierto'}
                          onChange={(e) =>
                            handleStatusChange(t.id_ticket, e.target.value)
                          }
                          className="h-7 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-700 focus:border-[#0b63d6] focus:outline-none cursor-pointer"
                        >
                          <option value="Por hacer">Por hacer</option>
                          <option value="Abierto">Abierto</option>
                          <option value="En progreso">En progreso</option>
                          <option value="Resuelto">Resuelto</option>
                          <option value="Cerrado">Cerrado</option>
                        </select>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                            t.estado_sincronizacion === 'SINCRONIZADO'
                              ? 'bg-emerald-50 text-emerald-700'
                              : t.estado_sincronizacion === 'ERROR'
                                ? 'bg-red-50 text-red-600'
                                : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {t.estado_sincronizacion}
                        </span>
                      </td>
                      <td className="py-3 pl-3 text-right text-slate-600 whitespace-nowrap">
                        {new Intl.DateTimeFormat('es-PE').format(
                          new Date(t.fecha_creacion),
                        )}
                      </td>
                    </tr>
                  )
                })}
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
