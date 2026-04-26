import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAssessmentStore } from '@/store/useAssessmentStore'
import { useStudentStore } from '@/store/useStudentStore'
import { useQuizStore } from '@/store/useQuizStore'
import { normalizeAcademicYear } from '@/lib/btech'

export function SearchBar() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { assessments } = useAssessmentStore()
  const { students } = useStudentStore()
  const { quizzes } = useQuizStore()
  const normalizedQuery = query.toLowerCase().trim()

  const results = normalizedQuery.length > 1 ? [
    ...assessments
      .filter((a) => a.title.toLowerCase().includes(normalizedQuery) || a.subject.toLowerCase().includes(normalizedQuery))
      .slice(0, 3)
      .map((a) => ({ label: a.title, sub: a.subject, path: '/assessments', kind: 'Assessment' })),
    ...students
      .filter((s) =>
        s.name.toLowerCase().includes(normalizedQuery) ||
        s.email.toLowerCase().includes(normalizedQuery)
      )
      .slice(0, 3)
      .map((s) => ({
        label: s.name,
        sub: s.email,
        path: `/students/class?grade=${encodeURIComponent(normalizeAcademicYear(s.grade) || 'FE')}`,
        kind: 'Learner',
      })),
    ...quizzes
      .filter((quiz) =>
        quiz.title.toLowerCase().includes(normalizedQuery) ||
        quiz.subject.toLowerCase().includes(normalizedQuery)
      )
      .slice(0, 3)
      .map((quiz) => ({
        label: quiz.title,
        sub: `${quiz.subject} · ${quiz.status}`,
        path: '/quizzes',
        kind: 'Quiz',
      })),
  ] : []

  const go = (path: string) => { navigate(path); setOpen(false); setQuery('') }

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!searchRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  return (
    <div ref={searchRef} className="relative hidden md:block">
      <div className="flex h-[2.125rem] w-48 items-center gap-2 rounded-full border border-slate-200/80 bg-slate-100/80 px-3 text-light-ink-secondary shadow-sm transition-all focus-within:w-56 focus-within:border-slate-300 focus-within:bg-white dark:border-white/20 dark:bg-white/10 dark:text-slate-100 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] dark:focus-within:border-indigo-300/40 dark:focus-within:bg-white/15 lg:w-64 lg:focus-within:w-72">
        <Search size={14} className="shrink-0 text-light-ink-muted dark:text-slate-300" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setOpen(false)
            if (event.key === 'Enter' && results[0]) go(results[0].path)
          }}
          placeholder="Search"
          className="min-w-0 flex-1 bg-transparent text-[13px] font-normal outline-none placeholder:text-light-ink-muted dark:text-slate-100 dark:placeholder:text-slate-300"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setOpen(false)
            }}
            className="shrink-0 text-light-ink-muted transition-colors hover:text-light-ink-primary dark:text-slate-300 dark:hover:text-white"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <AnimatePresence>
        {open && query.trim().length > 1 && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.14 }}
            className="absolute right-0 top-10 z-50 w-72 overflow-hidden rounded-2xl border border-light-border bg-white/95 p-2 shadow-2xl backdrop-blur-xl dark:border-dark-border dark:bg-dark-card/95"
            >
              {results.length > 0 && (
                <div className="space-y-1">
                  {results.map((r, i) => (
                    <button
                      key={i}
                      onMouseDown={(event) => {
                        event.preventDefault()
                        go(r.path)
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-light-hover dark:hover:bg-dark-hover"
                    >
                      <span className="shrink-0 rounded-full bg-indigo-500/12 px-2 py-0.5 text-xs font-medium text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">{r.kind}</span>
                      <div>
                        <p className="text-sm font-medium text-light-ink-primary dark:text-dark-ink-primary">{r.label}</p>
                        <p className="text-xs text-light-ink-muted dark:text-dark-ink-muted">{r.sub}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {results.length === 0 && (
                <p className="py-5 text-center text-sm text-light-ink-muted dark:text-dark-ink-muted">No results found</p>
              )}
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
