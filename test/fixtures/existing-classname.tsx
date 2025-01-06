import clsx from 'clsx'

function Component() {
  return <div className="existing">Test</div>
}

function Component2() {
  return <div className={clsx('a', 'b', 'c')}>Test</div>
}
