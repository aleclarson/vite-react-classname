declare namespace React {
  interface Attributes {
    /**
     * Classes allow CSS and JavaScript to select and access specific
     * elements via [class selectors][1] or functions like
     * `document.getElementsByClassName()`.
     *
     * This attribute is enabled by the `vite-tsx-cn` plugin. It
     * allows you to pass a `className` prop to any custom component.
     *
     * [1]: https://developer.mozilla.org/en-US/docs/Web/CSS/Class_selectors
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/class
     * @see https://developer.mozilla.org/en-US/docs/Web/API/Element/className
     */
    className?: string
  }
}
