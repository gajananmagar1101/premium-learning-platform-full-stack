import axios from 'axios'

const RENDER_URL = 'https://premium-learning-platform-full-stack.onrender.com/api'

const getBaseURL = () => {
  const envURL = import.meta.env.VITE_API_URL
  if (envURL) {
    // ensure it always ends with /api
    return envURL.endsWith('/api') ? envURL : `${envURL.replace(/\/$/, '')}/api`
  }
  return import.meta.env.DEV ? 'http://localhost:5002/api' : RENDER_URL
}

const api = axios.create({
  baseURL: getBaseURL(),
  headers: { 'Content-Type': 'application/json' },
})

let handlingUnauthorized = false

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !handlingUnauthorized) {
      handlingUnauthorized = true
      localStorage.removeItem('token')
      localStorage.removeItem('auth-store')

      if (window.location.pathname !== '/login') {
        window.location.replace('/login')
      }

      window.setTimeout(() => {
        handlingUnauthorized = false
      }, 250)
    }
    return Promise.reject(err)
  }
)

export default api
