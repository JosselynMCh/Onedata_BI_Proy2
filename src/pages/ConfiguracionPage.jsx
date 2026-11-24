import { useCallback, useEffect, useMemo, useState } from 'react'
import PageLoader from '../components/PageLoader'
import { apiFetch } from '../lib/api'

const TABS = [
  { id: 'general', label: 'General' },
  { id: 'usuarios', label: 'Usuarios y Roles' },
  { id: 'fuentes', label: 'Fuentes de Datos' },
  { id: 'notificaciones', label: 'Notificaciones' },
  { id: 'seguridad', label: 'Seguridad' },
  { id: 'auditoria', label: 'Auditoría' },
]

function loadStoredJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback
  } catch {
    return fallback
  }
}

function formatDateTime(value) {
  if (!value) return 'Sin registro'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Sin registro'
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

function ToggleSwitch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
        checked ? 'bg-[#0b63d6]' : 'bg-slate-200'
      }`}
    >
      <span
        className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-xs transition-transform ${
          checked ? 'translate-x-5.5' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

export default function ConfiguracionPage({ initialTab = 'general' }) {
  const [activeTab, setActiveTab] = useState(initialTab)

  const initialPrefs = useMemo(
    () =>
      loadStoredJson('onedata_bi_prefs', {
        language: 'es',
        timezone: 'America/Lima',
        dateFormat: 'DD/MM/AAAA',
        timeFormat: 'HH:mm',
        autoRefresh: true,
        realtimeAlerts: true,
        darkMode: false,
      }),
    [],
  )

  const initialSecurity = useMemo(
    () =>
      loadStoredJson('onedata_bi_security', {
        sessionTimeoutMin: '60',
        maxLoginAttempts: '5',
        auditAllChanges: true,
        requireStrongPasswords: true,
      }),
    [],
  )

  const initialNotifPrefs = useMemo(
    () =>
      loadStoredJson('onedata_bi_notif_prefs', {
        criticalAlertsBanner: true,
        emailDigest: true,
        jiraAutoAlert: true,
      }),
    [],
  )

  const [autoRefresh, setAutoRefresh] = useState(initialPrefs.autoRefresh)
  const [realtimeAlerts, setRealtimeAlerts] = useState(
    initialPrefs.realtimeAlerts,
  )
  const [darkMode, setDarkMode] = useState(initialPrefs.darkMode)
  const [language, setLanguage] = useState(initialPrefs.language)
  const [timezone, setTimezone] = useState(initialPrefs.timezone)
  const [dateFormat, setDateFormat] = useState(initialPrefs.dateFormat)
  const [timeFormat, setTimeFormat] = useState(initialPrefs.timeFormat)

  const [securityPrefs, setSecurityPrefs] = useState(initialSecurity)
  const [notifPrefs, setNotifPrefs] = useState(initialNotifPrefs)

  const [showSystemDetails, setShowSystemDetails] = useState(false)
  const [toast, setToast] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  // Data states
  const [summary, setSummary] = useState(null)
  const [users, setUsers] = useState([])
  const [userSearch, setUserSearch] = useState('')
  const [fuentes, setFuentes] = useState([])
  const [syncingSourceId, setSyncingSourceId] = useState(null)
  const [alertsData, setAlertsData] = useState({
    alertas: [],
    stats: { total: 0, pendientes: 0, resueltas: 0, criticas: 0 },
  })
  const [auditData, setAuditData] = useState({
    registros: [],
    stats: { total: 0, hoy: 0, entidades: 0, usuarios: 0 },
    acciones: [],
  })
  const [auditSearch, setAuditSearch] = useState('')
  const [auditActionFilter, setAuditActionFilter] = useState('')

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }, [])

  const recordAudit = useCallback(async (accion, nombre_entidad, detalle) => {
    try {
      await apiFetch('/api/config/audit-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion, nombre_entidad, detalle }),
      })
    } catch {
      // non-blocking
    }
  }, [])

  const loadTabData = useCallback(async () => {
    setIsLoading(true)
    try {
      if (activeTab === 'general') {
        const res = await apiFetch('/api/config/resumen')
        const json = res.ok ? await res.json() : null
        if (json?.ok) setSummary(json.data)
      } else if (activeTab === 'usuarios') {
        const res = await apiFetch('/api/config/usuarios')
        const json = res.ok ? await res.json() : null
        if (json?.ok) setUsers(json.data)
      } else if (activeTab === 'fuentes') {
        const res = await apiFetch('/api/config/fuentes')
        const json = res.ok ? await res.json() : null
        if (json?.ok) setFuentes(json.data)
      } else if (activeTab === 'notificaciones') {
        const res = await apiFetch('/api/config/notificaciones')
        const json = res.ok ? await res.json() : null
        if (json?.ok) setAlertsData(json.data)
      } else if (activeTab === 'seguridad') {
        const res = await apiFetch('/api/config/resumen')
        const json = res.ok ? await res.json() : null
        if (json?.ok) setSummary(json.data)
      } else if (activeTab === 'auditoria') {
        const params = new URLSearchParams()
        if (auditSearch.trim()) params.set('q', auditSearch.trim())
        if (auditActionFilter) params.set('accion', auditActionFilter)
        const res = await apiFetch(`/api/config/auditoria?${params.toString()}`)
        const json = res.ok ? await res.json() : null
        if (json?.ok) setAuditData(json.data)
      }
    } catch {
      showToast('Error al cargar datos de configuración.', 'error')
    } finally {
      setIsLoading(false)
    }
  }, [activeTab, auditActionFilter, auditSearch, showToast])

  useEffect(() => {
    void Promise.resolve().then(loadTabData)
  }, [loadTabData])

  const handleSavePreferences = async () => {
    const payload = {
      language,
      timezone,
      dateFormat,
      timeFormat,
      autoRefresh,
      realtimeAlerts,
      darkMode,
    }
    localStorage.setItem('onedata_bi_prefs', JSON.stringify(payload))
    await recordAudit('ACTUALIZAR_PREFERENCIAS', 'configuracion_general', payload)
    showToast('Preferencias guardadas y registradas en auditoría.')
  }

  const handleToggleUserStatus = async (user) => {
    const nextActive = !user.esta_activo
    try {
      const res = await apiFetch(`/api/config/usuarios/${user.id_usuario}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ esta_activo: nextActive }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) {
        showToast(json.message || 'No se pudo actualizar el usuario.', 'error')
        return
      }
      setUsers((prev) =>
        prev.map((u) =>
          u.id_usuario === user.id_usuario
            ? { ...u, esta_activo: nextActive, estado: nextActive ? 'ACTIVO' : 'INACTIVO' }
            : u,
        ),
      )
      showToast(
        `Usuario ${user.nombres} ${nextActive ? 'activado' : 'desactivado'}.`,
      )
    } catch {
      showToast('Error de conexión al actualizar usuario.', 'error')
    }
  }

  const handleSyncSource = async (idFuente) => {
    setSyncingSourceId(idFuente)
    try {
      const res = await apiFetch(`/api/config/fuentes/${idFuente}/sync`, {
        method: 'POST',
      })
      const json = await res.json()
      if (!res.ok || !json.ok) {
        showToast(json.message || 'No se pudo sincronizar la fuente.', 'error')
        return
      }
      showToast(`Fuente "${json.data.nombre}" sincronizada correctamente.`)
      await loadTabData()
    } catch {
      showToast('Error de conexión al sincronizar fuente.', 'error')
    } finally {
      setSyncingSourceId(null)
    }
  }

  const handleToggleSourceStatus = async (fuente) => {
    const nextEstado = fuente.estado === 'ACTIVA' ? 'INACTIVA' : 'ACTIVA'
    try {
      const res = await apiFetch(`/api/config/fuentes/${fuente.id_fuente}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nextEstado }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) {
        showToast(json.message || 'Error al actualizar fuente.', 'error')
        return
      }
      showToast(`Fuente "${fuente.nombre}" marcada como ${nextEstado}.`)
      await loadTabData()
    } catch {
      showToast('Error de conexión al actualizar fuente.', 'error')
    }
  }

  const handleResolveAlert = async (idAlerta) => {
    try {
      const res = await apiFetch(`/api/config/notificaciones/${idAlerta}/resolver`, {
        method: 'PATCH',
      })
      const json = await res.json()
      if (!res.ok || !json.ok) {
        showToast(json.message || 'No se pudo resolver la alerta.', 'error')
        return
      }
      showToast('Alerta marcada como resuelta y auditada.')
      await loadTabData()
    } catch {
      showToast('Error de conexión al resolver alerta.', 'error')
    }
  }

  const handleSaveNotifPrefs = async () => {
    localStorage.setItem('onedata_bi_notif_prefs', JSON.stringify(notifPrefs))
    await recordAudit('ACTUALIZAR_NOTIFICACIONES', 'notificaciones', notifPrefs)
    showToast('Preferencias de notificaciones guardadas.')
  }

  const handleSaveSecurity = async () => {
    localStorage.setItem('onedata_bi_security', JSON.stringify(securityPrefs))
    await recordAudit('ACTUALIZAR_SEGURIDAD', 'politicas_seguridad', securityPrefs)
    showToast('Políticas de seguridad actualizadas y registradas en auditoría.')
  }

  const handleExportAuditCsv = () => {
    if (!auditData.registros.length) return
    const headers = ['ID', 'Fecha', 'Usuario', 'Accion', 'Entidad', 'ID Entidad', 'IP', 'Detalle']
    const rows = auditData.registros.map((r) => [
      r.id_auditoria,
      formatDateTime(r.fecha_creacion),
      r.usuario,
      r.accion,
      r.nombre_entidad,
      r.id_entidad ?? '',
      r.direccion_ip ?? '',
      JSON.stringify(r.valores_nuevos ?? {}),
    ])
    const csv = [headers, ...rows]
      .map((line) =>
        line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','),
      )
      .join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `auditoria_onedata_bi_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
    showToast('Archivo CSV de auditoría descargado.')
  }

  const filteredUsers = users.filter((u) => {
    const term = userSearch.trim().toLowerCase()
    if (!term) return true
    return (
      `${u.nombres} ${u.apellidos}`.toLowerCase().includes(term) ||
      (u.correo || '').toLowerCase().includes(term) ||
      (u.roles || []).join(' ').toLowerCase().includes(term)
    )
  })

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-1 text-slate-600">
            <svg
              className="h-7 w-7"
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
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#0d1f3c] leading-tight">
              Configuración y Auditoría
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Administra parámetros, usuarios, conectores, seguridad y trazabilidad del sistema
            </p>
          </div>
        </div>
      </div>

      {/* Horizontal Tabs */}
      <div className="border-b border-slate-200 flex items-center gap-6 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`pb-2.5 text-xs sm:text-sm font-semibold whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
              activeTab === tab.id
                ? 'border-[#0b63d6] text-[#0b63d6]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {toast && (
        <div
          className={`rounded-lg border px-4 py-2.5 text-xs sm:text-sm font-medium ${
            toast.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}
        >
          {toast.message}
        </div>
      )}

      {isLoading && <PageLoader label="Cargando información del módulo..." />}

      {/* TAB 1: GENERAL */}
      {activeTab === 'general' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column */}
          <div className="lg:col-span-6 space-y-5">
            <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-5 space-y-4">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                <div className="h-28 w-28 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center p-3 shrink-0">
                  <img
                    src="/img/logoOneData.png"
                    alt="One-Data BI"
                    className="h-full w-full object-contain"
                  />
                </div>

                <div className="flex-1 w-full space-y-2.5">
                  <h2 className="text-[15px] font-bold text-[#0d1f3c]">
                    Información del Sistema
                  </h2>

                  <div className="space-y-2 text-xs sm:text-[13px]">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-slate-500">Nombre del sistema:</span>
                      <span className="font-semibold text-[#0d1f3c]">
                        One-Data BI
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-slate-500">Versión:</span>
                      <span className="font-semibold text-[#0d1f3c]">
                        v1.0.0
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-slate-500">Entorno:</span>
                      <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        {summary?.entorno || 'Producción'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-slate-500">
                        Última sincronización ETL:
                      </span>
                      <span className="font-semibold text-[#0d1f3c]">
                        {formatDateTime(summary?.ultimaActualizacion)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {showSystemDetails && (
                <div className="rounded-lg bg-slate-50 border border-slate-200/80 p-3 text-xs text-slate-600 space-y-1.5">
                  <p>
                    <span className="font-semibold text-slate-800">
                      Motor de Base de Datos:
                    </span>{' '}
                    {summary?.dbVersion || 'PostgreSQL (Neon Cloud)'}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-800">
                      Usuarios activos:
                    </span>{' '}
                    {summary?.usuariosActivos ?? '—'} de{' '}
                    {summary?.usuariosTotal ?? '—'}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-800">
                      Fuentes activas:
                    </span>{' '}
                    {summary?.fuentesActivas ?? '—'} de{' '}
                    {summary?.fuentesTotal ?? '—'}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-800">
                      Integración Jira Cloud:
                    </span>{' '}
                    {summary?.jiraConfigured
                      ? `Conectado (${summary.jiraProjectKey})`
                      : 'Modo local'}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-800">
                      Eventos en auditoría:
                    </span>{' '}
                    {summary?.registrosAuditoria ?? 0} registros
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowSystemDetails((prev) => !prev)}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 py-2 text-xs sm:text-sm font-semibold text-[#0d1f3c] transition-colors cursor-pointer"
              >
                <span>
                  {showSystemDetails ? 'Ocultar Detalles' : 'Ver Detalles'}
                </span>
              </button>
            </section>

            <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-5 space-y-4">
              <h2 className="text-[15px] font-bold text-[#0d1f3c]">
                Parámetros del Sistema
              </h2>

              <div className="divide-y divide-slate-100">
                <div className="py-3 flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2.5 text-xs sm:text-[13px] font-medium text-slate-700">
                    <span className="h-5 w-5 rounded-md bg-sky-100 text-[#0b63d6] flex items-center justify-center text-[11px] font-bold">
                      ✓
                    </span>
                    Actualizar datos automáticamente
                  </span>
                  <ToggleSwitch
                    checked={autoRefresh}
                    onChange={setAutoRefresh}
                    label="Actualizar datos automáticamente"
                  />
                </div>

                <div className="py-3 flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2.5 text-xs sm:text-[13px] font-medium text-slate-700">
                    <span className="h-5 w-5 rounded-md bg-sky-100 text-[#0b63d6] flex items-center justify-center text-[11px] font-bold">
                      ✓
                    </span>
                    Mostrar alertas en tiempo real
                  </span>
                  <ToggleSwitch
                    checked={realtimeAlerts}
                    onChange={setRealtimeAlerts}
                    label="Mostrar alertas en tiempo real"
                  />
                </div>

                <div className="pt-3 flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2.5 text-xs sm:text-[13px] font-medium text-slate-700">
                    <span className="h-5 w-5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[11px] font-bold">
                      ◐
                    </span>
                    Modo oscuro
                  </span>
                  <ToggleSwitch
                    checked={darkMode}
                    onChange={setDarkMode}
                    label="Modo oscuro"
                  />
                </div>
              </div>
            </section>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-6 space-y-5">
            <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-5 space-y-4">
              <h2 className="text-[15px] font-bold text-[#0d1f3c]">
                Preferencias Generales
              </h2>

              <div className="space-y-3 text-xs sm:text-[13px]">
                <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2">
                  <label
                    htmlFor="pref-lang"
                    className="sm:col-span-5 text-slate-600 font-medium"
                  >
                    Idioma:
                  </label>
                  <select
                    id="pref-lang"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="sm:col-span-7 h-9 rounded-lg border border-slate-200 bg-white px-3 text-slate-700 focus:border-[#0b63d6] focus:outline-none"
                  >
                    <option value="es">Español</option>
                    <option value="en">English</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2">
                  <label
                    htmlFor="pref-tz"
                    className="sm:col-span-5 text-slate-600 font-medium"
                  >
                    Zona Horaria:
                  </label>
                  <select
                    id="pref-tz"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="sm:col-span-7 h-9 rounded-lg border border-slate-200 bg-white px-3 text-slate-700 focus:border-[#0b63d6] focus:outline-none"
                  >
                    <option value="America/Lima">America/Lima (GMT -5)</option>
                    <option value="America/Bogota">
                      America/Bogota (GMT -5)
                    </option>
                    <option value="UTC">UTC (GMT 0)</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2">
                  <label
                    htmlFor="pref-date"
                    className="sm:col-span-5 text-slate-600 font-medium"
                  >
                    Formato de Fecha:
                  </label>
                  <select
                    id="pref-date"
                    value={dateFormat}
                    onChange={(e) => setDateFormat(e.target.value)}
                    className="sm:col-span-7 h-9 rounded-lg border border-slate-200 bg-white px-3 text-slate-700 focus:border-[#0b63d6] focus:outline-none"
                  >
                    <option value="DD/MM/AAAA">DD/MM/AAAA</option>
                    <option value="MM/DD/AAAA">MM/DD/AAAA</option>
                    <option value="AAAA-MM-DD">AAAA-MM-DD</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2">
                  <label
                    htmlFor="pref-time"
                    className="sm:col-span-5 text-slate-600 font-medium"
                  >
                    Formato de Hora:
                  </label>
                  <select
                    id="pref-time"
                    value={timeFormat}
                    onChange={(e) => setTimeFormat(e.target.value)}
                    className="sm:col-span-7 h-9 rounded-lg border border-slate-200 bg-white px-3 text-slate-700 focus:border-[#0b63d6] focus:outline-none"
                  >
                    <option value="HH:mm">HH:mm</option>
                    <option value="hh:mm a">hh:mm a</option>
                  </select>
                </div>
              </div>

              <div className="pt-1 flex justify-end">
                <button
                  type="button"
                  onClick={handleSavePreferences}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#0b5ed7] hover:bg-[#094db3] px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs transition-colors cursor-pointer"
                >
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* TAB 2: USUARIOS Y ROLES */}
      {activeTab === 'usuarios' && (
        <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-bold text-[#0d1f3c]">
                Usuarios y Roles Registrados
              </h2>
              <p className="text-xs text-slate-500">
                {filteredUsers.length} usuarios mostrados — los cambios se registran en Auditoría
              </p>
            </div>
            <input
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Buscar por nombre, correo o rol..."
              className="h-9 w-full sm:w-64 rounded-lg border border-slate-200 px-3 text-xs sm:text-sm text-slate-700 focus:border-[#0b63d6] focus:outline-none"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-[13px]">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-2.5 pr-4">Nombre</th>
                  <th className="py-2.5 px-4">Usuario / Correo</th>
                  <th className="py-2.5 px-4">Roles</th>
                  <th className="py-2.5 px-4">Último Acceso</th>
                  <th className="py-2.5 px-4">Estado</th>
                  <th className="py-2.5 pl-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => (
                  <tr key={u.id_usuario} className="hover:bg-slate-50/70">
                    <td className="py-2.5 pr-4 font-semibold text-slate-800 whitespace-nowrap">
                      {u.nombres} {u.apellidos}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">{u.correo}</td>
                    <td className="py-2.5 px-4 text-slate-700 font-medium">
                      {u.roles?.join(', ') || 'Sin rol'}
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">
                      {formatDateTime(u.ultimo_acceso)}
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                          u.esta_activo
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : 'bg-slate-100 border-slate-200 text-slate-600'
                        }`}
                      >
                        {u.estado}
                      </span>
                    </td>
                    <td className="py-2.5 pl-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleToggleUserStatus(u)}
                        className="rounded-md border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1 text-xs font-semibold text-[#0d1f3c] cursor-pointer"
                      >
                        {u.esta_activo ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 3: FUENTES DE DATOS */}
      {activeTab === 'fuentes' && (
        <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-[15px] font-bold text-[#0d1f3c]">
                Fuentes de Datos y Conectores (APO14)
              </h2>
              <p className="text-xs text-slate-500">
                Administra las fuentes conectadas al Data Warehouse y ejecuta sincronizaciones manuales
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-600">
              {fuentes.filter((f) => f.estado === 'ACTIVA').length} de{' '}
              {fuentes.length} activas
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-[13px]">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-2.5 pr-4">Fuente</th>
                  <th className="py-2.5 px-3">Área</th>
                  <th className="py-2.5 px-3">Tipo</th>
                  <th className="py-2.5 px-3">Frecuencia</th>
                  <th className="py-2.5 px-3">Última Sync</th>
                  <th className="py-2.5 px-3">Estado</th>
                  <th className="py-2.5 pl-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fuentes.map((f) => (
                  <tr key={f.id_fuente} className="hover:bg-slate-50/70">
                    <td className="py-3 pr-4">
                      <p className="font-semibold text-slate-800">{f.nombre}</p>
                      <p className="text-[11px] text-slate-500">
                        {f.sistema_origen || f.descripcion || 'Conector BI'}
                      </p>
                    </td>
                    <td className="py-3 px-3 text-slate-600">{f.area}</td>
                    <td className="py-3 px-3 text-slate-600">{f.tipo}</td>
                    <td className="py-3 px-3 text-slate-600">
                      Cada {f.intervalo_sincronizacion_min} min
                    </td>
                    <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                      {formatDateTime(f.ultima_sincronizacion)}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                          f.estado === 'ACTIVA'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : f.estado === 'ERROR'
                              ? 'bg-red-50 border-red-200 text-red-600'
                              : 'bg-slate-100 border-slate-200 text-slate-600'
                        }`}
                      >
                        {f.estado}
                      </span>
                    </td>
                    <td className="py-3 pl-3 text-right whitespace-nowrap space-x-2">
                      <button
                        type="button"
                        disabled={syncingSourceId === f.id_fuente}
                        onClick={() => handleSyncSource(f.id_fuente)}
                        className="rounded-md bg-[#0b5ed7] hover:bg-[#094db3] disabled:opacity-60 px-2.5 py-1 text-xs font-semibold text-white cursor-pointer"
                      >
                        {syncingSourceId === f.id_fuente
                          ? 'Sincronizando...'
                          : 'Sincronizar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleSourceStatus(f)}
                        className="rounded-md border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 cursor-pointer"
                      >
                        {f.estado === 'ACTIVA' ? 'Pausar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 4: NOTIFICACIONES */}
      {activeTab === 'notificaciones' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <section className="lg:col-span-5 rounded-xl bg-white border border-slate-200/80 shadow-xs p-5 space-y-4">
            <h2 className="text-[15px] font-bold text-[#0d1f3c]">
              Canales y Reglas de Notificación
            </h2>

            <div className="divide-y divide-slate-100">
              <div className="py-3 flex items-center justify-between gap-3">
                <span className="text-xs sm:text-[13px] font-medium text-slate-700">
                  Mostrar banner de alertas críticas
                </span>
                <ToggleSwitch
                  checked={notifPrefs.criticalAlertsBanner}
                  onChange={(val) =>
                    setNotifPrefs((p) => ({ ...p, criticalAlertsBanner: val }))
                  }
                  label="Mostrar banner de alertas críticas"
                />
              </div>
              <div className="py-3 flex items-center justify-between gap-3">
                <span className="text-xs sm:text-[13px] font-medium text-slate-700">
                  Resumen diario por correo corporativo
                </span>
                <ToggleSwitch
                  checked={notifPrefs.emailDigest}
                  onChange={(val) =>
                    setNotifPrefs((p) => ({ ...p, emailDigest: val }))
                  }
                  label="Resumen diario por correo corporativo"
                />
              </div>
              <div className="py-3 flex items-center justify-between gap-3">
                <span className="text-xs sm:text-[13px] font-medium text-slate-700">
                  Escalamiento automático hacia Jira Cloud
                </span>
                <ToggleSwitch
                  checked={notifPrefs.jiraAutoAlert}
                  onChange={(val) =>
                    setNotifPrefs((p) => ({ ...p, jiraAutoAlert: val }))
                  }
                  label="Escalamiento automático hacia Jira Cloud"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveNotifPrefs}
                className="rounded-lg bg-[#0b5ed7] hover:bg-[#094db3] px-4 py-2 text-xs sm:text-sm font-semibold text-white cursor-pointer"
              >
                Guardar Reglas
              </button>
            </div>
          </section>

          <section className="lg:col-span-7 rounded-xl bg-white border border-slate-200/80 shadow-xs p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[15px] font-bold text-[#0d1f3c]">
                Alertas del Sistema ({alertsData.stats.pendientes} pendientes)
              </h2>
              <span className="text-xs font-semibold text-red-600">
                {alertsData.stats.criticas} críticas activas
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {alertsData.alertas.map((a) => (
                <div
                  key={a.id_alerta}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          a.severidad === 'CRITICA'
                            ? 'bg-red-50 text-red-600'
                            : a.severidad === 'ALTA'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-sky-50 text-sky-700'
                        }`}
                      >
                        {a.severidad}
                      </span>
                      <p className="text-xs sm:text-sm font-semibold text-slate-800">
                        {a.titulo}
                      </p>
                    </div>
                    <p className="text-xs text-slate-500">{a.mensaje}</p>
                  </div>

                  {a.estado === 'PENDIENTE' ? (
                    <button
                      type="button"
                      onClick={() => handleResolveAlert(a.id_alerta)}
                      className="shrink-0 rounded-md border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 cursor-pointer"
                    >
                      Marcar Resuelta
                    </button>
                  ) : (
                    <span className="shrink-0 text-xs font-semibold text-slate-400">
                      RESUELTA
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* TAB 5: SEGURIDAD */}
      {activeTab === 'seguridad' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <section className="lg:col-span-7 rounded-xl bg-white border border-slate-200/80 shadow-xs p-5 space-y-4">
            <h2 className="text-[15px] font-bold text-[#0d1f3c]">
              Políticas de Seguridad y Control de Acceso
            </h2>

            <div className="space-y-3 text-xs sm:text-[13px]">
              <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2">
                <label className="sm:col-span-6 text-slate-600 font-medium">
                  Expiración de sesión por inactividad:
                </label>
                <select
                  value={securityPrefs.sessionTimeoutMin}
                  onChange={(e) =>
                    setSecurityPrefs((p) => ({
                      ...p,
                      sessionTimeoutMin: e.target.value,
                    }))
                  }
                  className="sm:col-span-6 h-9 rounded-lg border border-slate-200 bg-white px-3 text-slate-700"
                >
                  <option value="30">30 minutos</option>
                  <option value="60">60 minutos</option>
                  <option value="120">2 horas</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2">
                <label className="sm:col-span-6 text-slate-600 font-medium">
                  Intentos máximos antes de bloqueo:
                </label>
                <select
                  value={securityPrefs.maxLoginAttempts}
                  onChange={(e) =>
                    setSecurityPrefs((p) => ({
                      ...p,
                      maxLoginAttempts: e.target.value,
                    }))
                  }
                  className="sm:col-span-6 h-9 rounded-lg border border-slate-200 bg-white px-3 text-slate-700"
                >
                  <option value="3">3 intentos</option>
                  <option value="5">5 intentos</option>
                  <option value="10">10 intentos</option>
                </select>
              </div>

              <div className="py-2 flex items-center justify-between gap-3 border-t border-slate-100">
                <span className="font-medium text-slate-700">
                  Registrar cada cambio administrativo en Auditoría
                </span>
                <ToggleSwitch
                  checked={securityPrefs.auditAllChanges}
                  onChange={(val) =>
                    setSecurityPrefs((p) => ({ ...p, auditAllChanges: val }))
                  }
                  label="Registrar cada cambio administrativo en Auditoría"
                />
              </div>

              <div className="py-2 flex items-center justify-between gap-3 border-t border-slate-100">
                <span className="font-medium text-slate-700">
                  Exigir contraseñas robustas (mín. 8 caracteres)
                </span>
                <ToggleSwitch
                  checked={securityPrefs.requireStrongPasswords}
                  onChange={(val) =>
                    setSecurityPrefs((p) => ({
                      ...p,
                      requireStrongPasswords: val,
                    }))
                  }
                  label="Exigir contraseñas robustas"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveSecurity}
                className="rounded-lg bg-[#0b5ed7] hover:bg-[#094db3] px-4 py-2 text-xs sm:text-sm font-semibold text-white cursor-pointer"
              >
                Guardar Políticas
              </button>
            </div>
          </section>

          <section className="lg:col-span-5 rounded-xl bg-white border border-slate-200/80 shadow-xs p-5 space-y-3">
            <h2 className="text-[15px] font-bold text-[#0d1f3c]">
              Estado de Cumplimiento y Cifrado
            </h2>
            <div className="space-y-2.5 text-xs sm:text-[13px]">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                <span className="font-medium text-emerald-900">
                  Cifrado en tránsito (SSL/TLS Neon DB)
                </span>
                <span className="font-bold text-emerald-700">ACTIVO</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                <span className="font-medium text-emerald-900">
                  Integración API Jira (Basic Auth + HTTPS)
                </span>
                <span className="font-bold text-emerald-700">
                  {summary?.jiraConfigured ? 'ACTIVO' : 'LOCAL'}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="font-medium text-slate-700">
                  Trazabilidad de Auditoría (MEA02 / DSS05)
                </span>
                <span className="font-bold text-[#0b63d6]">
                  {summary?.registrosAuditoria ?? 0} eventos
                </span>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* TAB 6: AUDITORÍA */}
      {activeTab === 'auditoria' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-4">
              <p className="text-xs font-medium text-slate-500">
                Total Eventos Auditados
              </p>
              <p className="text-2xl font-extrabold text-[#0d1f3c] mt-1">
                {auditData.stats.total}
              </p>
            </div>
            <div className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-4">
              <p className="text-xs font-medium text-slate-500">Eventos Hoy</p>
              <p className="text-2xl font-extrabold text-[#0b63d6] mt-1">
                {auditData.stats.hoy}
              </p>
            </div>
            <div className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-4">
              <p className="text-xs font-medium text-slate-500">
                Entidades Supervisadas
              </p>
              <p className="text-2xl font-extrabold text-[#0d1f3c] mt-1">
                {auditData.stats.entidades}
              </p>
            </div>
            <div className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-4">
              <p className="text-xs font-medium text-slate-500">
                Usuarios con Actividad
              </p>
              <p className="text-2xl font-extrabold text-emerald-700 mt-1">
                {auditData.stats.usuarios}
              </p>
            </div>
          </div>

          <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-5 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-bold text-[#0d1f3c]">
                  Bitácora de Auditoría del Sistema
                </h2>
                <p className="text-xs text-slate-500">
                  Registro histórico de inicios de sesión, sincronizaciones, alertas y cambios administrativos
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder="Buscar usuario, acción o tabla..."
                  className="h-9 w-full sm:w-56 rounded-lg border border-slate-200 px-3 text-xs sm:text-sm text-slate-700 focus:border-[#0b63d6] focus:outline-none"
                />
                <select
                  value={auditActionFilter}
                  onChange={(e) => setAuditActionFilter(e.target.value)}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs sm:text-sm text-slate-700 focus:border-[#0b63d6] focus:outline-none"
                >
                  <option value="">Todas las acciones</option>
                  {auditData.acciones.map((acc) => (
                    <option key={acc} value={acc}>
                      {acc}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleExportAuditCsv}
                  className="h-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3 text-xs sm:text-sm font-semibold text-[#0d1f3c] cursor-pointer"
                >
                  Exportar CSV
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-[13px]">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                    <th className="py-2.5 pr-3">Fecha y Hora</th>
                    <th className="py-2.5 px-3">Usuario</th>
                    <th className="py-2.5 px-3">Acción</th>
                    <th className="py-2.5 px-3">Entidad</th>
                    <th className="py-2.5 px-3">Detalle</th>
                    <th className="py-2.5 pl-3 text-right">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditData.registros.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-6 text-center text-slate-400"
                      >
                        No hay eventos de auditoría que coincidan con el filtro.
                      </td>
                    </tr>
                  ) : (
                    auditData.registros.map((r) => (
                      <tr key={r.id_auditoria} className="hover:bg-slate-50/70">
                        <td className="py-2.5 pr-3 text-slate-600 whitespace-nowrap">
                          {formatDateTime(r.fecha_creacion)}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800 whitespace-nowrap">
                          {r.usuario}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="inline-flex rounded-full bg-sky-50 border border-sky-200 px-2.5 py-0.5 text-[11px] font-semibold text-[#0b63d6]">
                            {r.accion}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                          {r.nombre_entidad}
                          {r.id_entidad ? ` #${r.id_entidad}` : ''}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate">
                          {r.valores_nuevos
                            ? JSON.stringify(r.valores_nuevos)
                            : '—'}
                        </td>
                        <td className="py-2.5 pl-3 text-right text-slate-500 whitespace-nowrap">
                          {r.direccion_ip || '127.0.0.1'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
