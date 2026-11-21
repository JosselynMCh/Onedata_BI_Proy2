import { useEffect, useRef, useState } from 'react'

function getInitials(user) {
  const first = user?.nombres?.[0] || 'U'
  const last = user?.apellidos?.[0] || 'S'
  return `${first}${last}`.toUpperCase()
}

export default function Topbar({
  title = 'Dashboard',
  user,
  onLogout,
  onToggleSidebar,
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fullName =
    [user?.nombres, user?.apellidos].filter(Boolean).join(' ') || 'Usuario'
  const roleLabel = user?.roles?.[0] || 'USUARIO'

  return (
    <header className="h-14 bg-white border-b border-slate-200/90 px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0">
      {/* Left: Mobile menu toggle + Page icon & title */}
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Abrir menú lateral"
          className="lg:hidden p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <svg
          className="h-4 w-4 text-slate-600 shrink-0"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M12 3 3 10.5V21h6v-6h6v6h6V10.5L12 3Z" />
        </svg>
        <span className="text-[15px] font-semibold text-slate-800 truncate">
          {title}
        </span>
      </div>

      {/* Right: User avatar, name, role & dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          className="flex items-center gap-2.5 rounded-lg px-2 py-1 hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <div className="h-9 w-9 rounded-full bg-[#dce8f8] border border-[#bfd5f2] flex items-center justify-center text-xs font-bold text-[#144382] shrink-0">
            {getInitials(user)}
          </div>

          <div className="text-left leading-tight hidden sm:block">
            <p className="text-[13px] font-semibold text-slate-800">
              {fullName}
            </p>
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
              {roleLabel}
            </p>
          </div>

          <svg
            className={`h-4 w-4 text-slate-400 transition-transform ${
              menuOpen ? 'rotate-180' : ''
            }`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-1.5 w-48 rounded-xl bg-white border border-slate-200 shadow-lg py-1.5 z-50">
            <div className="px-3.5 py-2 border-b border-slate-100 sm:hidden">
              <p className="text-xs font-semibold text-slate-800 truncate">
                {fullName}
              </p>
              <p className="text-[11px] text-slate-500 uppercase">
                {roleLabel}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false)
                onLogout?.()
              }}
              className="w-full flex items-center gap-2 px-3.5 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
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
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Cerrar sesión</span>
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
