---
paths: "apps/frontend/**/*"
---

# Frontend Patterns

## App Router (migrated off Pages Router)
- Frontend is **App Router** (`src/app/`, route groups `(public)/(auth)/(admin)/(console)`). The root layout is `src/app/layout.tsx`. `src/pages/` is a 4-file remnant (`_app`, `_document`, `robots.txt`, `server-sitemap.xml`) — don't add new routes there.
- The app is effectively a **client SPA**: ~136 of 140 `page.tsx` are `'use client'`, data via tRPC + React Query. Only the root layout and a couple of public detail pages use `generateMetadata` — there is essentially no per-page SSR/SEO today.
- Middleware is `src/proxy.ts` (Next 16 renamed `middleware.ts` → `proxy.ts`); it resolves hostname → tenant via the backend `/api/resolve-domain` and sets the `sodium-config` cookie.

## Build & Bundling
- Add pnpm overrides for `@types/react` and `@types/react-dom` ONLY. Never override `react` or `react-dom` themselves (causes duplicate React runtime).
- **Don't use `webpack-obfuscator`** with Next.js — incompatible with code splitting, nearly doubles bundle size.

## CSS & Turbopack
- Dev runs on **Turbopack** (`next dev`, the Next 16 default — `serve.js` no longer disables it). Prod build still uses webpack (`next build --webpack`) for the bundle analyzer / obfuscator.
- All global CSS imports are centralized in **`src/app/layout.tsx`** (App Router root). The leftover `src/pages/_app.tsx` keeps a near-duplicate list for the 4 Pages Router remnant routes. Never add `import '...css'` in component files.
- CSS from `node_modules` → JS imports in `src/app/layout.tsx`. Local CSS → CSS `@import` in `src/pages/styles.css` (imported by the layout).

## Semantic CSS Variables
- Always use semantic Tailwind classes (`text-foreground`, `bg-muted`, `bg-primary`, `border-border`, `text-destructive`). Never hardcode colors like `text-gray-600`.
- Exceptions: status badge colors (green/blue/yellow/red) and brand SVG colors are intentionally hardcoded.

## Vercel Deployment
- Browser-facing URLs that hit the backend MUST use `env.BACKEND_URL`, not relative `/api/` paths. Relative paths only work in local dev (via nginx proxy).

## Routing (MANDATORY — use the routes table, never hand-build URLs)

All app routes live in `src/routes.ts` as `STATIC_ROUTES` + `DYNAMIC_ROUTES`. Always go through them. Never inline a path with template strings.

```tsx
// WRONG — hand-built path
router.push(`/account/${accountId}/opportunities/${ownerSlug}/${slug}/apply`)
href={`/opportunities/${ownerSlug}/${slug}`}

// CORRECT — via the typed routes helper
const stateRouter = useStateAwareRoutes()
router.push(
  stateRouter.dynamic.ACCOUNT_OPPORTUNITY_APPLY({ accountId, ownerSlug, slug }),
)
href={stateRouter.dynamic.OPPORTUNITY_DETAIL({ ownerSlug, slug })}
```

- Authenticated, account-scoped routes start with `/account/[accountId]/...`. Anything that requires login must be under that prefix, never at the bare root.
- If your route doesn't have a helper yet, add one to `src/routes.ts` (and extend `RouteParam` with any new params). Don't ship a hardcoded string.
- For pages that need redirect-after-login, encode the helper's output: `encodeURIComponent(stateRouter.dynamic.ROUTE_NAME(...))`.

## Image / asset entities (avatar + cover)

For per-entity branding (community, opportunity, etc) we store plain `String?` columns on the Prisma model: `coverImage`, `avatarImage` (or `coverUrl`/`avatarUrl` for communities). The `Asset` table (`content_assets`) is for post/story/message media — don't reach for it for entity branding.

When showing avatar + cover in a form, use the **shared `ProfilePreviewCard`** (`@components/account/create/ProfilePreviewCard`). It's the same combo used by the community creation wizard and the onboarding flow. Don't pair two separate `BrandingImageUpload`s side-by-side when a `ProfilePreviewCard` would do.

## Card visuals

The cross-domain card visual (cover + overlapping circular avatar + title + description + meta + CTA) is implemented once in `@components/ui/MediaCard`. Both `CommunityCard` and `OpportunityCard` delegate to it. When you need a similar card elsewhere, reuse `MediaCard` and pass slots (`topLeft`, `topRight`, `meta`, `cta`) rather than reimplementing the layout. `MediaCard` handles the "no nested buttons" rule by rendering overlay slots as siblings of the clickable wrapper.

## Rich text rendering

Render stored HTML descriptions with `<RichTextDisplay>` (`@components/ui/forms/richText/RichTextDisplay`). Don't pipe HTML strings into a `<div className="prose">{value}</div>` — that prints raw tags.

## Country picker

Country fields use `<CountrySwitcher>` (`@components/ui/CountrySwitcher`), not a free-text `<Input>`. For dynamic forms, declare the field with `type: 'country'` in the FieldDef and `SubmissionFieldRenderer` will pick up the picker automatically.

## File / document upload

