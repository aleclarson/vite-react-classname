declare const FocusRing: React.ComponentType<any>

function Component() {
  return (
    <FocusRing>
      <div>Child 1</div>
      <div class="foo">Child 2</div>
    </FocusRing>
  )
}
