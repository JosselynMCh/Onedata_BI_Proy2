export default function PageLoader({ message = 'Cargando datos...' }) {
  return (
    <div
      className="flex min-h-[280px] w-full flex-col items-center justify-center gap-3 rounded-xl bg-white/80 border border-slate-200/70 p-8"
      role="status"
      aria-live="polite"
    >
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#0b63d6]" />
      <p className="text-xs sm:text-sm font-medium text-slate-500">{message}</p>
    </div>
  )
}