Use the established `<DocumentUpload>` + `useDocumentUpload` pair from `@components/ui/documents/DocumentUpload` and `@src/hooks/uploads/useDocumentUpload`. PDF-only single-file is the current scope — if you need multi-file or non-PDF, extend the dropzone, don't reimplement an uploader. The form pattern is: keep the dropzone visible until upload completes, then swap to a "filename + trash" row that clears the field's form value on click. See `CandidateProfileForm` (resume) and the `file` branch in `SubmissionFieldRenderer` for the canonical wiring.

## Tenant-scoped data ordering

Field order in dynamic-form submission schemas comes from the seed in `apps/backend/src/database/seeds/OpportunitiesTemplatesSeeder.ts`. To reorder fields in an existing tenant, change the order in the seed and rerun the seeder for that tenant — the upsert by `(tenantId=null, kind, name)` replaces the JSON in place. New tenants pick the new order up at creation.

## Forms (MANDATORY)

Forms MUST use `@goatlab/react-zod-form` + the shared field components in `src/components/ui/forms/`. Never hand-roll a form with raw `<input>` / `<textarea>` / `<select>` / `<button>` and ad-hoc `useState` — it breaks validation, label rendering, the required-asterisk affordance, controlled-input behaviour, and visual consistency.

### Wiring

```tsx
import { Form, useZodFormHook } from '@goatlab/react-zod-form'
import { Input } from '@components/ui/forms/fields/Input'
import { TextArea } from '@components/ui/forms/fields/TextArea'
import { Select } from '@components/ui/forms/fields/Select'
import { Switch } from '@components/ui/forms/fields/Switch'
import { Button } from '@components/ui/buttons/Button2'

const formHook = useZodFormHook({
  schema: MyZodSchema, // from `@sodium/shared-schemas`
  defaultValues: { name: '', enabled: false }, // seed every field, see "controlled inputs" below
})

<Form formHook={formHook} onSuccess={(data) => mutation.mutate(data)}>
  <Input formHook={formHook} name="name" label="Name" required />
  <Button type="submit" loading={mutation.isPending}>Save</Button>
</Form>
```

### Component map (no raw HTML)

| Need | Use | Where |
|---|---|---|
| Single-line text / URL / number / date | `Input` | `forms/fields/Input` |
| Numeric with formatting | `NumericInput` | `forms/fields/NumericInput` |
| Multi-line plain text | `TextArea` | `forms/fields/TextArea` |
| Rich text (HTML) | `RichTextArea` | `forms/richText/RichTextArea` |
| Single-select / multi-select | `Select` (with `multiple`) | `forms/fields/Select` |
| Boolean checkbox | `CheckBox` | `forms/fields/Checkbox` |
| Boolean switch | `Switch` | `forms/fields/Switch` |
| Date | `DatePicker` | `forms/dates/DatePicker` |
| Country | `CountrySwitcher` | `ui/CountrySwitcher` |
| Avatar + cover combo | `ProfilePreviewCard` | `account/create/ProfilePreviewCard` |
| Single image upload | `BrandingImageUpload` | `admin/branding/BrandingImageUpload` |
| Submit / action button | `Button` from `@components/ui/buttons/Button2` | NEVER use `@goatlab/react-ui`'s `Button` directly |

### Rules

- **Required asterisk:** pass `required` to the component. Don't hand-append `" *"` to labels — the component renders the marker. Manually appending it produces double-asterisks and breaks i18n.
- **Controlled inputs:** seed every field in `defaultValues` with a typed empty value (string `''`, boolean `false`, multiselect `[]`) so inputs are controlled from the first render. Leaving a field `undefined` triggers React's "uncontrolled → controlled" warning when the user starts typing.
- **Variants:** the create-form filled style is the default (`<Input />` with no `variant`). Use `variant="outline"` only when intentional. Don't mix variants within the same form.
- **Schemas:** put Zod schemas in `@sodium/shared-schemas`. Frontend-only forms can declare local schemas, but anything that hits a tRPC mutation must share the schema with the backend's `.input()`.
- **Card with form:** when a form lives inside a `Card`, the layout pattern is `Card > CardContent > Form > <fields>`. Don't put the `Form` outside the `Card`.

### Sticky save bar (dirty-only)

Long forms render their primary save/submit action(s) in the **sticky top bar**, gated on `formHook.formState.isDirty` — so the affordance only appears once the user has actually edited something. This is the established pattern; do not put a persistent footer-only save button.

- **Settings forms** (`/account/[id]/settings/...`): the page already wraps content in `LeftSideBarBodyLayout`. Use `useLeftSideBarBodyLayoutStore().setTopBarContent(...)` from a `useEffect` gated on `formDirty` to mount the buttons.
- **Public / standalone forms** (apply pages, etc): wrap content in `StickyTopLayoutLayout` (from `components/ui/layout/templates/StickyTopLayout.tsx/StickyTopLayout`) and use `useStickyTopLayoutLayoutStore().setTopBarContent(...)` the same way.
- Drive submission via the native `form="..."` attribute on the sticky `Button`:
  ```tsx
  <Form id={MY_FORM_ID} ...>...</Form>
  // elsewhere:
  <Button type="submit" form={MY_FORM_ID} loading={submitting}>{t('save')}</Button>
  ```
  Reach the form's id via a constant the page and the form both share. The form component should accept a `formId?: string` prop and forward it onto `<Form>` (`{...(formId ? { id: formId } : {})}`).
