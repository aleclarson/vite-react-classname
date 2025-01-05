# vite-react-classname

This plugin adds a `className` prop to every React component in your project (including `node_modules`). Now you don't have to do the grunt work of defining a `className` prop for every component, merging class names via `cn(…)`, etc.

#### Example

Imagine you have a component like this:

```tsx
import { cn } from '@lib/utils'

export function Button({ className }) {
  return <div className={cn('btn', className)} />
}
```

With this plugin, you can now write:

```tsx
export function Button() {
  return <div className="btn" />
}
```

## Install

```
pnpm add vite-react-classname
```

## Usage

```tsx
import reactClassName from 'vite-react-classname'

export default defineConfig({
  plugins: [reactClassName()],
})
```

### Options

- `skipNodeModules`: Whether to skip transforming components in `node_modules`. Defaults to `false`.

### TypeScript

Add the following "triple-slash directive" to a module in your project (usually the entry module):

```ts
/// <reference types="vite-react-classname/types/react" />
```

This will add the `className` prop to the `React.Attributes` interface.

## FAQ

#### What's all supported?

- Function components of almost any kind (arrow syntax, `function` keyword, etc.), except if you're using [method definition](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Method_definitions) syntax.
- Class components are **NOT** supported (PR welcome).

#### When is transformation skipped?

- When props destructuring is encountered, and the `className` prop is explicitly declared, it's assumed the `className` prop is being forwarded. No transformation is done in this case.
  ```tsx
  // ❌ Component is not transformed
  function Example({ className, ...props }) {
    return <div className={cn('btn', className)} {...props} />
  }
  ```
- When the `props` variable is spread into a JSX element, it's assumed the `className` prop is being forwarded. No transformation is done in this case.
  ```tsx
  // ❌ Component is not transformed
  function SpreadExample(props) {
    return <div {...props} />
  }
  ```
- Context providers are ignored. Their immediate JSX child is transformed instead.
  ```tsx
  // ✅ The props argument has className added
  function MyComponent({ xyz }) {
    return (
      // ❌ Provider is not transformed
      <MyContextProvider value={xyz}>
        // ✅ …but its child is forwarded the className value
        <div className="inset-0 bg-red-500" />
      </MyContextProvider>
    )
  }
  ```
