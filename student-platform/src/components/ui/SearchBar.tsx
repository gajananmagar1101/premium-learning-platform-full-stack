import { useState } from 'react'
import { Search, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAssessmentStore } from '@/store/useAssessmentStore'
import { useStudentStore } from '@/store/useStudentStore'

const normalizeGrade = (value?: string) =>
  (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/class/g, '')
    .replace(/grade/g, '')
    .replace(/\s+/g, '')
    .replace(/(st|nd|rd|th)$/g, '')

export function SearchBar() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const { assessments } = useAssessmentStore()
  const { students } = useStudentStore()
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
        path: `/students/class?grade=${encodeURIComponent(normalizeGrade(s.grade) || '1')}`,
        kind: 'Student',
      })),
  ] : []

  const go = (path: string) => { navigate(path); setOpen(false); setQuery('') }

  return (
    <div className="relative">
      <button onClick={() => setOpen(true)}
        className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-light-card2 dark:bg-dark-card2 border border-light-border dark:border-dark-border text-sm text-light-ink-muted dark:text-dark-ink-muted hover:border-accent/50 transition-colors w-48">
        <Search size={13} /> Search...
        <kbd className="ml-auto text-[10px] bg-light-base dark:bg-dark-base px-1.5 py-0.5 rounded font-mono text-light-ink-muted dark:text-dark-ink-muted">⌘K</kbd>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
              onClick={() => { setOpen(false); setQuery('') }} />
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: -8 }} transition={{ duration: 0.15 }}
              className="fixed top-20 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 card overflow-hidden shadow-2xl">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-light-border dark:border-dark-border">
                <Search size={15} className="text-light-ink-muted dark:text-dark-ink-muted" />
                <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search assessments, students..."
                  className="flex-1 text-sm text-light-ink-primary dark:text-dark-ink-primary bg-transparent outline-none placeholder-light-ink-muted dark:placeholder-dark-ink-muted" />
                <button onClick={() => { setOpen(false); setQuery('') }}>
                  <X size={15} className="text-light-ink-muted dark:text-dark-ink-muted hover:text-light-ink-primary dark:hover:text-dark-ink-primary transition-colors" />
                </button>
              </div>
              {results.length > 0 && (
                <div className="py-2">
                  {results.map((r, i) => (
                    <button key={i} onClick={() => go(r.path)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-light-hover dark:hover:bg-dark-hover transition-colors text-left">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-medium shrink-0">{r.kind}</span>
                      <div>
                        <p className="text-sm font-medium text-light-ink-primary dark:text-dark-ink-primary">{r.label}</p>
                        <p className="text-xs text-light-ink-muted dark:text-dark-ink-muted">{r.sub}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {query.trim().length > 1 && results.length === 0 && (
                <p className="text-sm text-light-ink-muted dark:text-dark-ink-muted text-center py-6">No results found</p>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
