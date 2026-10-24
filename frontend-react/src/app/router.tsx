import { Route, Routes } from 'react-router-dom'
import { ProtectedRoute, RequireRole } from '@/features/auth/ProtectedRoute'
import { MePage } from '@/features/me/MePage'
import { OrganizationsPage } from '@/features/organizations/OrganizationsPage'
import { Layout } from './Layout'
import { ForbiddenPage, HomePage, NotFoundPage } from './pages'

const ORG_ROLES = ['admin', 'super_admin'] as const

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="403" element={<ForbiddenPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="me" element={<MePage />} />
          <Route element={<RequireRole roles={ORG_ROLES} />}>
            <Route path="organizations" element={<OrganizationsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
