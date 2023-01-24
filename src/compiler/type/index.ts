import { NodeTypes, ElementTypes } from '../ast'

export type RootNode = {
    type: NodeTypes.ROOT
    children: any[]
}

export type TextNode = {
    type: NodeTypes.TEXT
    content: string
}

export type ExpressionNode = {
    type: NodeTypes.SIMPLE_EXPRESSION
    content: string
    isStatic: boolean
}

export type InterpolationNode = {
    type: NodeTypes.INTERPOLATION
    content: {
        type: NodeTypes.SIMPLE_EXPRESSION
        content: string
        isStatic: false
    }
}

export type ElementNode = {
    type: NodeTypes.ELEMENT
    tag: string // 标签名,
    tagType: ElementTypes // 是组件还是原生元素,
    props: any[] // 属性节点数组,
    directives: any[] // 指令数组
    isSelfClosing: boolean // 是否是自闭合标签,
    children: any[]
}

export type AttributeNode = {
    type: NodeTypes.ATTRIBUTE
    name: string
    value:
        | undefined
        | {
              type: NodeTypes.TEXT
              content: string
          } // 纯文本节点
}

export type DirectiveNode = {
    type: NodeTypes.DIRECTIVE
    name: string
    exp:
        | undefined
        | {
              type: NodeTypes.SIMPLE_EXPRESSION
              content: string
              isStatic: false
          } // 表达式节点
    arg:
        | undefined
        | {
              type: NodeTypes.SIMPLE_EXPRESSION
              content: string
              isStatic: true
          } // 表达式节点
}

export type NullNode = {
    type: NodeTypes.NULL
    content: null
}

export type AstNodeType =
    | RootNode
    | TextNode
    | ExpressionNode
    | InterpolationNode
    | ElementNode
    | AttributeNode
    | DirectiveNode
    | NullNode

export type AstContext = {
    source: string
    options: any
}
