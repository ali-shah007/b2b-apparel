# TA Sports — Next.js

A Next.js 16 App Router application with React 19, preserving the supplied reference website's layouts, apparel imagery, typography, responsive menus, product interactions and GSAP/Lenis scroll animations under TA Sports branding.

## Development

Requires Node.js 24 and npm. From `/workspace/b2b-apparel`:

```sh
npm ci
npm run dev
```

The Next.js development server listens on port 3000. Use `npm run dev -- --port 3001` to choose another port.

```sh
npm run build
npm start
npm test
node tools/check-inquiries.mjs
```

The build validates the local content/assets and creates an optimized Next.js production build. `npm start` runs the production server. The browser smoke tests require a running server and Chromium at `/usr/bin/chromium` (or `CHROMIUM_PATH`). Set `TEST_BASE_URL` to test another server. Screenshots are written to ignored `artifacts/`.

## Architecture

- `app/[[...slug]]/page.jsx`: statically generated React server pages for all 205 captured routes, with per-page Next.js metadata and real HTTP 404s.
- `app/[[...slug]]/layout.jsx`: route-specific root layout, styles, fonts, body classes and structured metadata.
- `content/routes.json` and `content/pages/`: page content and presentation data, rendered by Next.js. Page HTML is not served out of the public directory.
- `components/PageRuntime.jsx`: client-side initialization for the retained animation and interaction scripts after React hydration.
- `app/contact/submit`, `app/sourcing/submit`, `app/api/inquiry`: Next.js route handlers for inquiries.
- `lib/inquiries.js`: shared validation and storage for the route handlers.
- `public/assets/`: local photographs, apparel images, 1,168 animation frames, fonts, scripts, TA Sports SVG logos and favicon.

Routes include the homepage, bespoke service, all nine apparel categories and their product detail pages, three solutions pages, company pages, contact, four help pages, and the Brand Hub's articles, categories, tags and pagination. `tools/mirror-report.json` records the discovered reference routes. Some trailing-slash URLs refer to the same route. Original CSS class names are retained to preserve the visuals. The seven client-video testimonials keep the reference's Instagram embeds and require Instagram connectivity; core visuals are local.

## Inquiry storage

During local development, inquiries are stored in `.local/inquiries/requests.jsonl`, and attachments in the same private directory. This ignored directory is not web-accessible. Browser tests remove only their own sample requests.

On Vercel, connect a **private Vercel Blob store** to the project so `BLOB_READ_WRITE_TOKEN` is available, then redeploy. The route handlers store inquiries and attachments privately in Blob. Without the binding, submission returns an explicit unavailable response; no success is claimed. Vercel inquiries must be under 4 MB including attachments, within the platform's request-body limit. Local inquiries support attachments up to 20 MB.

Email delivery, live chat and WhatsApp are not connected. Supply TA Sports' own service/contact details before enabling these services. The reference's phone, email and social contact links lead to the TA Sports contact page. Review the preserved company claims, testimonials, brand marks, photographs and editorial text before public launch.

## Vercel deployment

`vercel.json` selects the Next.js framework and the standard `npm run build` command. With a Vercel account connected:

```sh
vercel deploy --prod
```

The pages and animations require no secret. Inquiry storage requires the private Blob binding described above. A temporary deployment can be created without an account using Vercel CLI's `--temporary` option, then claimed into an account.
