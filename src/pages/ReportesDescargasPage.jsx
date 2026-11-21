import { useState } from 'react'

const AVAILABLE_REPORTS = [
  {
    id: 'rep-resumen',
    title: 'Resumen Ejecutivo',
    subtitle: 'Vista general del negocio',
    area: 'Todas',
    type: 'Ejecutivo',
    targetMenu: 'tableros-resumen',
    cardBg: 'bg-[#f4fbf7]',
    iconBg: 'bg-[#dcfce7]',
    iconColor: 'text-emerald-700',
    icon: 'chart',
  },
  {
    id: 'rep-ventas',
    title: 'Ventas y Comercial',
    subtitle: 'Desempeño comercial',
    area: 'Comercial',
    type: 'Ejecutivo',
    targetMenu: 'tableros-comercial',
    cardBg: 'bg-[#f4f8ff]',
    iconBg: 'bg-[#dbeafe]',
    iconColor: 'text-[#0b63d6]',
    icon: 'cart',
  },
  {
    id: 'rep-operaciones',
    title: 'Operaciones',
    subtitle: 'Producción y eficiencia',
    area: 'Campo',
    type: 'Operativo',
    targetMenu: 'tableros-operaciones',
    cardBg: 'bg-[#f3fbf9]',
    iconBg: 'bg-[#ccfbf1]',
    iconColor: 'text-emerald-700',
    icon: 'gear',
  },
  {
    id: 'rep-finanzas',
    title: 'Finanzas',
    subtitle: 'Resultados financieros',
    area: 'Finanzas',
    type: 'Financiero',
    targetMenu: 'tableros-finanzas',
    cardBg: 'bg-[#f8f6ff]',
    iconBg: 'bg-[#ede9fe]',
    iconColor: 'text-violet-700',
    icon: 'coins',
  },
  {
    id: 'rep-rrhh',
    title: 'Gestión Humana',
    subtitle: 'Personal y talento',
    area: 'Gestión Humana',
    type: 'Operativo',
    targetMenu: 'tableros-talento',
    cardBg: 'bg-[#f3fbfc]',
    iconBg: 'bg-[#cffafe]',
    iconColor: 'text-teal-700',
    icon: 'users',
  },
  {
    id: 'rep-calidad',
    title: 'Calidad de Datos',
    subtitle: 'Integridad y calidad',
    area: 'Todas',
    type: 'Calidad',
    targetMenu: 'calidad-datos',
    cardBg: 'bg-[#fffaf3]',
    iconBg: 'bg-[#ffedd5]',
    iconColor: 'text-amber-600',
    icon: 'clipboard',
  },
]

const RECENT_DOWNLOADS = [
  {
    id: 'dl-1',
    file: 'reporte_ventas_abril_2025.xlsx',
    report: 'Ventas y Comercial',
    date: '24/04/2025 10:15',
    status: 'Completado',
  },
  {
    id: 'dl-2',
    file: 'resumen_operaciones_abril.pdf',
    report: 'Operaciones',
    date: '23/04/2025 16:42',
    status: 'Completado',
  },
  {
    id: 'dl-3',
    file: 'kpi_finanzas_abril.xlsx',
    report: 'Finanzas',
    date: '22/04/2025 14:20',
    status: 'Completado',
  },
  {
    id: 'dl-4',
    file: 'reporte_rrhh_abril.pdf',
    report: 'Gestión Humana',
    date: '21/04/2025 11:30',
    status: 'Completado',
  },
]

