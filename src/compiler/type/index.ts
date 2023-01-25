import { NodeTypes, ElementTypes } from '../ast'

// 根節點
export type RootNode = {
    type: NodeTypes.ROOT
    children: ChildrenNode[]
}

// 文本節點
export type TextNode = {
    type: NodeTypes.TEXT
    content: string
}

//  js表達式節點---v-if、:、@
export type ExpressionNode = {
    type: NodeTypes.SIMPLE_EXPRESSION
    content: string
    isStatic: boolean
}

// 插值節點---{{count}}
export type InterpolationNode = {
    type: NodeTypes.INTERPOLATION
    content: {
        type: NodeTypes.SIMPLE_EXPRESSION
        content: string
        isStatic: false
    }
}

// 元素節點，原生元素或Vue組件
export type ElementNode = {
    type: NodeTypes.ELEMENT
    tag: string // 标签名,
    tagType: ElementTypes // 是组件还是原生元素,
    props: AttributeNode[] // 属性节点数组,
    directives: DirectiveNode[] // 指令数组
    isSelfClosing: boolean // 是否是自闭合标签,
    children: ChildrenNode[]
}

export type AttributeNode = {
    type: NodeTypes.ATTRIBUTE
    name: string
    value: undefined | TextNode // 纯文本节点
}

export type DirectiveNode = {
    type: NodeTypes.DIRECTIVE
    name: string
    exp: undefined | ExpressionNode // 表达式节点
    arg: undefined | ExpressionNode // 表达式节点
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

export type ChildrenNode = TextNode | InterpolationNode | ElementNode | InterpolationNode | NullNode

export type AstContext = {
    source: string
    options: any
}
