import { forwardRef } from 'react'

const Component = forwardRef(({}, ref: React.Ref<HTMLDivElement>) => {
  return <div ref={ref}>Test</div>
})