- Surface dirty state with an `onDirtyChange?: (isDirty: boolean) => void` prop on the form, and read it into local state on the page.
- Keep secondary actions (e.g. "Save as draft") inline — only the primary action belongs in the sticky bar.

### Smell test

If your PR adds `<input ...>` or `<textarea ...>` or a `useState<string>('')` next to a form-like JSX block, stop and use the library. The only legitimate raw `<button>` in a form context is a clickable tile/option (e.g. `KindOption`) that selects an enum value, not a field that binds to a schema key.

## Page Layouts (MANDATORY)

Every page MUST be wrapped in the standard layout chrome — otherwise the user lands on a page without the top header or left sidebar (see `gfdgfd.local.getsodium.com/opportunities/.../apply` regression). The top header is gated by `isAccountPage` / `isSpacePage` in `src/hooks/useIs.ts`; if your new top-level route doesn't match those patterns, add it there.

### Standard pages (discovery feeds, detail views, applies, etc.)

```tsx
<AppLayout>
  <AccountLayout>
    {/* page content */}
  </AccountLayout>
</AppLayout>
```

- `AppLayout` provides the top header (`MainTopHeader`) and bottom mobile nav.
- `AccountLayout` provides the left rail with Home/Network/Communities/Inbox/Jobs/Opportunities/Data Center/Advertising.
- Don't render `AppLayout` alone for an authenticated view — you'll lose the left rail.
- New top-level URL prefixes (e.g. `/opportunities`, `/orgs`) must be added to `useIs.ts` `isAccountPage` so the top header renders.

### Settings pages (anything under `/account/[id]/settings/...`)

```tsx
const menu = useSettingsLeftMenu()

return (
  <AppLayout showFooter={false}>
    <AccountLayout>
      <LeftSideBarBodyLayout innerSideBar={menu}>
        {/* settings content */}
      </LeftSideBarBodyLayout>
    </AccountLayout>
  </AppLayout>
)
```

- Anything tied to *user settings* (profile, account, payments, domains, opportunities-owner inbox, etc.) MUST live under `/account/[id]/settings/...` and use this three-layer wrapper. Listing pages, owner inboxes, and config panels all count as "settings".
- `useSettingsLeftMenu()` builds the inner sidebar entries. When you add a new settings feature, add the corresponding entry there with a `shouldDisplay` gate (feature flag if applicable).
- Top bar action buttons (e.g. "+ New X") attach via `useLeftSideBarBodyLayoutStore().setTopBarContent(...)` — they show inside the settings shell, not above it.

### Console pages (tenant admin)

```tsx
<PanelLayout sidebar={<ConsoleDrawerLeft />}>
  {/* content */}
</PanelLayout>
```

Use only inside `/console/...`. Not interchangeable with the settings layout.

## Filters — filter what we HAVE, not what we aim to have (MANDATORY)

A filter exists to narrow down **real** items. Never show filter options that match no content, and never render filter chrome when there is nothing to filter.

- **Options must reflect existing content.** Category/tag/status/location facets must list only values present in the current dataset. For categories, load the pruned tree of categories with content (`category.getCategoriesWithContent({ domain })` — communities is the reference), never all tenant categories. Build analogous endpoints for other domains; never dump the full taxonomy.
- **Hide the filter UI when there's nothing to filter.** Empty state (no items, no filter applied) → don't render the filter sidebar/controls at all. The communities page passes `sidebarBottomContent={isEmpty && !selectedCategoryId ? undefined : categoryFilter}`.
- **Collapse an empty sidebar.** `LeftSideBarBodyLayout` hides the whole sidebar column + menu toggle when `innerSideBar` is empty AND there's no `sidebarBottomContent` (`hasSidebar`). Don't leave a dead empty column.
- **Don't trap the user.** Keep a filter visible while it's actively applied even if it returns zero results, so they can clear it.

## Auth Error Sync
- If you add a new `UNAUTHORIZED` throw in auth middleware, ensure its message contains one of the patterns in `tokenErrorPatterns` in `getTrpc.tsx` (e.g., 'invalid token', 'session expired'). Otherwise the frontend won't trigger logout.

## Tenant Login Guard
- `[space]/index.tsx` uses `getTenantSlugFromHostname()` as fallback when the `sodium-tenant-slug` cookie is missing. Never depend solely on short-lived cookies for critical UX flows.
- `RESERVED_SUBDOMAINS` in `sodium-context.ts` must stay in sync with `RESERVED_NAMES` in backend's `hostTenantResolver.ts`.

## Landing Page (`apps/landing/`)
- Do NOT enable the Testimonials component until real customer testimonials exist (current data is fabricated).
- Pricing comparisons must be honest — compare subscription costs, never claim overall "X% cheaper" without factoring in revenue share.
- All text must go through `useTranslations()` with keys in both `en.json` and `es.json`. Never hardcode English strings.
