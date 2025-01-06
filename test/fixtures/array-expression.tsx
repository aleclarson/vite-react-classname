function Foo() {
  return <div class={['foo', 'bar']} />
}

function Bar() {
  return <Foo class={['foo', 'bar']} />
}
