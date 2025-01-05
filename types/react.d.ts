declare namespace React {
  interface Attributes {
    /**
     * Classes allow CSS and JavaScript to select and access specific elements via [class
     * selectors][1] or functions like `document.getElementsByClassName()`.
     *
     * This attribute exists on every custom component, thanks to the `vite-react-classname` plugin
     * in your Vite config. You may want to edit your `.cursorrules` file or similar to prevent
     * coding assistants from adding this attribute to your components.
     *
     * [1]: https://developer.mozilla.org/en-US/docs/Web/CSS/Class_selectors
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/class
     * @see https://developer.mozilla.org/en-US/docs/Web/API/Element/className
     */
    className?: string
  }
}
