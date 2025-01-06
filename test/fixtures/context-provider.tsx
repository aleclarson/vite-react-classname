import { createContext } from 'react'

const Context = createContext({})

function Foo() {
  return (
    <Context.Provider value={{}}>
      <div className="foo">Test</div>
    </Context.Provider>
  )
}
