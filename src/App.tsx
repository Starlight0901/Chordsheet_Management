import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute, PublicOnlyRoute } from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './context/ToastContext'
import { AppLayout } from './layouts/AppLayout'
import { FavoritesPage } from './pages/FavoritesPage'
import { HomePage } from './pages/HomePage'
import { HymnCreatePage } from './pages/HymnCreatePage'
import { HymnDetailsPage } from './pages/HymnDetailsPage'
import { HymnEditPage } from './pages/HymnEditPage'
import { HymnsPage } from './pages/HymnsPage'
import { ListDetailPage } from './pages/ListDetailPage'
import { LoginPage } from './pages/LoginPage'
import { MyListsPage } from './pages/MyListsPage'
import { SettingsPage } from './pages/SettingsPage'
import { SmartListDetailPage } from './pages/SmartListDetailPage'
import { SmartListEditorPage } from './pages/SmartListEditorPage'
import { SmartListsPage } from './pages/SmartListsPage'
import { WorshipModePage } from './pages/WorshipModePage'
import { WorshipPage } from './pages/WorshipPage'
import { WorshipPlanDetailPage } from './pages/WorshipPlanDetailPage'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<PublicOnlyRoute />}>
                <Route path="/login" element={<LoginPage />} />
              </Route>

              <Route element={<ProtectedRoute />}>
                <Route path="worship/:planId/mode" element={<WorshipModePage />} />

                <Route element={<AppLayout />}>
                  <Route index element={<HomePage />} />
                  <Route path="hymns" element={<HymnsPage />} />
                  <Route path="hymns/new" element={<HymnCreatePage />} />
                  <Route path="hymns/:hymnId/edit" element={<HymnEditPage />} />
                  <Route path="hymns/:hymnId" element={<HymnDetailsPage />} />
                  <Route path="favorites" element={<FavoritesPage />} />
                  <Route path="lists" element={<MyListsPage />} />
                  <Route path="lists/:listId" element={<ListDetailPage />} />
                  <Route path="smart-lists" element={<SmartListsPage />} />
                  <Route path="smart-lists/new" element={<SmartListEditorPage />} />
                  <Route path="smart-lists/:listId/edit" element={<SmartListEditorPage />} />
                  <Route path="smart-lists/:listId" element={<SmartListDetailPage />} />
                  <Route path="worship" element={<WorshipPage />} />
                  <Route path="worship/:planId" element={<WorshipPlanDetailPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
