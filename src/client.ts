type ClassName = string | readonly ClassName[] | false | null | undefined

export function $join(...args: ClassName[]) {
  let result = ''
  for (let arg of args) {
    if (Array.isArray(arg)) {
      arg = $join(...arg)
    }
    if (arg && typeof arg === 'string' && (arg = arg.trim())) {
      result += result ? ' ' + arg : arg
    }
  }
  return result
}
