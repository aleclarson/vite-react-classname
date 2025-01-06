import { AST_NODE_TYPES as T } from '@typescript-eslint/typescript-estree'
import { isNodeOfType } from '@typescript-eslint/utils/ast-utils'

export const isJSXElement = isNodeOfType(T.JSXElement)
export const isJSXIdentifier = isNodeOfType(T.JSXIdentifier)
export const isJSXMemberExpression = isNodeOfType(T.JSXMemberExpression)
export const isJSXAttribute = isNodeOfType(T.JSXAttribute)
export const isJSXSpreadAttribute = isNodeOfType(T.JSXSpreadAttribute)
export const isJSXExpression = isNodeOfType(T.JSXExpressionContainer)
export const isFunctionDeclaration = isNodeOfType(T.FunctionDeclaration)
export const isArrowFunctionExpression = isNodeOfType(T.ArrowFunctionExpression)
export const isFunctionExpression = isNodeOfType(T.FunctionExpression)
export const isReturnStatement = isNodeOfType(T.ReturnStatement)
export const isObjectPattern = isNodeOfType(T.ObjectPattern)
export const isRestElement = isNodeOfType(T.RestElement)
export const isProperty = isNodeOfType(T.Property)
export const isMemberExpression = isNodeOfType(T.MemberExpression)
export const isArrayExpression = isNodeOfType(T.ArrayExpression)
export const isLiteral = isNodeOfType(T.Literal)
