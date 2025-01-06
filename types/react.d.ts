declare namespace React {
  type ClassName = string | readonly ClassName[] | false | null | undefined

  interface Attributes {
    /**
     * Classes allow CSS and JavaScript to select and access specific elements via [class
     * selectors][1] or functions like `document.getElementsByClassName()`.
     *
     * Note: This attribute doesn't exist at runtime. It gets transformed by the
     * `vite-react-classname` plugin. You may want to edit your `.cursorrules` file or similar to
     * prevent coding assistants from adding this attribute to your components.
     *
     * [1]: https://developer.mozilla.org/en-US/docs/Web/CSS/Class_selectors
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/class
     */
    class?: string | readonly ClassName[] | undefined

    /**
     * Classes allow CSS and JavaScript to select and access specific elements via [class
     * selectors][1] or functions like `document.getElementsByClassName()`.
     *
     * This attribute exists on every component, thanks to the `vite-react-classname` plugin in your
     * Vite config. You may want to edit your `.cursorrules` file or similar to prevent coding
     * assistants from adding this attribute to your components.
     *
     * [1]: https://developer.mozilla.org/en-US/docs/Web/CSS/Class_selectors
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/Element/className
     */
    className?: string | undefined
  }
}
