import type {
  AST_NODE_TYPES as NodeType,
  TSESTree,
} from '@typescript-eslint/typescript-estree'
import {
  visitorKeys as defaultVisitorKeys,
  VisitorKeys,
} from '@typescript-eslint/visitor-keys'

export type VisitorEnter<T extends TSESTree.Node = TSESTree.Node> = (
  node: T,
  ctrl: NodeTraversal
) => void

export type VisitorsRecord = {
  [K in NodeType]?: VisitorEnter<Extract<TSESTree.Node, { type: K }>>
} & {
  default?: VisitorEnter
}

function isValidNode(x: unknown): x is TSESTree.Node {
  return (
    typeof x === 'object' &&
    x != null &&
    'type' in x &&
    typeof (x as TSESTree.Node).type === 'string'
  )
}

type Options = {
  visitorKeys?: VisitorKeys
}

function getVisitorKeysForNode(
  allVisitorKeys: VisitorKeys,
  node: TSESTree.Node
): readonly string[] {
  const keys = allVisitorKeys[node.type]
  return keys ?? []
}

class NodeTraversal {
  private stopped = false
  private skipped = new Set<TSESTree.Node>()
  private selectors: VisitorsRecord & { enter?: VisitorEnter }
  private defaultSelector: VisitorEnter | undefined
  private visitorKeys: VisitorKeys
  private nodeStack: TSESTree.Node[] = []

  constructor({ visitorKeys, ...selectors }: Visitor) {
    this.selectors = selectors
    this.defaultSelector = (selectors as VisitorsRecord).default
    this.visitorKeys = visitorKeys ?? defaultVisitorKeys
  }

  get currentNode() {
    return this.nodeStack[this.nodeStack.length - 1]
  }

  skip(node?: TSESTree.Node) {
    this.skipped.add(node ?? this.currentNode)
  }

  stop() {
    this.stopped = true
  }

  traverse(node: TSESTree.Node, parent: TSESTree.Node | undefined): void {
    if (!isValidNode(node)) {
      return
    }
    if (this.stopped || this.skipped.has(node)) {
      return
    }
    if (!node.hasOwnProperty('parent')) {
      node.parent = parent
    }
    this.nodeStack.push(node)
    visit: {
      if (ownKeyExists(this.selectors, 'enter')) {
        this.selectors.enter(node, this)
        if (this.stopped || this.skipped.has(node)) {
          break visit
        }
      }

      const visitor = (
        ownKeyExists(this.selectors, node.type)
          ? this.selectors[node.type]
          : this.defaultSelector
      ) as VisitorEnter | undefined

      if (visitor) {
        visitor(node, this)
        if (this.stopped || this.skipped.has(node)) {
          break visit
        }
      }

      const keys = getVisitorKeysForNode(this.visitorKeys, node)
      for (const key of keys) {
        const childOrChildren = node[key as keyof typeof node] as
          | TSESTree.Node
          | TSESTree.Node[]
          | null
          | undefined

        if (Array.isArray(childOrChildren)) {
          for (const child of childOrChildren) {
            this.traverse(child, node)
          }
        } else if (childOrChildren) {
          this.traverse(childOrChildren, node)
        }
        if (this.stopped) {
          break visit
        }
      }
    }
    this.nodeStack.pop()
  }
}

function ownKeyExists<Key extends keyof any>(
  obj: any,
  key: Key
): obj is { [K in Key]: {} } {
  return Object.prototype.hasOwnProperty.call(obj, key) && obj[key] != null
}

export type Visitor = Options &
  ({ enter: VisitorEnter } | (VisitorsRecord & { enter?: VisitorEnter }))

export function traverse(
  startingNode: TSESTree.Node,
  visitor: Visitor | VisitorEnter
): void {
  const options = typeof visitor === 'function' ? { enter: visitor } : visitor
  const ctrl = new NodeTraversal(options)
  ctrl.traverse(startingNode, undefined)
}
