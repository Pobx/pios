// Barrel re-export for backward compatibility with existing tests
// New features should import directly from @/features/<slice>
export * from '@/shared/ui'
export { TabwaterPage, PrintableInvoiceModal } from '@/features/tabwater'
export { RecycleBankPage } from '@/features/recycle-bank'
export { FoodWastePage } from '@/features/foodwaste'
export { InventoryPage } from '@/features/inventory'
export { UsersPage } from '@/features/users'
export { ResidentPage } from '@/features/resident'
