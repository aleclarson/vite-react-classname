import { ComponentType } from 'react'

export function withExtraProps<P extends { className?: string }>(
  WrappedComponent: ComponentType<P>
) {
  return function EnhancedComponent(props: P) {
    return (
      <WrappedComponent
        {...props}
        class={['enhanced-component', props.className]}
      />
    )
  }
}