function ReportIcon({ type, className }) {
  switch (type) {
    case 'chart':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <rect x="4" y="13" width="3.5" height="7" rx="1" />
          <rect x="10.25" y="9" width="3.5" height="11" rx="1" />
          <rect x="16.5" y="4" width="3.5" height="16" rx="1" />
        </svg>
      )
    case 'cart':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2Zm10 0c-1.1 0-1.99.9-1.99 2S15.9 22 17 22s2-.9 2-2-.9-2-2-2ZM7.17 14.75l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1 1 0 0 0 20 4H5.21l-.94-2H1v2h2l3.6 7.59-1.35 2.44C4.52 15.37 5.48 17 7 17h12v-2H7.42c-.14 0-.25-.11-.25-.25Z" />
        </svg>
      )
    case 'gear':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.14 12.94a7.49 7.49 0 0 0 .05-.94 7.49 7.49 0 0 0-.05-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.14 7.14 0 0 0-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84a.48.48 0 0 0-.48.41l-.36 2.54a7.14 7.14 0 0 0-1.62.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 8.84a.5.5 0 0 0 .12.64l2.03 1.58a7.49 7.49 0 0 0-.05.94 7.49 7.49 0 0 0 .05.94L2.83 14.52a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .6.22l2.39-.96c.5.38 1.05.7 1.62.94l.36 2.54a.48.48 0 0 0 .48.41h3.84a.48.48 0 0 0 .48-.41l.36-2.54c.57-.24 1.12-.56 1.62-.94l2.39.96a.5.5 0 0 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 15.5 12 3.5 3.5 0 0 1 12 15.5Z" />
        </svg>
      )
    case 'coins':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <ellipse cx="10" cy="7" rx="6" ry="2.5" />
          <path d="M4 10v3c0 1.38 2.69 2.5 6 2.5s6-1.12 6-2.5v-3c-1.3.92-3.5 1.5-6 1.5S5.3 10.92 4 10Zm0 5v3c0 1.38 2.69 2.5 6 2.5s6-1.12 6-2.5v-3c-1.3.92-3.5 1.5-6 1.5S5.3 15.92 4 15Z" />
        </svg>
      )
    case 'users':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3Zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3Zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5Zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5Z" />
        </svg>
      )
    case 'clipboard':
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="8" y="2" width="8" height="4" rx="1" />
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <path d="m9 14 2 2 4-4" />
        </svg>
      )
    default:
      return null
  }
}

