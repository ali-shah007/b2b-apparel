# TA Sports

A locally hosted TA Sports version of the supplied BigBee Apparels reference, preserving its page layouts, apparel imagery, typography, responsive menus, product-category interactions, GSAP/Lenis animations, and editorial content.

## Run

Requires Node.js 24 and npm. From `/workspace/b2b-apparel`:

```sh
npm ci
npm run dev
```

The application listens on port 3000; set `PORT` to override it. `npm start` runs the same server. All pages and visual assets are served from `public/`; a separate frontend build is unnecessary.

## Validate

```sh
npm run build
npm test
```

`build` validates branding and linked local assets. The smoke suite requires Chromium at `/usr/bin/chromium` (or `CHROMIUM_PATH`) and the server running on port 3000 (or `TEST_BASE_URL`). It checks every captured route, representative desktop and mobile pages, navigation, animations, inquiry validation and submissions. Browser screenshots are written to the ignored `artifacts/` directory.

## Pages and assets

The site includes the homepage, bespoke service, expertise overview and all nine apparel categories, three solutions pages, company story, sustainability, client reviews, contact, four help pages, and the Brand Hub's articles, categories, tags and pagination. `tools/mirror-report.json` records the 205 discovered reference routes. Some trailing-slash routes resolve to the same physical page. Animation frames, fonts, scripts and styles are local, so the core site does not depend on the reference server or third-party CDNs. The seven video testimonials retain the reference’s Instagram embeds and require Instagram access.

TA Sports logos and favicon are in `public/assets/images/ta-sports-*.svg`. Human-facing company names, metadata and navigation are rebranded. Original CSS class names remain to preserve the reference's behavior.

## Inquiries

Contact and sourcing forms submit to this app's server. Requests are validated and stored in `.local/inquiries/requests.jsonl`, with optional attachments in the same private directory. The directory is ignored by Git and cannot be accessed through the web server. Both forms display an inquiry reference after successful storage. The server enforces required fields, contact-email format, upload extension and size limits, same-origin browser submissions and a submission rate limit.

**Email delivery, live chat and WhatsApp are not connected.** The reference company's phone, email and social destinations are replaced with the TA Sports contact route. Supply TA Sports contact details and connect a mail/CRM service before a public launch. For production, add HTTPS, persistent protected storage, backup/retention and shared rate limiting appropriate to the hosting platform.

The reference's products, company statistics, testimonials, brand marks, editorial text and photographs are preserved as requested. Review company-specific claims and asset permissions before publishing.
