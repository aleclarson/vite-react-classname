# vite-react-classname

Imagine if every function component in your project automatically received a `className` prop. What if this `className` prop was automatically forwarded to the JSX elements returned by the component? What if you never had to manually merge class names with a utility function (e.g. `cn`, `clsx`, etc.) ever again?

This Vite plugin gives you that.

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

Note that only `.jsx` and `.tsx` files are transformed. Any JSX that's been compiled to JS will not be transformed. This can lead to false positives in the type definitions, since the `className` prop will be added to the `React.Attributes` interface. It's recommended for JSX libraries to use `"jsx": "preserve"` in their `tsconfig.json` file, rather than compiling JSX to JS.

## Install

```
pnpm add vite-react-classname -D
```

## Usage

```tsx
import reactClassName from 'vite-react-classname'

export default defineConfig({
  plugins: [reactClassName()],
})
```

### Plugin options

- `ignoredTagNames?: string[]`  
  When a JSX element is encountered with one of these “tag names”, its first child will receive the `className` prop instead. The tag name may include a dot to indicate a nested component.

  Note that tag names ending in "Provider" are automatically ignored.

- `skipNodeModules?: boolean`  
  Whether to skip transforming components in `node_modules`. Note that only uncompiled JSX is transformed (not `React.createElement` or `jsx` calls). Defaults to `false`.

### TypeScript

Add the following "triple-slash directive" to a module in your project (usually the entry module):

```ts
/// <reference types="vite-react-classname/types/react" />
```

This will add the `className` prop to the `React.Attributes` interface.

### The `class` prop

This plugin also adds a `class` prop to every component. This prop gets transformed into a `className` prop at compile time. This has 2 main benefits:

- It's more concise than `className`
- It supports an _inline_ array expression:

  ```tsx
  function Component() {
    const [foo, setFoo] = useState(false)

    return <div class={['btn', foo && 'foo']}>
  }
  ```

  The `class` array must be a _static_ array. It's transformed into a [`$join`](https://github.com/aleclarson/vite-react-classname/blob/f64086920b3e7ed07394b3c28f24638f814b17d4/src/client.ts) function call at compile time, which filters out falsy values, flattens nested arrays (which _can_ be dynamic), and joins the class names with a space.

> [!WARNING]
> You _cannot_ use both `class` and `className` on the same JSX element.

## FAQ

#### What kinds of components are supported?

- Most function components (arrow syntax, `function` keyword), but not [method definition](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Method_definitions) syntax.
- Class components are **NOT** supported (PR welcome).

#### Is this React-specific?

Not really. It works with any JSX library, but currently, the package only ships with a `react` type definition. That doesn't mean you can't use it with other libraries; you'll just have to add your own type definitions. PRs welcome!

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
  // ✅ Component is transformed
  function AnotherExample(props) {
    return <div {...props} className="btn" />
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

## Ideas

Here are some ideas for improvements:

- Add support for class components
- Add support for other JSX libraries

Contributions are welcome!
