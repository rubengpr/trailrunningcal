This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Langfuse tracing

AI workflows are traced with Langfuse when both server-side credentials are configured:

```bash
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_BASE_URL=https://cloud.langfuse.com
```

Use the appropriate `LANGFUSE_BASE_URL` for the project region. Keep these values server-only; do not prefix them with `NEXT_PUBLIC_`. The integration records model calls and groups them into named workflows for race extraction, event descriptions, translations, and event research. Email addresses and API-token-shaped values are redacted before Langfuse receives a trace.

## Latitude tracing

Latitude receives the same AI workflows while preserving Langfuse tracing. Configure these server-only variables locally and in the appropriate Vercel environments:

```bash
LATITUDE_API_KEY=
LATITUDE_PROJECT_SLUG=my-project
```

The integration is active only when both values are set. Model calls are auto-instrumented, and the existing workflow names and tags are used as Latitude trace context. Keep `LATITUDE_API_KEY` out of tracked files; configure it in Vercel's environment-variable settings for production and any preview environments that should emit traces.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
