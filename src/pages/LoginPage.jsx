import { useState } from 'react'
import { apiFetch } from '../lib/api'

export default function LoginPage({ onLoginSuccess }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberSession, setRememberSession] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!username.trim() || !password) {
      setFeedback({
        type: 'error',
        message: 'Por favor, ingresa tu usuario corporativo y contraseña.',
      })
      return
    }

    setIsSubmitting(true)
    setFeedback(null)

    try {
      const response = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.ok) {
        setFeedback({
          type: 'error',
          message: data.message || 'No se pudo iniciar sesión.',
        })
        return
      }

      setFeedback({
        type: 'success',
        message: `Bienvenido, ${data.user.nombres} ${data.user.apellidos}.`,
      })

      if (onLoginSuccess) {
        onLoginSuccess({
          user: data.user,
          rememberSession,
        })
      }
    } catch {
      setFeedback({
        type: 'error',
        message:
          'No se pudo conectar con el servidor. Verifica que el backend esté activo.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleForgotPassword = () => {
    setFeedback({
      type: 'info',
      message:
        'Para restablecer tu contraseña, contacta al área de Soporte de TI.',
    })
  }

  return (
    <main
      className="relative min-h-[100dvh] w-full bg-cover bg-center bg-no-repeat flex items-center justify-center lg:justify-end px-4 py-6 sm:px-8 lg:pr-16 xl:pr-24"
      style={{ backgroundImage: "url('/img/fondoInicio.png')" }}
    >
      {/* Subtle overlay on small screens so the centered card stands out clearly */}
      <div className="pointer-events-none absolute inset-0 bg-slate-950/25 lg:bg-transparent" />

      <section
        aria-labelledby="login-title"
        className="relative z-10 w-full max-w-[440px] rounded-2xl bg-white/95 backdrop-blur-sm shadow-[0_20px_50px_rgba(8,25,58,0.35)] border border-white/60 px-5 py-7 sm:px-10 sm:py-10"
      >
        {/* Logo */}
        <div className="flex justify-center mb-4">
          <img
            src="/img/logoOneData.png"
            alt="One-Data BI"
            className="h-14 w-auto object-contain select-none"
          />
        </div>

        {/* Heading */}
        <div className="text-center mb-7">
          <h1
            id="login-title"
            className="text-[28px] sm:text-[30px] font-bold tracking-tight text-[#0d1f3c] leading-tight"
          >
            Iniciar sesión
          </h1>
          <p className="mt-1.5 text-sm sm:text-[15px] text-slate-600">
            Accede a tu espacio de análisis
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Corporate user field */}
          <div>
            <label htmlFor="username" className="sr-only">
              Usuario corporativo
            </label>
            <div className="flex items-center gap-3 rounded-lg border border-slate-300 bg-white px-3.5 py-3 transition focus-within:border-[#0b4ea2] focus-within:ring-2 focus-within:ring-[#0b4ea2]/20">
              <svg
                className="h-5 w-5 shrink-0 text-[#2b4263]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20 21a8 8 0 0 0-16 0" />
                <circle cx="12" cy="8" r="4" />
              </svg>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                placeholder="Usuario corporativo"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value)
                  if (feedback) setFeedback(null)
                }}
                className="w-full bg-transparent text-[15px] text-slate-800 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Password field */}
          <div>
            <label htmlFor="password" className="sr-only">
              Contraseña
            </label>
            <div className="flex items-center gap-3 rounded-lg border border-slate-300 bg-white px-3.5 py-3 transition focus-within:border-[#0b4ea2] focus-within:ring-2 focus-within:ring-[#0b4ea2]/20">
              <svg
                className="h-5 w-5 shrink-0 text-[#2b4263]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="4" y="11" width="16" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                <circle cx="12" cy="16" r="1" fill="currentColor" />
              </svg>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (feedback) setFeedback(null)
                }}
                className="w-full bg-transparent text-[15px] text-slate-800 placeholder:text-slate-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={
                  showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                }
                className="shrink-0 text-[#2b4263] hover:text-[#0b4ea2] transition-colors focus:outline-none cursor-pointer"
              >
                {showPassword ? (
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                ) : (
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c6.5 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3.5 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                    <line x1="2" y1="2" x2="22" y2="22" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Remember & Forgot Password */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-[13px] sm:text-sm">
            <label className="inline-flex items-center gap-2 text-slate-700 font-medium cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberSession}
                onChange={(e) => setRememberSession(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[#0b4ea2] focus:ring-[#0b4ea2] cursor-pointer"
              />
              <span>Recordar mi sesión</span>
            </label>

            <button
              type="button"
              onClick={handleForgotPassword}
              className="font-medium text-[#1259b5] hover:text-[#093d80] hover:underline transition-colors cursor-pointer"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          {/* Feedback message */}
          {feedback && (
            <div
              role="alert"
              className={`rounded-lg px-3.5 py-2.5 text-xs sm:text-sm font-medium ${
                feedback.type === 'error'
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : feedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-sky-50 text-sky-800 border border-sky-200'
              }`}
            >
              {feedback.message}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-1 flex w-full items-center justify-center gap-2.5 rounded-lg bg-[#09499c] hover:bg-[#073b80] active:bg-[#052e66] disabled:opacity-60 disabled:cursor-not-allowed px-4 py-3.5 text-base font-semibold text-white shadow-md shadow-[#09499c]/25 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#09499c] focus:ring-offset-2"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h14" />
              <path d="m13 6 6 6-6 6" />
            </svg>
            <span>{isSubmitting ? 'Ingresando...' : 'Ingresar'}</span>
          </button>
        </form>

        {/* Version footer */}
        <div className="mt-7 flex items-center gap-3 text-xs text-slate-500">
          <span className="h-px flex-1 bg-slate-200" />
          <span>One-Data BI v1.0.0</span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>
      </section>
    </main>
  )
}
