import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { GraduationCap, Mail, Lock, Eye, EyeOff, User, AlertCircle, BookOpen } from 'lucide-react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { getEmailValidationMessage, isRealisticEmail } from '@/lib/utils'
import { useAuthStore } from '@/store/useAuthStore'

interface FormData {
  name: string
  email: string
  password: string
  confirmPassword: string
  role: 'student'
  grade: string
}

const gradeOptions = Array.from({ length: 12 }, (_, index) => {
  const value = String(index + 1)
  const suffix = value === '1' ? 'st' : value === '2' ? 'nd' : value === '3' ? 'rd' : 'th'
  return { value, label: `${value}${suffix} Standard` }
})

export function Register() {
  const navigate = useNavigate()
  const { register: registerUser, loginError, clearError, loading } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)

  const { register, handleSubmit, getValues, formState: { errors } } = useForm<FormData>({
    defaultValues: { role: 'student' },
  })

  const onSubmit = async (data: FormData) => {
    const ok = await registerUser({
      name: data.name,
      email: data.email,
      password: data.password,
      role: data.role,
      grade: data.grade,
    })
    if (ok) {
      const user = useAuthStore.getState().user
      navigate(user?.role === 'admin' ? '/dashboard' : '/student-dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4 overflow-hidden relative">
      {/* Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div animate={{ x: [0, 30, 0], y: [0, -20, 0] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-300/20 rounded-full blur-3xl" />
        <motion.div animate={{ x: [0, -20, 0], y: [0, 30, 0] }} transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -bottom-32 -right-32 w-96 h-96 bg-purple-300/20 rounded-full blur-3xl" />
      </div>

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
        className="w-full max-w-md relative z-10">

        {/* Header */}
        <div className="text-center mb-7">
          <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12 }}
            className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mb-3 shadow-xl shadow-indigo-500/30">
            <GraduationCap size={26} className="text-white" />
          </motion.div>
          <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
          <p className="text-sm text-gray-500 mt-1">Create your student account</p>
        </div>

        <div className="bg-white/60 backdrop-blur-xl border border-white/30 shadow-2xl rounded-2xl p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex justify-center">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm font-semibold">
                <BookOpen size={15} /> Student Account Registration
              </span>
            </div>

            <input type="hidden" value="student" {...register('role')} />

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  placeholder="Gajanan"
                  {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'Min 2 characters' } })}
                  onChange={() => clearError()}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white/70 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all placeholder-gray-400"
                />
              </div>
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  placeholder="you@school.edu"
                  {...register('email', {
                    required: 'Email is required',
                    validate: (value) => isRealisticEmail(value) || getEmailValidationMessage(),
                  })}
                  onChange={() => clearError()}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white/70 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all placeholder-gray-400"
                />
              </div>
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
            </div>

            {/* Grade (student only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Class</label>
              <select
                {...register('grade')}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white/70 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all"
              >
                <option value="">Select standard</option>
                {gradeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min 6 characters"
                  {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Min 6 characters' } })}
                  onChange={() => clearError()}
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-gray-200 bg-white/70 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all placeholder-gray-400"
                />
                <button type="button" onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Repeat password"
                  {...register('confirmPassword', {
                    required: 'Please confirm password',
                    validate: (v) => v === getValues('password') || 'Passwords do not match',
                  })}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white/70 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all placeholder-gray-400"
                />
              </div>
              {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword.message}</p>}
            </div>

            {/* Server error */}
            {loginError && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
                <AlertCircle size={14} className="text-red-500 shrink-0" />
                <p className="text-xs text-red-600">{loginError}</p>
              </motion.div>
            )}

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.01 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-sm font-semibold transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {loading ? (
                <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg> Creating account...</>
              ) : 'Create Account'}
            </motion.button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">Sign in →</Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
