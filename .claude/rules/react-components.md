---
paths: "**/components/**/*.tsx, **/app/**/*.tsx"
---

# React Component Rules

## Component Structure

```typescript
// Functional components only - no class components
export const MyComponent: React.FC<MyProps> = ({ prop1, prop2 }) => {
  // Hooks at the top
  const [state, setState] = useState()
  const { data } = api.example.useQuery()

  // Handlers
  const handleClick = () => { ... }

  // Render
  return (...)
}
```

## Naming

- Components: PascalCase (`UserProfile.tsx`)
- Hooks: camelCase with `use` prefix (`useUserData.ts`)
- Props types: `ComponentNameProps`

## State Management

Use Zustand stores from `@sodium/shared-frontend-services`:

```typescript
import { useCart, useUser } from '@sodium/shared-frontend-services'

const { cart, addItem } = useCart()
```

## Platform-Specific

**Frontend (Next.js):** Use HTML elements (`div`, `button`, `span`)

**Expo (React Native):** Use RN primitives (`View`, `Text`, `TouchableOpacity`)

**Never share UI components between platforms.**

## Types

- Props in separate `.types.ts` file for complex components
- Use `type` imports: `import { type User } from '...'`
