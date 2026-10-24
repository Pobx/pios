import { Route, Routes } from 'react-router-dom'
import { ProtectedRoute, RequireRole } from '@/features/auth/ProtectedRoute'
import { MePage } from '@/features/me/MePage'
import { OrganizationsPage } from '@/features/organizations/OrganizationsPage'
import {
  UsersPage,
  InventoryPage,
  FoodWastePage,
  RecycleBankPage,
  TabwaterPage,
} from '@/features/modules/ModulesPages'
import { Layout } from './Layout'
import { ForbiddenPage, HomePage, NotFoundPage } from './pages'

const ORG_ROLES = ['admin', 'super_admin'] as const
const STAFF_ROLES = [
  'super_admin',
  'admin',
  'finance_staff',
  'tabwater_staff',
  'recycle_bank_staff',
  'foodwaste_staff',
  'annual_staff',
] as const
const INV_ROLES = ['super_admin', 'admin', 'finance_staff'] as const
const FW_ROLES = ['super_admin', 'admin', 'foodwaste_staff'] as const
const RC_ROLES = ['super_admin', 'admin', 'recycle_bank_staff', 'finance_staff'] as const
const TW_ROLES = ['super_admin', 'admin', 'tabwater_staff', 'finance_staff'] as const

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
          <Route element={<RequireRole roles={STAFF_ROLES} />}>
            <Route path="users" element={<UsersPage />} />
          </Route>
          <Route element={<RequireRole roles={INV_ROLES} />}>
            <Route path="inventory" element={<InventoryPage />} />
          </Route>
          <Route element={<RequireRole roles={FW_ROLES} />}>
            <Route path="foodwaste" element={<FoodWastePage />} />
          </Route>
          <Route element={<RequireRole roles={RC_ROLES} />}>
            <Route path="recycle" element={<RecycleBankPage />} />
          </Route>
          <Route element={<RequireRole roles={TW_ROLES} />}>
            <Route path="tabwater" element={<TabwaterPage />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
