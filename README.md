# Benu

> Menu, but better

This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app), and deployed on [Vercel](https://vercel.com/docs/frameworks/nextjs).

## Usage

[Next.js API Routes](https://nextjs.org/docs/api-routes/introduction) are billed in Vercel as [Serverless Functions](https://vercel.com/docs/concepts/limits/usage#serverless-functions).

There is an execution timeout of [10 seconds](https://vercel.com/docs/concepts/limits/overview#general-limits) and an execution limit of [100 GB-Hrs](https://vercel.com/docs/concepts/limits/overview#typical-monthly-usage-guidelines) per month.

## Database cleanup
```SQL
DELETE FROM menus
WHERE timestamp NOT BETWEEN (CURRENT_DATE - INTERVAL '7 days') AND (CURRENT_DATE + INTERVAL '7 days')
```
