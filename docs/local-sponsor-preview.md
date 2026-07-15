# Local sponsor previews

This development-only mode renders sponsor mockups on the homepage and event
pages without changing the production sponsor configuration.

## Add or switch a prospect

1. Add a `1800 × 300` PNG at:
   `public/assets/sponsors/previews/{brand}-banner.png`
2. Set the same lowercase brand key in `.env.local`:

   ```dotenv
   NEXT_PUBLIC_SPONSOR_PREVIEW_BRAND=naak
   NEXT_PUBLIC_SPONSOR_PREVIEW_FORMAT=both
   NEXT_PUBLIC_SPONSOR_PREVIEW_URL=https://naak.com
   NEXT_PUBLIC_SPONSOR_PREVIEW_COLOR=#000000
   ```

3. Restart `pnpm dev` after changing the environment file.

`NEXT_PUBLIC_SPONSOR_PREVIEW_FORMAT` accepts `image_banner`, `sticky_banner`,
or `both`. The URL and sticky color are optional.

Remove `NEXT_PUBLIC_SPONSOR_PREVIEW_BRAND` or leave it empty to disable the
mockup and return to the real sponsor configuration.

The preview asset directory and all local environment files are ignored by
Git. The preview also checks that `NODE_ENV` is `development`, so it cannot
render in production even if the variables are configured there accidentally.
