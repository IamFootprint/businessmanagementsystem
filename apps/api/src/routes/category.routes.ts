// apps/api/src/routes/category.routes.ts
import type { Hono } from 'hono'
import type { AppEnv } from '../types'
import { sessionMiddleware } from '../middleware/session.middleware'
import { requireRole } from '../middleware/role.middleware'
import { listCategories, createCategory, updateCategory, deleteCategory } from '../controllers/category.controller'

export function registerCategoryRoutes(app: Hono<AppEnv>) {
  app.get('/categories', sessionMiddleware, listCategories)
  app.post('/categories', sessionMiddleware, requireRole('TENANT_OWNER', 'FINANCE_MANAGER'), createCategory)
  app.patch('/categories/:id', sessionMiddleware, requireRole('TENANT_OWNER', 'FINANCE_MANAGER'), updateCategory)
  app.delete('/categories/:id', sessionMiddleware, requireRole('TENANT_OWNER', 'FINANCE_MANAGER'), deleteCategory)
}
