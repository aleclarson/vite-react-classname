import {
  parse,
  simpleTraverse,
  AST_NODE_TYPES as T,
  TSESTree,
} from '@typescript-eslint/typescript-estree'
import { isIdentifier, isNodeOfType } from '@typescript-eslint/utils/ast-utils'
import MagicString from 'magic-string'
import path from 'path'
import { isArray } from 'radashi'
import { Plugin } from 'vite'

type ComponentNode =
  | TSESTree.FunctionDeclaration
  | TSESTree.ArrowFunctionExpression
  | TSESTree.FunctionExpression

const ComponentNode = [
  T.FunctionDeclaration,
  T.ArrowFunctionExpression,
  T.FunctionExpression,
] as const

export type Options = {
  /**
   * Whether to skip transforming components in `node_modules`.
   *
   * @default false
   */
  skipNodeModules?: boolean
  /**
   * Callback function that is called with the transformed code.
   * Exists for testing and debugging.
   */
  onTransform?: (code: string, id: string) => void
}

export default function reactClassName(options: Options): Plugin {
  return {
    name: 'vite-react-classname',
    enforce: 'pre',
    async transform(code, id) {
      if (!id.endsWith('.tsx')) return
      if (options.skipNodeModules && id.includes('node_modules')) return

      const ast = parse(code, {
        filePath: id,
        loc: true,
        range: true,
      })

      let result: MagicString | undefined

      const features: Features = {
        $join: false,
      }

      // All JSX components have a className prop added.
      const componentNodes = new Set<ComponentNode>()

      const enter = (node: TSESTree.Node) => {
        if (isJSXElement(node)) {
          const returnOrParentElement = findReturnOrParentElement(node)

          // Avoid transforming "class" attributes for returned JSX elements, since they will be
          // transformed by the addClassNameProp function later.
          if (!isReturnStatement(returnOrParentElement)) {
            const classAttribute = findClassAttribute(node)
            if (classAttribute) {
              result ||= new MagicString(code)
              transformClassAttribute(classAttribute, result, features)
            }
          }

          const componentNode = findParentNode(node, ComponentNode)
          if (componentNode) {
            // Detect function component using `function` keyword.
            if (componentNode.id && isPascalCase(componentNode.id.name)) {
              componentNodes.add(componentNode)
            } else {
              // Detect function component expression.
              const parent = findParentNode(componentNode, T.VariableDeclarator)
              if (
                parent &&
                isIdentifier(parent.id) &&
                isPascalCase(parent.id.name)
              ) {
                componentNodes.add(componentNode)
              }
            }
          }
        }
      }

      simpleTraverse(ast, { enter }, true)

      if (componentNodes.size > 0) {
        result ||= new MagicString(code)

        for (const component of componentNodes) {
          addClassNameProp(component, result, id, features)
        }

        if (features.$join) {
          const rootDir =
            process.env.TEST === 'vite-react-classname'
              ? '/path/to/vite-react-classname'
              : new URL('.', import.meta.url).pathname

          const clientPath = path.resolve(rootDir, 'client.js')
          result.prepend(`import { $join } from "/@fs/${clientPath}";\n`)
        }

        if (!result.hasChanged()) {
          return
        }

        const transformedCode = result.toString()
        options.onTransform?.(transformedCode, id)

        return {
          code: transformedCode,
          map: result.generateMap({ hires: 'boundary' }),
        }
      }
    },
  }
}

type Features = {
  $join: boolean
}

