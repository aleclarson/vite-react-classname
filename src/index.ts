import {
  parse,
  simpleTraverse,
  AST_NODE_TYPES as T,
  TSESTree,
} from '@typescript-eslint/typescript-estree'
import { isIdentifier, isNodeOfType } from '@typescript-eslint/utils/ast-utils'
import MagicString from 'magic-string'
import { isArray } from 'radashi'
import { Plugin } from 'vite'

const isJSXElement = isNodeOfType(T.JSXElement)
const isJSXIdentifier = isNodeOfType(T.JSXIdentifier)
const isJSXAttribute = isNodeOfType(T.JSXAttribute)
const isJSXSpreadAttribute = isNodeOfType(T.JSXSpreadAttribute)
const isJSXExpression = isNodeOfType(T.JSXExpressionContainer)
const isImportDeclaration = isNodeOfType(T.ImportDeclaration)
const isFunctionDeclaration = isNodeOfType(T.FunctionDeclaration)
const isArrowFunctionExpression = isNodeOfType(T.ArrowFunctionExpression)
const isFunctionExpression = isNodeOfType(T.FunctionExpression)
const isReturnStatement = isNodeOfType(T.ReturnStatement)
const isObjectPattern = isNodeOfType(T.ObjectPattern)
const isRestElement = isNodeOfType(T.RestElement)
const isProperty = isNodeOfType(T.Property)
const isConditionalExpression = isNodeOfType(T.ConditionalExpression)
const isMemberExpression = isNodeOfType(T.MemberExpression)
const isLiteral = isNodeOfType(T.Literal)

type ComponentNode =
  | TSESTree.FunctionDeclaration
  | TSESTree.ArrowFunctionExpression
  | TSESTree.FunctionExpression

const ComponentNode = [
  T.FunctionDeclaration,
  T.ArrowFunctionExpression,
  T.FunctionExpression,
] as const

type Options = {
  /**
   * Whether to skip transforming components in `node_modules`.
   *
   * @default false
   */
  skipNodeModules?: boolean
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

      // All JSX components have a className prop added.
      const componentNodes = new Set<ComponentNode>()

      const enter = (node: TSESTree.Node) => {
        if (
          isArrowFunctionExpression(node) ||
          isFunctionExpression(node) ||
          isFunctionDeclaration(node)
        ) {
        } else if (isJSXElement(node)) {
          // Step 1: Gather JSX components in this module.
          const componentNode = findParentNode(node, ComponentNode)
          if (componentNode) {
            if (componentNode.id && isPascalCase(componentNode.id.name)) {
              componentNodes.add(componentNode)
            } else {
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
        const result = new MagicString(code)

        for (const component of componentNodes) {
          addClassNameProp(component, result, id)
        }

        if (!result.hasChanged()) {
          return
        }

        return {
          code: result.toString(),
          map: result.generateMap({ hires: 'boundary' }),
        }
      }
    },
  }
}

function addClassNameProp(
  node: ComponentNode,
  result: MagicString,
  filename: string
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
    if (classNameProp) {
      return // Assume the className is being forwarded
    }

    // className will exist in the rest prop if it exists
    const restProp = propsArgument.properties.find(isRestElement)
    if (restProp && isIdentifier(restProp.argument)) {
      propsVariable = restProp.argument
    } else {
      // className must be added to the destructured props
      const openBraceIndex = propsArgument.range[0]
      result.appendLeft(openBraceIndex + 1, 'className: $cn, ')
      classNameAdded = true
    }
  } else if (isIdentifier(propsArgument)) {
    propsVariable = propsArgument
  } else {
    return // Unsupported props argument
  }

  const addClassNameToJSXElement = (element: TSESTree.JSXElement) => {
    if (propsVariable) {
      const hasPropsSpread = element.openingElement.attributes.some(
        attr =>
          isJSXSpreadAttribute(attr) &&
          isIdentifier(attr.argument) &&
          attr.argument.name === propsVariable.name
      )
      if (hasPropsSpread) {
        return // className is being forwarded by props spread
      }
    }

    let insertPos: number

    // Check for explicit className prop
    if (element.openingElement.attributes.length > 0) {
      const classNameAttr = element.openingElement.attributes.find(
        (attr): attr is TSESTree.JSXAttribute =>
          isJSXAttribute(attr) && attr.name.name === 'className'
      )
      if (classNameAttr) {
        // Look for props.className being referenced anywhere in the className attribute value
        if (propsVariable && isJSXExpression(classNameAttr.value)) {
          let found = false
          simpleTraverse(classNameAttr.value.expression, {
            enter: node => {
              if (found) return
              // Look for propsVariable member expression
              if (
                isMemberExpression(node) &&
                isIdentifier(node.object) &&
                node.object.name === propsVariable.name
              ) {
                // Look for className identifier
                if (
                  isIdentifier(node.property) &&
                  node.property.name === 'className'
                ) {
                  found = true
                }
              }
            },
          })
          if (found) {
            return // className is being forwarded by props.className
          }
          // Append props.className to className attribute value
          const [start, end] = classNameAttr.value.expression.range
          result.appendLeft(start, '(')
          result.appendRight(
            end,
            ') + (props.className ? " " + props.className : "")'
          )
          return
        }

        // Merge $cn into className attribute value
        if (isLiteral(classNameAttr.value)) {
          // Convert string attribute value to JSX expression container
          const [start, end] = classNameAttr.value.range
          result.appendRight(start, '{')
          result.prependLeft(end, ' + ($cn ? " " + $cn : "")}')
          return
        }

        console.warn(
          '[vite-react-classname] Unsupported "className" value at',
          filename +
            ':' +
            classNameAttr.loc.start.line +
            ':' +
            classNameAttr.loc.start.column
        )
        return
      }

      const lastAttr = element.openingElement.attributes.at(-1)!
      insertPos = lastAttr.range[1]
    } else {
      insertPos = element.openingElement.name.range[1]
    }

    const classNameId = classNameAdded ? '$cn' : 'props.className'
    result.appendLeft(insertPos, ` className={${classNameId}}`)
  }

  // Find the root JSX element of each return statement.
  simpleTraverse(node, {
    enter: node => {
      if (!isJSXElement(node)) {
        return
      }
      const tag = node.openingElement.name
      if (isJSXIdentifier(tag) && tag.name.endsWith('Provider')) {
        return // Skip context providers
      }
      const returnOrParentElement = findParentNode(
        node,
        [T.ReturnStatement, T.JSXElement],
        parent =>
          // Avoid adding className to provider components
          !isJSXElement(parent) ||
          !isJSXIdentifier(parent.openingElement.name) ||
          !parent.openingElement.name.name.endsWith('Provider')
      )
      if (isReturnStatement(returnOrParentElement)) {
        addClassNameToJSXElement(node)
      }
    },
  })
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
