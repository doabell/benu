# Benu

> Menu, but better

This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app), and deployed on [Vercel](https://vercel.com/docs/frameworks/nextjs).

It uses [`shadowwalker/next-pwa`](https://github.com/shadowwalker/next-pwa) for two purposes:

- Add to home screen in iOS (only works in Safari)
- Offline availability (there might still be a delay unless you turn on airplane mode)

## Quick Start

Clone the repository and `npm ci` or `npm install`.

## Edge Functions

`src/pages/api/handler.ts` is an [Edge Function](https://vercel.com/docs/functions/edge-functions/quickstart) in Vercel.

There is [a limit](https://vercel.com/docs/functions/edge-functions/usage-and-pricing) of 500,000 "execution units" (50 ms of CPU time).

## Cache

The `Cache-Control` header is set in `src/pages/api/handler.ts`.

You can customize browser and Vercel caching by setting [the relevant headers](https://vercel.com/docs/edge-network/caching#cache-control-options).


PWA-level caching is set in `cache.js`.

Note on Vercel caching: you'll only see cache misses in the logs; head over to DevTools to see cache hits.
