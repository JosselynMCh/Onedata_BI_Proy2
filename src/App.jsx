import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import AreaCampoPage from './pages/AreaCampoPage'
import AreaComercialPage from './pages/AreaComercialPage'
import AreaFinanzasPage from './pages/AreaFinanzasPage'
import AreaGestionHumanaPage from './pages/AreaGestionHumanaPage'
import AreaPackingPage from './pages/AreaPackingPage'
import ConfiguracionPage from './pages/ConfiguracionPage'
import DashboardEjecutivoPage from './pages/DashboardEjecutivoPage'
import FinanzasPage from './pages/FinanzasPage'
import GestionHumanaPage from './pages/GestionHumanaPage'
import JiraServicePage from './pages/JiraServicePage'
import LoginPage from './pages/LoginPage'
import OperacionesPage from './pages/OperacionesPage'
import ReportesDescargasPage from './pages/ReportesDescargasPage'
import ResumenCorporativoPage from './pages/ResumenCorporativoPage'
import VentasComercialPage from './pages/VentasComercialPage'

const SESSION_KEY = 'onedata_bi_user'

function loadStoredUser() {
  try {
    const raw =
      localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const SECTION_TITLES = {
  'tableros-resumen': 'Tableros Ejecutivos — Resumen Corporativo',
  'tableros-comercial': 'Tableros Ejecutivos — Ventas y Comercial',
  'tableros-operaciones': 'Tableros Ejecutivos — Operaciones',
  'tableros-finanzas': 'Tableros Ejecutivos — Finanzas',
  'tableros-talento': 'Tableros Ejecutivos — Gestión Humana',
  'area-campo': 'Análisis por Área — Campo',
  'area-packing': 'Análisis por Área — Packing',
  'area-gh': 'Análisis por Área — Gestión Humana',
  'area-comercial': 'Análisis por Área — Comercial',
  'area-finanzas': 'Análisis por Área — Finanzas',
  reportes: 'Reportes y Descargas',
  alertas: 'Alertas y Notificaciones',
  'fuentes-datos': 'Gestión de Datos — Fuentes de Datos',
  'calidad-datos': 'Gestión de Datos — Calidad de Datos',
  'flujos-datos': 'Ciclo de Vida de Datos — Flujos ETL',
  'monitoreo-flujos': 'Ciclo de Vida de Datos — Ejecuciones',
  'config-usuarios': 'Configuración — Usuarios y Roles',
  'config-auditoria': 'Configuración — Auditoría',
  soporte: 'Soporte',
  jira: 'Jira Service Management',
}

function App() {
  const [user, setUser] = useState(loadStoredUser)
  const [activeMenu, setActiveMenu] = useState('inicio')
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  const handleLoginSuccess = ({ user: loggedUser, rememberSession }) => {
    const serialized = JSON.stringify(loggedUser)
    if (rememberSession) {
      localStorage.setItem(SESSION_KEY, serialized)
      sessionStorage.removeItem(SESSION_KEY)
    } else {
      sessionStorage.setItem(SESSION_KEY, serialized)
      localStorage.removeItem(SESSION_KEY)
    }
    setUser(loggedUser)
    setActiveMenu('inicio')
  }

  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(SESSION_KEY)
    setUser(null)
  }

  const handleToggleSidebar = () => {
    setIsMobileSidebarOpen((prev) => !prev)
  }

  if (!user) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />
  }

  const pageTitle =
    activeMenu === 'inicio'
      ? 'Dashboard'
      : SECTION_TITLES[activeMenu] || 'One-Data BI'

  return (
    <div className="h-[100dvh] overflow-hidden bg-[#f0f4f9] flex">
      <Sidebar
        activeMenu={activeMenu}
        onSelectMenu={setActiveMenu}
        user={user}
        onLogout={handleLogout}
        isOpen={true}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
        <Topbar
          title={pageTitle}
          user={user}
          onLogout={handleLogout}
          onToggleSidebar={handleToggleSidebar}
        />

        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
          {activeMenu === 'inicio' ? (
            <DashboardEjecutivoPage onNavigate={setActiveMenu} />
          ) : activeMenu === 'tableros-resumen' ? (
            <ResumenCorporativoPage onNavigate={setActiveMenu} />
          ) : activeMenu === 'tableros-comercial' ? (
            <VentasComercialPage onNavigate={setActiveMenu} />
          ) : activeMenu === 'tableros-operaciones' ? (
            <OperacionesPage onNavigate={setActiveMenu} />
          ) : activeMenu === 'tableros-finanzas' ? (
            <FinanzasPage onNavigate={setActiveMenu} />
          ) : activeMenu === 'tableros-talento' ? (
            <GestionHumanaPage user={user} onNavigate={setActiveMenu} />
          ) : activeMenu === 'area-campo' ? (
            <AreaCampoPage />
          ) : activeMenu === 'area-packing' ? (
            <AreaPackingPage />
          ) : activeMenu === 'area-gh' ? (
            <AreaGestionHumanaPage />
          ) : activeMenu === 'area-comercial' ? (
            <AreaComercialPage />
          ) : activeMenu === 'area-finanzas' ? (
            <AreaFinanzasPage onNavigate={setActiveMenu} />
          ) : activeMenu === 'reportes' ? (
            <ReportesDescargasPage onNavigate={setActiveMenu} />
          ) : activeMenu === 'config-usuarios' ? (
            <ConfiguracionPage key="config-usuarios" initialTab="usuarios" />
          ) : activeMenu === 'config-auditoria' ? (
            <ConfiguracionPage key="config-auditoria" initialTab="auditoria" />
          ) : activeMenu === 'configuracion' ? (
            <ConfiguracionPage key="config-general" initialTab="general" />
          ) : activeMenu === 'jira' ? (
            <JiraServicePage />
          ) : (
            <div className="rounded-xl bg-white border border-slate-200 p-8 shadow-xs text-center space-y-3">
              <h1 className="text-xl font-bold text-[#0d1f3c]">
                {SECTION_TITLES[activeMenu] || 'Sección'}
              </h1>
              <p className="text-sm text-slate-500">
                Esta página se implementará en el siguiente paso.
              </p>
              <button
                type="button"
                onClick={() => setActiveMenu('inicio')}
                className="inline-flex items-center gap-2 rounded-lg bg-[#09499c] hover:bg-[#073b80] px-4 py-2 text-sm font-semibold text-white transition-colors cursor-pointer"
              >
                Volver al Dashboard Ejecutivo
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default App
