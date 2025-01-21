type ClassName = string | readonly ClassName[] | false | null | undefined

export function joinClassNames(...args: ClassName[]) {
  let result = ''
  for (let arg of args) {
    if (Array.isArray(arg)) {
      arg = joinClassNames(...arg)
    }
    if (arg && typeof arg === 'string' && (arg = arg.trim())) {
      result += result ? ' ' + arg : arg
    }
  }
  return result
}
