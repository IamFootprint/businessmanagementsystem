import type { Hono } from 'hono'
import type { AppEnv } from '../types'
import { sessionMiddleware } from '../middleware/session.middleware'
import { requireRole } from '../middleware/role.middleware'
import { listSuppliers, getSupplier, createSupplier, addSupplierAlias } from '../controllers/supplier.controller'

const readRoles = ['TENANT_OWNER', 'FINANCE_MANAGER', 'ACCOUNTANT'] as const
const writeRoles = ['TENANT_OWNER', 'FINANCE_MANAGER'] as const

export function registerSupplierRoutes(app: Hono<AppEnv>) {
  app.get('/suppliers', sessionMiddleware, requireRole(...readRoles), listSuppliers)
  app.post('/suppliers', sessionMiddleware, requireRole(...writeRoles), createSupplier)
  app.get('/suppliers/:id', sessionMiddleware, requireRole(...readRoles), getSupplier)
  app.post('/suppliers/:id/aliases', sessionMiddleware, requireRole(...writeRoles), addSupplierAlias)
}
