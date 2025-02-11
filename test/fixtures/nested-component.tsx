function Component() {
  function NestedComponent() {
    return <div />
  }
  return (
    <div>
      <NestedComponent class="foo" />
    </div>
  )
}
