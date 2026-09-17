import { Hono } from 'hono'
import { getVercelOidcToken } from '@vercel/oidc'

const app = new Hono()

const SKILLS_SH_BASE_URL = 'https://skills.sh'
const RATE_LIMIT_HEADERS = ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset', 'Retry-After']

const welcomeStrings = [
  'Hello Hono!',
  'To learn more about Hono on Vercel, visit https://vercel.com/docs/frameworks/backend/hono'
]

app.get('/', (c) => {
  return c.text(welcomeStrings.join('\n\n'))
})

// Only requests carrying our shared secret can use the proxy — the BFF's
// deployed URL is public, and without this anyone could ride our skills.sh
// OIDC quota.
app.use('/api/v1/*', async (c, next) => {
  const secret = process.env.BFF_SHARED_SECRET
  if (secret && c.req.header('x-bff-auth') !== secret) {
    return c.json({ error: 'unauthorized' }, 401)
  }
  await next()
})

// Proxies everything under /api/v1/* to skills.sh, attaching a fresh Vercel
// OIDC token per request (skills.sh verifies it directly — it is not a
// Vercel Connect connector).
app.all('/api/v1/*', async (c) => {
  let token: string
  try {
    token = await getVercelOidcToken()
  } catch (error) {
    console.error('Failed to obtain Vercel OIDC token', error)
    return c.json({ error: 'oidc_token_unavailable', message: 'Could not obtain a Vercel OIDC token for this deployment.' }, 500)
  }

  const target = new URL(c.req.path, SKILLS_SH_BASE_URL)
  target.search = new URL(c.req.url).search

  const upstream = await fetch(target, {
    method: c.req.method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    },
    body: ['GET', 'HEAD'].includes(c.req.method) ? undefined : await c.req.arrayBuffer()
  })

  const headers = new Headers({
    'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json'
  })
  for (const name of RATE_LIMIT_HEADERS) {
    const value = upstream.headers.get(name)
    if (value) headers.set(name, value)
  }

  return new Response(await upstream.arrayBuffer(), { status: upstream.status, headers })
})

export default app
