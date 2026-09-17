A thin proxy in front of the [skills.sh API](https://www.skills.sh/docs/api). skills.sh only accepts
Vercel's own OIDC token as auth, which is only minted for apps actually deployed on Vercel — so
non-Vercel clients (e.g. the exodus Electron app) call this BFF instead, and it attaches a fresh
`VERCEL_OIDC_TOKEN` server-side before forwarding to `https://skills.sh/api/v1/*`.

Callers must send `BFF_SHARED_SECRET` (see `.env.example`) as the `x-bff-auth` header, otherwise
the deployed BFF would let anyone burn its skills.sh rate-limit quota.

Prerequisites:

- [Vercel CLI](https://vercel.com/docs/cli) installed globally
- In the Vercel dashboard: project **Settings → OIDC Federation**, toggled on (required for
  skills.sh to verify the token)

To develop locally:

```
npm install
vc link            # one-time, links this directory to the Vercel project
vc env pull        # writes VERCEL_OIDC_TOKEN into .env.local (~12h validity)
vc dev
```

Set `BFF_SHARED_SECRET` in `.env.local` too (see `.env.example`) and send it back as `x-bff-auth`
when calling the proxy locally.

```
open http://localhost:3000
```

To build locally:

```
npm install
vc build
```

To deploy:

```
npm install
vc deploy
```
