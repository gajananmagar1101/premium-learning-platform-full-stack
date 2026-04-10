import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { GraduationCap, User, Mail, Lock, Eye, EyeOff, ArrowLeft, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { useAuthStore } from '@/store/useAuthStore'
import { useUIStore } from '@/store/useUIStore'

interface FormData { email: string; password: string }

export function StudentLogin() {
  const navigate = useNavigate()
  const { login, loginError, clearError, loading } = useAuthStore()
  const { addNotification } = useUIStore()
  const [showPw, setShowPw] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>()

  const onSubmit = async (data: FormData) => {
    const ok = await login(data.email, data.password)
    if (ok) {
      const user = useAuthStore.getState().user
      addNotification({
        title: 'Signed in',
        message: `Welcome back, ${user?.name ?? 'student'}.`,
        type: 'success',
      })
      navigate(user?.role === 'admin' ? '/dashboard' : '/student-dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-light-base dark:bg-dark-base flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-teal-600/10 rounded-full blur-3xl" />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="w-full max-w-md relative z-10">

        <Link to="/login" onClick={clearError}
          className="inline-flex items-center gap-1.5 text-sm text-light-ink-muted dark:text-dark-ink-muted hover:text-emerald-400 transition-colors mb-6 group">
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" /> Back
        </Link>

        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-600 rounded-2xl mb-3 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
            <GraduationCap size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-light-ink-primary dark:text-dark-ink-primary">Student Sign In</h1>
          <p className="text-sm text-light-ink-muted dark:text-dark-ink-muted mt-1">Access your learning dashboard</p>
        </div>

        <div className="flex justify-center mb-5">
          <span className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
            <User size={13} /> Student
          </span>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-light-ink-muted dark:text-dark-ink-muted mb-1.5">Email</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-light-ink-muted dark:text-dark-ink-muted" />
                <input type="email" placeholder="you@school.edu"
                  {...register('email', { required: 'Required', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email' } })}
                  onChange={() => clearError()}
                  className="form-input pl-9" />
              </div>
              {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-light-ink-muted dark:text-dark-ink-muted mb-1.5">Password</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-light-ink-muted dark:text-dark-ink-muted" />
                <input type={showPw ? 'text' : 'password'} placeholder="••••••••"
                  {...register('password', { required: 'Required', minLength: { value: 6, message: 'Min 6 chars' } })}
                  onChange={() => clearError()}
                  className="form-input pl-9 pr-10" />
                <button type="button" onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-light-ink-muted dark:text-dark-ink-muted hover:text-light-ink-primary dark:hover:text-dark-ink-primary transition-colors">
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>}
            </div>

            {loginError && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                <AlertCircle size={14} className="text-red-400 shrink-0" />
                <p className="text-xs text-red-300">{loginError}</p>
              </motion.div>
            )}

            <motion.button type="submit" disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.01 }} whileTap={{ scale: loading ? 1 : 0.98 }}
              className="w-full justify-center inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-[0_4px_14px_rgba(16,185,129,0.3)] disabled:opacity-60 disabled:cursor-not-allowed">
              {loading
                ? <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg> Signing in...</>
                : 'Sign In as Student'}
            </motion.button>
          </form>

          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-light-ink-muted dark:text-dark-ink-muted">
              Teacher?{' '}
              <Link to="/login/admin" onClick={clearError} className="text-indigo-400 hover:text-indigo-300 font-medium">Admin login →</Link>
            </p>
            <Link to="/register" className="text-xs text-emerald-400 hover:text-emerald-300 font-medium">Create account</Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
