import { useState } from 'react'

const MENU_ITEMS = [
  {
    id: 'inicio',
    label: 'Inicio',
    icon: 'home',
  },
  {
    id: 'tableros',
    label: 'Tableros Ejecutivos',
    icon: 'chart',
    children: [
      { id: 'tableros-resumen', label: 'Resumen Corporativo' },
      { id: 'tableros-comercial', label: 'Ventas y Comercial' },
      { id: 'tableros-operaciones', label: 'Operaciones' },
      { id: 'tableros-finanzas', label: 'Finanzas' },
      { id: 'tableros-talento', label: 'Gestión Humana' },
    ],
  },
  {
    id: 'analisis-area',
    label: 'Análisis por Área',
    icon: 'grid',
    children: [
      { id: 'area-campo', label: 'Campo' },
      { id: 'area-packing', label: 'Packing' },
      { id: 'area-gh', label: 'Gestión Humana' },
      { id: 'area-comercial', label: 'Comercial' },
      { id: 'area-finanzas', label: 'Finanzas' },
    ],
  },
  {
    id: 'reportes',
    label: 'Reportes y Descargas',
    icon: 'download',
  },
  {
    id: 'configuracion',
    label: 'Configuración',
    icon: 'settings',
    children: [
      { id: 'config-usuarios', label: 'Usuarios y Roles' },
      { id: 'config-auditoria', label: 'Auditoría' },
    ],
  },
  {
    id: 'jira',
    label: 'Jira Service Management',
    icon: 'jira',
  },
]

function MenuIcon({ name }) {
  const cls = 'h-4 w-4 shrink-0'
  switch (name) {
    case 'home':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3 3 10.5V21h6v-6h6v6h6V10.5L12 3Z" />
        </svg>
      )
    case 'chart':
      return (
        <svg
          className={cls}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 3v18h18" />
          <path d="M8 16v-5" />
          <path d="M13 16V8" />
          <path d="M18 16v-8" />
        </svg>
      )
    case 'grid':
      return (
        <svg
          className={cls}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      )
    case 'download':
      return (
        <svg
          className={cls}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3v12" />
          <path d="m7 10 5 5 5-5" />
          <path d="M4 19h16" />
        </svg>
      )
    case 'bell':
      return (
        <svg
          className={cls}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
      )
    case 'database':
      return (
        <svg
          className={cls}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
          <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
        </svg>
      )
    case 'refresh':
      return (
        <svg
          className={cls}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
          <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
          <path d="M16 16h5v5" />
        </svg>
      )
    case 'settings':
      return (
        <svg
          className={cls}
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
      )
    case 'support':
      return (
        <svg
          className={cls}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
          <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3Z" />
          <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3Z" />
        </svg>
      )
    case 'jira':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.01 2 4.5 9.5a1.5 1.5 0 0 0 0 2.12l4.88 4.88 2.63-2.63-3.32-3.31 5.95-5.95L12.01 2Zm7.49 7.5-4.88-4.88-2.63 2.63 3.32 3.31-5.95 5.95L12 19.14l7.5-7.52a1.5 1.5 0 0 0 0-2.12Z" />
        </svg>
      )
    default:
      return null
  }
}

function getInitials(user) {
  const first = user?.nombres?.[0] || 'U'
  const last = user?.apellidos?.[0] || 'S'
  return `${first}${last}`.toUpperCase()
}

function formatRole(roles) {
  if (!roles || roles.length === 0) return 'Usuario'
  const map = {
    DIRECTORIO: 'Directorio',
    GERENCIA_GENERAL: 'Gerencia General',
    GERENTE_AREA: 'Gerente de Área',
    SUBGERENTE: 'Subgerente',
    ANALISTA: 'Analista',
    ADMINISTRADOR: 'Administrador',
  }
  return map[roles[0]] || roles[0]
}

export default function Sidebar({
  activeMenu,
  onSelectMenu,
  user,
  onLogout,
  isOpen = true,
  isMobileOpen = false,
  onCloseMobile,
}) {
  const [expanded, setExpanded] = useState({})

  const toggleExpand = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <>
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/50 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col h-[100dvh] shrink-0 bg-gradient-to-b from-[#0b2546] via-[#091f3b] to-[#061529] text-slate-200 transition-transform duration-200 lg:static ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${isOpen ? 'w-[248px] sm:w-[238px]' : 'lg:w-0 lg:overflow-hidden w-[248px]'}`}
      >
        {/* Brand */}
        <div className="relative flex flex-col items-center text-center px-4 py-5 border-b border-white/10 shrink-0">
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Cerrar menú lateral"
            className="lg:hidden absolute top-3 right-3 p-1.5 rounded-lg text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <img
            src="/img/logoOneData.png"
            alt="One-Data BI"
            className="h-11 w-auto object-contain mb-2"
          />
          <span className="text-lg font-bold tracking-tight text-white leading-tight">
            One-Data <span className="text-sky-400">BI</span>
          </span>
          <span className="text-[11px] text-slate-300/80 mt-0.5">
            Una sola versión de la verdad
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-1 text-[13px]">
          {MENU_ITEMS.map((item) => {
            const hasChildren = Boolean(item.children?.length)
            const isExpanded = Boolean(expanded[item.id])
            const isActive =
              activeMenu === item.id ||
              item.children?.some((child) => child.id === activeMenu)

            return (
              <div key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    if (hasChildren) {
                      toggleExpand(item.id)
                    } else {
                      onSelectMenu(item.id)
                      onCloseMobile?.()
                    }
                  }}
                  className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                    activeMenu === item.id
                      ? 'bg-gradient-to-r from-[#1a73e8] to-[#0e5bc7] text-white font-semibold shadow-sm'
                      : isActive
                        ? 'text-white bg-white/10 font-medium'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <MenuIcon name={item.icon} />
                    <span className="truncate">{item.label}</span>
                  </span>

                  <span className="flex items-center gap-1.5 shrink-0">
                    {hasChildren && (
                      <svg
                        className={`h-3.5 w-3.5 text-slate-400 transition-transform ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    )}
                  </span>
                </button>

                {hasChildren && isExpanded && (
                  <div className="mt-1 ml-4 pl-3 border-l border-white/10 space-y-0.5">
                    {item.children.map((child) => (
                      <button
                        key={child.id}
                        type="button"
                        onClick={() => {
                          onSelectMenu(child.id)
                          onCloseMobile?.()
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-md text-[12.5px] transition-colors cursor-pointer ${
                          activeMenu === child.id
                            ? 'bg-white/15 text-white font-medium'
                            : 'text-slate-300/90 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {child.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* User profile & logout */}
        <div className="border-t border-white/10 px-3 py-3 space-y-2.5 shrink-0 bg-[#061529]/70">
          <div className="flex items-center gap-2.5 px-1">
            <div className="h-9 w-9 rounded-full bg-[#1a4b84] border border-sky-400/30 flex items-center justify-center text-xs font-bold text-white shrink-0">
              {getInitials(user)}
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-white truncate">
                {user?.nombres} {user?.apellidos}
              </p>
              <p className="text-[11px] text-slate-400 truncate">
                {formatRole(user?.roles)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[13px] text-slate-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          >
            <svg
              className="h-4 w-4 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>
    </>
  )
}
