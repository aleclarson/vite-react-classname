function Foo() {
  return (
    <div
      class={[
        'a very long class name string that creates a multi-line expression with a trailing comma',
        'bar',
      ]}
    />
  )
}

function Bar() {
  return <Foo class={['foo', 'bar']} />
}
