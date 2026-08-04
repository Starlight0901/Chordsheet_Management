import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from '../components/Sidebar'
import { TopBar } from '../components/TopBar'

const pageTitles: Record<string, string> = {
  '/': 'Home',
  '/hymns': 'Hymns',
  '/favorites': 'Favorites',
  '/lists': 'My Lists',
  '/smart-lists': 'Smart Lists',
  '/worship': 'Worship',
  '/settings': 'Settings',
  '/login': 'Login',
}

function resolveTitle(pathname: string): string {
  if (pathname === '/hymns/new') {
    return 'Add Hymn'
  }
  if (pathname.endsWith('/edit') && pathname.startsWith('/hymns/')) {
    return 'Edit Hymn'
  }
  if (pathname.startsWith('/hymns/') && pathname !== '/hymns') {
    return 'Hymn Details'
  }
  if (pathname.startsWith('/lists/') && pathname !== '/lists') {
    return 'List'
  }
  if (pathname === '/smart-lists/new') {
    return 'New Smart List'
  }
  if (pathname.endsWith('/edit') && pathname.startsWith('/smart-lists/')) {
    return 'Edit Smart List'
  }
  if (pathname.startsWith('/smart-lists/') && pathname !== '/smart-lists') {
    return 'Smart List'
  }
  if (pathname.startsWith('/worship/') && pathname !== '/worship') {
    return 'Worship plan'
  }
  return pageTitles[pathname] ?? 'HymnBook'
}

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { pathname } = useLocation()
  const title = resolveTitle(pathname)

  return (
    <div className="flex min-h-dvh overflow-x-clip">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar title={title} onMenuClick={() => setSidebarOpen(true)} />
        <main className="safe-area-pb flex-1 px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