export default function ReportesDescargasPage({ onNavigate }) {
  const [selectedArea, setSelectedArea] = useState('Todas')
  const [selectedType, setSelectedType] = useState('Todos')
  const [selectedPeriod, setSelectedPeriod] = useState('30d')
  const [downloads, setDownloads] = useState(RECENT_DOWNLOADS)
  const [toast, setToast] = useState('')

  const filteredReports = AVAILABLE_REPORTS.filter((rep) => {
    const areaMatch =
      selectedArea === 'Todas' ||
      rep.area === selectedArea ||
      rep.area === 'Todas'
    const typeMatch = selectedType === 'Todos' || rep.type === selectedType
    return areaMatch && typeMatch
  })

  const handleRefresh = () => {
    setToast('Catálogo de reportes actualizado correctamente.')
    setTimeout(() => setToast(''), 3000)
  }

  const handleDownloadFile = (item) => {
    const content = `Reporte,Archivo,Fecha,Estado\n"${item.report}","${item.file}","${item.date}","${item.status}"\n`
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = item.file.replace(/\.(xlsx|pdf)$/, '.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleScheduleReport = () => {
    const now = new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date())

    const newEntry = {
      id: `dl-${Date.now()}`,
      file: 'reporte_programado_onedata.xlsx',
      report: selectedArea === 'Todas' ? 'Resumen Ejecutivo' : selectedArea,
      date: now,
      status: 'Completado',
    }
    setDownloads((prev) => [newEntry, ...prev.slice(0, 3)])
    setToast('Reporte programado y agregado a tus descargas recientes.')
    setTimeout(() => setToast(''), 3000)
  }

  return (
    <div className="space-y-5">
      {/* Header & Filters */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-1 text-[#0d1f3c]">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
              <rect x="4" y="13" width="3.5" height="7" rx="1" />
              <rect x="10.25" y="9" width="3.5" height="11" rx="1" />
              <rect x="16.5" y="4" width="3.5" height="16" rx="1" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#0d1f3c] leading-tight">
              Reportes y Descargas
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Accede a reportes, exporta información y programa tus descargas
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:flex-wrap items-end gap-3 w-full xl:w-auto">
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Área
            </label>
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className="w-full md:w-auto h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs sm:text-sm text-slate-700 focus:border-[#0d6efd] focus:outline-none"
            >
              <option value="Todas">Todas las áreas</option>
              <option value="Campo">Campo</option>
              <option value="Comercial">Comercial</option>
              <option value="Finanzas">Finanzas</option>
              <option value="Gestión Humana">Gestión Humana</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Tipo de reporte
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full md:w-auto h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs sm:text-sm text-slate-700 focus:border-[#0d6efd] focus:outline-none"
            >
              <option value="Todos">Todos los tipos</option>
              <option value="Ejecutivo">Ejecutivo</option>
              <option value="Operativo">Operativo</option>
              <option value="Financiero">Financiero</option>
              <option value="Calidad">Calidad</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Periodo
            </label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full md:w-auto h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs sm:text-sm text-slate-700 focus:border-[#0d6efd] focus:outline-none"
            >
              <option value="30d">Últimos 30 días</option>
              <option value="7d">Últimos 7 días</option>
              <option value="90d">Últimos 90 días</option>
              <option value="year">Este año</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            className="w-full md:w-auto justify-center h-9 inline-flex items-center gap-2 rounded-lg bg-[#0b5ed7] hover:bg-[#094db3] px-4 text-xs sm:text-sm font-semibold text-white shadow-xs transition-colors cursor-pointer"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 16h5v5" />
            </svg>
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {toast && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-xs sm:text-sm font-medium text-emerald-700">
          {toast}
        </div>
      )}

      {/* Main Content: 2 Columns */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Left: Reportes Disponibles */}
        <section className="xl:col-span-7 rounded-xl bg-white border border-slate-200/80 shadow-xs p-5">
          <div className="flex items-center gap-2 text-[#0d1f3c] font-bold text-[15px] mb-4">
            <svg
              className="h-4 w-4 text-[#0b5ed7]"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm-1 13H8v-2h5v2Zm3-4H8V9h8v2Z" />
            </svg>
            <h2>Reportes Disponibles</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredReports.map((rep) => (
              <div
                key={rep.id}
                className={`rounded-xl ${rep.cardBg} border border-slate-200/70 p-5 flex flex-col items-center text-center justify-between gap-3 transition hover:shadow-sm`}
              >
                <div
                  className={`h-14 w-14 rounded-full ${rep.iconBg} flex items-center justify-center`}
                >
                  <ReportIcon
                    type={rep.icon}
                    className={`h-7 w-7 ${rep.iconColor}`}
                  />
                </div>

                <div>
                  <h3 className="text-sm font-bold text-[#0d1f3c]">
                    {rep.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {rep.subtitle}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigate?.(rep.targetMenu)}
                  className="mt-1 inline-flex items-center gap-1 rounded-lg bg-white border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-[#0b5ed7] transition-colors cursor-pointer shadow-2xs"
                >
                  <span>Ver Reporte</span>
                  <span>→</span>
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Right: Mis Descargas Recientes + Sistema disponible */}
        <div className="xl:col-span-5 space-y-5">
          <section className="rounded-xl bg-white border border-slate-200/80 shadow-xs p-5">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 text-[#0d1f3c] font-bold text-[15px]">
                <svg
                  className="h-4 w-4 text-[#0b5ed7]"
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
                <h2>Mis Descargas Recientes</h2>
              </div>

              <button
                type="button"
                onClick={handleRefresh}
                className="text-xs font-semibold text-[#1565c0] hover:underline cursor-pointer"
              >
                Ver todas →
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                    <th className="py-2 pr-2">Archivo</th>
                    <th className="py-2 px-2">Reporte</th>
                    <th className="py-2 px-2">Fecha</th>
                    <th className="py-2 px-2">Estado</th>
                    <th className="py-2 pl-2 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {downloads.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 pr-2 font-medium text-slate-700 max-w-[150px] truncate">
                        {item.file}
                      </td>
                      <td className="py-2.5 px-2 text-slate-600 whitespace-nowrap">
                        {item.report}
                      </td>
                      <td className="py-2.5 px-2 text-slate-500 whitespace-nowrap">
                        {item.date}
                      </td>
                      <td className="py-2.5 px-2">
                        <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                          {item.status}
                        </span>
                      </td>
                      <td className="py-2.5 pl-2 text-right">
                        <button
                          type="button"
                          onClick={() => handleDownloadFile(item)}
                          title={`Descargar ${item.file}`}
                          className="p-1.5 rounded-md text-[#0b5ed7] hover:bg-sky-50 transition-colors cursor-pointer"
                        >
                          <svg
                            className="h-4 w-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M12 3v12" />
                            <path d="m7 10 5 5 5-5" />
                            <path d="M4 19h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-xl bg-[#eaf7ef] border border-emerald-200/80 shadow-xs p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-emerald-600 flex items-center justify-center text-white text-lg font-bold shrink-0">
                ✓
              </div>
              <div>
                <p className="text-sm font-bold text-[#0d1f3c]">
                  Sistema disponible
                </p>
                <p className="text-xs text-slate-600">
                  Última actualización: 24/04/2025 10:30
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleScheduleReport}
              className="inline-flex items-center gap-2 rounded-lg bg-white border border-slate-200 px-3.5 py-2 text-xs font-semibold text-[#0d1f3c] hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
            >
              <svg
                className="h-4 w-4 text-[#0b5ed7]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span>Programar Reporte</span>
            </button>
          </section>
        </div>
      </div>
    </div>
  )
}
