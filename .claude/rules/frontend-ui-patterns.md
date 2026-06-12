# Frontend UI Patterns — MANDATORY for all UI work

## Layouts (MUST use — never create custom page wrappers)

**Account pages** (settings, data center management):
```typescript
import { AccountLayout } from '@components/account/accountLayout'
import { AppLayout } from '@components/layout/AppLayout'
import { LeftSideBarBodyLayout } from '@components/ui/layout/templates/LeftSideBarBody/LeftSideBarBodyLayout'

// Settings pages use left sidebar menu
const menu = useSettingsLeftMenu()
return (
  <AppLayout showFooter={false}>
    <AccountLayout>
      <LeftSideBarBodyLayout innerSideBar={menu}>
        {/* page content */}
      </LeftSideBarBodyLayout>
    </AccountLayout>
  </AppLayout>
)
```

**Console pages** (tenant admin):
```typescript
import { PanelLayout } from '@components/layout/PanelLayout'
import { ConsoleDrawerLeft } from '@components/layout/drawerLeft/ConsoleDrawerLeft'

return (
  <PanelLayout sidebar={<ConsoleDrawerLeft />}>
    {/* content */}
  </PanelLayout>
)
```

## Forms (MUST use @goatlab/react-zod-form — never raw react-hook-form)

```typescript
import { Form, useZodFormHook } from '@goatlab/react-zod-form'
import { Input } from '@components/ui/forms/fields/Input'
import { TextArea } from '@components/ui/forms/fields/TextArea'
import { Select } from '@components/ui/forms/fields/Select'
import { Button } from '@components/ui/buttons/Button2'

const schema = z.object({ name: z.string().min(1) })
const formHook = useZodFormHook({ schema, defaultValues: { name: '' } })

<Form formHook={formHook} onSuccess={(data) => mutation.mutate(data)}>
  <Input formHook={formHook} name="name" label="Name" />
  <Button type="submit" loading={mutation.isPending}>Save</Button>
</Form>
```

## Dialogs (use Dialog from @goatlab/react-ui or DrawerDialog)

```typescript
// Standard dialog
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@goatlab/react-ui'

// Mobile-first drawer dialog
import { DrawerDialog } from '@components/ui/dialog/DrawerDialog'
```

## Tables (use DataTable with TanStack column defs)

```typescript
import { DataTable } from '@components/ui/tables/DataTable'
import type { ColumnDef } from '@tanstack/react-table'
import { TableEditButton } from '@components/ui/buttons/TableEditButton'
import { TableDeleteButton } from '@components/ui/buttons/TableDeleteButton'
```

## Top Bar Action Buttons (settings panel pattern)

```typescript
import { useLeftSideBarBodyLayoutStore } from '@components/ui/layout/templates/LeftSideBarBody/LeftSideBarBodyLayout'

const { setTopBarContent } = useLeftSideBarBodyLayoutStore()
useEffect(() => {
  setTopBarContent(
    <Button onClick={() => setIsDialogOpen(true)}>
      <PlusIcon className="mr-2 h-4 w-4" /> Add Item
    </Button>
  )
}, [])
```

## Tabs (PanelTabs for settings sections)

```typescript
import { PanelTabs, usePanelTab } from '@components/panel/PanelTabs'

const [activeTab, setActiveTab] = usePanelTab(['tab1', 'tab2'], 'tab1')
```

## Component Imports (NEVER use @goatlab/react-ui Card — use local)

```typescript
// Buttons — always from local
import { Button } from '@components/ui/buttons/Button2'

// Card — ALWAYS local (goatlab Card has hardcoded dark:bg-slate-950)
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card'

// Shadcn components — from @goatlab/react-ui
import { Dialog, DialogContent, useToast, Badge, Separator } from '@goatlab/react-ui'

// Form fields — always from local
import { Input } from '@components/ui/forms/fields/Input'
import { TextArea } from '@components/ui/forms/fields/TextArea'
```

## Settings Left Menu (add new sections here)

File: `apps/frontend/src/components/account/settings/settingsLeftMenu.tsx`
Pattern: Add a new menu entry with `shouldDisplay` gated by feature flag.

## File Organization for New Settings Features

```
components/account/settings/dataCenter/
  DataCenterPanel.tsx       # Main container with Add button + table
  DataCenterTable.tsx       # Table + column definitions
  AddModuleDialog.tsx       # Create dialog with form
  EditModuleDialog.tsx      # Edit dialog with form
```

## Styling Rules

- ALWAYS semantic classes: `text-foreground`, `bg-card`, `border-border`, `text-muted-foreground`
- NEVER hardcode: `text-gray-600`, `bg-white`, `dark:bg-slate-950`
- Use `bg-card border border-border rounded-xl` for card containers
- Use `text-primary` for active/selected states
