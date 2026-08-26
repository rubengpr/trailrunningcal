# Local sponsor previews

This development-only mode renders an image banner mockup on the homepage and
event pages without changing the production sponsor configuration.

## Add or switch a prospect

1. Add a `1800 × 300` PNG at:
   `public/assets/sponsors/previews/{brand}-banner.png`
2. Set the same lowercase brand key in `.env.local`:

   ```dotenv
   NEXT_PUBLIC_SPONSOR_PREVIEW_BRAND=naak
   NEXT_PUBLIC_SPONSOR_PREVIEW_URL=https://naak.com
   ```

3. Restart `pnpm dev` after changing the environment file.

The URL is optional. Previews only render image banners; sticky banners are no
longer supported.

Remove `NEXT_PUBLIC_SPONSOR_PREVIEW_BRAND` or leave it empty to disable the
mockup and return to the real sponsor configuration.

The preview asset directory and all local environment files are ignored by
Git. The preview also checks that `NODE_ENV` is `development`, so it cannot
render in production even if the variables are configured there accidentally.
