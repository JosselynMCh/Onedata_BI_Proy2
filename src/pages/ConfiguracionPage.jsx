import { useEffect, useState } from 'react'

const TABS = [
  { id: 'general', label: 'General' },
  { id: 'usuarios', label: 'Usuarios y Roles' },
  { id: 'fuentes', label: 'Fuentes de Datos' },
  { id: 'notificaciones', label: 'Notificaciones' },
  { id: 'seguridad', label: 'Seguridad' },
  { id: 'avanzado', label: 'Avanzado' },
]

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
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [realtimeAlerts, setRealtimeAlerts] = useState(true)
  const [darkMode, setDarkMode] = useState(false)

  const [language, setLanguage] = useState('es')
  const [timezone, setTimezone] = useState('America/Lima')
  const [dateFormat, setDateFormat] = useState('DD/MM/AAAA')
  const [timeFormat, setTimeFormat] = useState('HH:mm')

  const [lastCacheClear, setLastCacheClear] = useState('24/04/2025 08:00')
  const [showSystemDetails, setShowSystemDetails] = useState(false)
  const [toast, setToast] = useState('')
  const [users, setUsers] = useState([])

  useEffect(() => {
    if (activeTab !== 'usuarios') return
    let cancelled = false
    fetch('/api/config/usuarios')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled && json?.ok) {
          setUsers(json.data)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [activeTab])

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const handleSavePreferences = () => {
    localStorage.setItem(
      'onedata_bi_prefs',
      JSON.stringify({
        language,
        timezone,
        dateFormat,
        timeFormat,
        autoRefresh,
        realtimeAlerts,
        darkMode,
      }),
    )
    showToast('Preferencias guardadas correctamente.')
  }

  const handleClearCache = () => {
    const now = new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date())
    setLastCacheClear(now)
    showToast('Caché del sistema limpiada correctamente.')
  }

  return (
    <div className="space-y-5">
      {/* Header */}
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
            Configuración
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Administra las opciones del sistema
          </p>
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
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-xs sm:text-sm font-medium text-emerald-700">
          {toast}
        </div>
      )}

      {activeTab === 'general' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column */}
          <div className="lg:col-span-6 space-y-5">
            {/* Información del Sistema */}
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
                        Producción
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-slate-500">
                        Última actualización:
                      </span>
                      <span className="font-semibold text-[#0d1f3c]">
                        24/04/2025 08:00
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {showSystemDetails && (
                <div className="rounded-lg bg-slate-50 border border-slate-200/80 p-3 text-xs text-slate-600 space-y-1">
                  <p>
                    <span className="font-semibold text-slate-800">
                      Motor de Base de Datos:
                    </span>{' '}
                    PostgreSQL 16 (Neon Cloud)
                  </p>
                  <p>
                    <span className="font-semibold text-slate-800">API:</span>{' '}
                    Express.js + SSL Pool activo
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowSystemDetails((prev) => !prev)}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 py-2 text-xs sm:text-sm font-semibold text-[#0d1f3c] transition-colors cursor-pointer"
              >
                <svg
                  className="h-4 w-4 text-[#0b63d6]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span>
                  {showSystemDetails ? 'Ocultar Detalles' : 'Ver Detalles'}
                </span>
              </button>
            </section>

            {/* Parámetros del Sistema */}
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
            {/* Preferencias Generales */}
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
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </section>

            {/* Mantenimiento */}
            <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-5 space-y-4">
              <h2 className="text-[15px] font-bold text-[#0d1f3c]">
                Mantenimiento
              </h2>

              <div className="flex items-center justify-between gap-4 text-xs sm:text-[13px]">
                <span className="text-slate-600 font-medium">
                  Última limpieza de caché:
                </span>
                <span className="font-semibold text-[#0d1f3c]">
                  {lastCacheClear}
                </span>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleClearCache}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2 text-xs sm:text-sm font-semibold text-[#0d1f3c] transition-colors cursor-pointer"
                >
                  <svg
                    className="h-4 w-4 text-[#0b63d6]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  <span>Limpiar Caché</span>
                </button>
              </div>
            </section>
          </div>
        </div>
      )}

      {activeTab === 'usuarios' && (
        <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-5">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h2 className="text-[15px] font-bold text-[#0d1f3c]">
              Usuarios y Roles Registrados
            </h2>
            <span className="text-xs font-medium text-slate-500">
              {users.length} usuarios en base de datos
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-[13px]">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-2.5 pr-4">Nombre</th>
                  <th className="py-2.5 px-4">Usuario</th>
                  <th className="py-2.5 px-4">Área</th>
                  <th className="py-2.5 px-4">Rol</th>
                  <th className="py-2.5 pl-4 text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id_usuario} className="hover:bg-slate-50/70">
                    <td className="py-2.5 pr-4 font-semibold text-slate-800">
                      {u.nombres} {u.apellidos}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">{u.correo}</td>
                    <td className="py-2.5 px-4 text-slate-600">
                      {u.area || 'Corporativo'}
                    </td>
                    <td className="py-2.5 px-4 text-slate-700 font-medium">
                      {u.roles?.join(', ') || 'Sin rol'}
                    </td>
                    <td className="py-2.5 pl-4 text-right">
                      <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                        {u.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab !== 'general' && activeTab !== 'usuarios' && (
        <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-8 text-center space-y-2">
          <h2 className="text-base font-bold text-[#0d1f3c]">
            {TABS.find((t) => t.id === activeTab)?.label}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Sección de configuración lista para parámetros avanzados.
          </p>
        </section>
      )}
    </div>
  )
}