function addClassNameProp(
  node: ComponentNode,
  result: MagicString,
  filename: string,
  features: Features
) {
  let classNameAdded = false
  let propsVariable: TSESTree.Identifier | undefined

  const propsArgument = node.params[0]
  if (!propsArgument) {
    const openParenIndex = result.original.indexOf('(', node.range[0])
    result.appendLeft(openParenIndex + 1, '{ className: $cn }')
    classNameAdded = true
  }
  // Check destructured props
  else if (isObjectPattern(propsArgument)) {
    const classNameProp = propsArgument.properties.find(
      (prop): prop is TSESTree.Property & { key: TSESTree.Identifier } =>
        isProperty(prop) &&
        isIdentifier(prop.key) &&
        prop.key.name === 'className'
    )
    if (!classNameProp) {
      // className will exist in the rest prop if it exists
      const restProp = propsArgument.properties.find(isRestElement)
      if (restProp && isIdentifier(restProp.argument)) {
        propsVariable = restProp.argument
      } else {
        // className must be added to the destructured props
        const openBraceIndex = propsArgument.range[0]
        result.appendLeft(openBraceIndex + 1, 'className: $cn,')
        classNameAdded = true
      }
    }
  } else if (isIdentifier(propsArgument)) {
    propsVariable = propsArgument
  }

  const classNameProp = classNameAdded
    ? '$cn'
    : propsVariable
      ? 'props.className'
      : null

  const addClassNameToJSXElement = (element: TSESTree.JSXElement) => {
    let className = element.openingElement.attributes.find(
      (attr): attr is TSESTree.JSXAttribute =>
        isJSXAttribute(attr) && attr.name.name === 'className'
    )

    const classAttribute = findClassAttribute(element)
    if (classAttribute) {
      if (className) {
        throw new Error(
          '[vite-react-classname] JSX element cannot have both "className" and "class" attributes'
        )
      }
      transformClassAttribute(classAttribute, result, features)
      className = classAttribute
    }

    const spreadProps =
      propsVariable &&
      element.openingElement.attributes.find(
        (attr): attr is TSESTree.JSXSpreadAttribute =>
          isJSXSpreadAttribute(attr) &&
          isIdentifier(attr.argument) &&
          attr.argument.name === propsVariable.name
      )

    if (className) {
      // Look for props.className being referenced anywhere in the className attribute value
      if (propsVariable && isJSXExpression(className.value)) {
        let found = false
        simpleTraverse(className.value.expression, {
          enter: node => {
            if (found) return
            if (
              isMemberExpression(node) &&
              isIdentifier(node.object) &&
              node.object.name === propsVariable.name &&
              isIdentifier(node.property) &&
              node.property.name === 'className'
            ) {
              found = true
            }
          },
        })
        if (found) {
          return // className is being forwarded by props.className
        }
      }

      // Merge className prop into className attribute value
      if (classNameProp) {
        if (isLiteral(className.value)) {
          // Convert string attribute value to JSX expression container
          const [start, end] = className.value.range
          result.appendRight(start, '{$join(')
          result.prependLeft(end, `, ${classNameProp})}`)
          features.$join = true
        } else if (isJSXExpression(className.value)) {
          const { expression } = className.value
          const [start, end] = expression.range

          if (classAttribute && isArrayExpression(expression)) {
            // Remove the array braces in favor of $join(…)
            result.overwrite(start, start + 1, '$join(')
            result.overwrite(end - 1, end, `, ${classNameProp})`)
            features.$join = true
          } else {
            result.appendRight(start, '$join(')
            result.prependLeft(end, `, ${classNameProp})`)
            features.$join = true
          }
        } else {
          console.warn(
            '[vite-react-classname] Unsupported "className" value at',
            filename +
              ':' +
              className.loc.start.line +
              ':' +
              className.loc.start.column
          )
          return
        }
      }

      // Move className attribute to after props spread
      if (spreadProps && className.range[0] < spreadProps.range[0]) {
        let [start, end] = className.range
        // Preserve space before className attribute
        if (result.original[start - 1] === ' ') {
          start -= 1
        }
        result.move(start, end, spreadProps.range[1])
      }
    } else if (classNameProp) {
      const lastAttr = element.openingElement.attributes.at(-1)
      const insertPos =
        lastAttr?.range[1] ?? element.openingElement.name.range[1]

      result.appendLeft(insertPos, ` className={${classNameProp}}`)
    }
  }

  // Find the root JSX element of each return statement.
  simpleTraverse(node, {
    enter: node => {
      if (!isJSXElement(node)) {
        return
      }
      const tag = node.openingElement.name
      if (jsxIdentifierEndsWith(tag, 'Provider')) {
        return // Skip context providers
      }
      const returnOrParentElement = findReturnOrParentElement(node)
      if (isReturnStatement(returnOrParentElement)) {
        addClassNameToJSXElement(node)
      }
    },
  })
}

function findReturnOrParentElement(node: TSESTree.JSXElement) {
  return findParentNode(
    node,
    [T.ReturnStatement, T.JSXElement],
    parent =>
      !isJSXElement(parent) ||
      !jsxIdentifierEndsWith(parent.openingElement.name, 'Provider')
  )
}

function isPascalCase(str: string) {
  return str.charCodeAt(0) >= 65 && str.charCodeAt(0) <= 90
}

function findParentNode<TNodeType extends T>(
  node: TSESTree.Node,
  type: TNodeType | readonly TNodeType[],
  test?: (node: TSESTree.Node) => boolean
): Extract<TSESTree.Node, { type: TNodeType }> | undefined {
  const types: readonly T[] = isArray(type) ? type : [type]
  let parent = node.parent
  while (parent) {
    if (types.includes(parent.type) && (!test || test(parent))) {
      return parent as any
    }
    parent = parent.parent
  }
}

function findClassAttribute(node: TSESTree.JSXElement) {
  return node.openingElement.attributes.find(
    (attr): attr is TSESTree.JSXAttribute =>
      isJSXAttribute(attr) && attr.name.name === 'class'
  )
}

function transformClassAttribute(
  classAttribute: TSESTree.JSXAttribute,
  result: MagicString,
  features: Features
) {
  // Rewrite class to className
  result.overwrite(...classAttribute.name.range, 'className')

  // Convert array to $join(…)
  if (
    isJSXExpression(classAttribute.value) &&
    isArrayExpression(classAttribute.value.expression)
  ) {
    const [start, end] = classAttribute.value.expression.range
    result.overwrite(start, start + 1, '$join(')
    result.overwrite(end - 1, end, ')')
    features.$join = true
  }
}

function jsxIdentifierEndsWith(
  identifier: TSESTree.JSXTagNameExpression,
  suffix: string
) {
  if (isJSXIdentifier(identifier)) {
    return identifier.name.endsWith(suffix)
  }
  if (isJSXMemberExpression(identifier)) {
    return jsxIdentifierEndsWith(identifier.property, suffix)
  }
  return false
}

const isJSXElement = isNodeOfType(T.JSXElement)
const isJSXIdentifier = isNodeOfType(T.JSXIdentifier)
const isJSXMemberExpression = isNodeOfType(T.JSXMemberExpression)
const isJSXAttribute = isNodeOfType(T.JSXAttribute)
const isJSXSpreadAttribute = isNodeOfType(T.JSXSpreadAttribute)
const isJSXExpression = isNodeOfType(T.JSXExpressionContainer)
const isReturnStatement = isNodeOfType(T.ReturnStatement)
const isObjectPattern = isNodeOfType(T.ObjectPattern)
const isRestElement = isNodeOfType(T.RestElement)
const isProperty = isNodeOfType(T.Property)
const isMemberExpression = isNodeOfType(T.MemberExpression)
const isArrayExpression = isNodeOfType(T.ArrayExpression)
const isLiteral = isNodeOfType(T.Literal)
