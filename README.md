# Benu

> Menu, but better

This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app), and deployed on [Vercel](https://vercel.com/docs/frameworks/nextjs).

## Quick Start

(For PostgreSQL; see the [knex docs](https://knexjs.org/guide/#configuration-options) and edit `knexfile.js` for other databases.)

Clone the repository and `npm ci` or `npm install`.

Set up a PostgreSQL server and obtain a URL in the form of `postgresql://[username]:[password]@[hostname]:[port]/[path]`.

Create a `.env.local` in the root directory and populate with `DATABASE_URL=[url]`.

Run the following to seed the database:
```bash
npx knex migrate:latest --env production
npx knex seed:run --env production
```

Set `DATABASE_URL` as an environment variable in production.

## API Routes

[Next.js API Routes](https://nextjs.org/docs/api-routes/introduction) are billed in Vercel as [Serverless Functions](https://vercel.com/docs/concepts/limits/usage#serverless-functions).

There is an execution timeout of [10 seconds](https://vercel.com/docs/concepts/limits/overview#general-limits) and an execution limit of [100 GB-Hrs](https://vercel.com/docs/concepts/limits/overview#typical-monthly-usage-guidelines) per month.

## Database cleanup

Clean menu items not within 14 days:

```SQL
DELETE FROM menus
WHERE timestamp NOT BETWEEN (CURRENT_DATE - INTERVAL '7 days') AND (CURRENT_DATE + INTERVAL '7 days')
```
