import axios from 'axios'

const RENDER_URL = 'https://student-learning-platform-api.onrender.com/api'
const LOCAL_API_CANDIDATES = ['http://127.0.0.1:5003/api', 'http://127.0.0.1:5002/api']

const normalizeApiUrl = (url: string) => (url.endsWith('/api') ? url : `${url.replace(/\/$/, '')}/api`)

const getBaseURLs = () => {
  const envURL = import.meta.env.VITE_API_URL
  if (envURL) {
    return [normalizeApiUrl(envURL)]
  }

  return import.meta.env.DEV ? [...LOCAL_API_CANDIDATES, RENDER_URL] : [RENDER_URL]
}

const BASE_URLS = getBaseURLs()

const api = axios.create({
  baseURL: BASE_URLS[0],
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
  async (err) => {
    const requestConfig = err.config as (typeof err.config & { __baseUrlRetryIndex?: number }) | undefined

    if (err.request && !err.response && requestConfig) {
      const currentRetryIndex = requestConfig.__baseUrlRetryIndex ?? 0
      const nextBaseURL = BASE_URLS[currentRetryIndex + 1]

      if (nextBaseURL) {
        requestConfig.__baseUrlRetryIndex = currentRetryIndex + 1
        requestConfig.baseURL = nextBaseURL
        api.defaults.baseURL = nextBaseURL
        return api.request(requestConfig)
      }
    }

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
