import { getRequestContext } from '@cloudflare/next-on-pages'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from './schema'

/**
 * Returns a Drizzle client bound to the D1 database for this request.
 * Must be called inside an Edge Runtime request handler.
 */
export function getDB() {
  const { env } = getRequestContext<{ Bindings: CloudflareEnv }>()
  return drizzle(env.DB, { schema })
}

export type DB = ReturnType<typeof getDB>
