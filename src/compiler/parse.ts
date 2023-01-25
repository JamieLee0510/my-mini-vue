import { isValidTag, isNativeTag, camelize } from '../utils'
import { NodeTypes, ElementTypes, createRoot } from './ast'
import {
    AstContext,
    AstNodeType,
    AttributeNode,
    ChildrenNode,
    DirectiveNode,
    ElementNode,
    InterpolationNode,
    RootNode,
    TextNode,
} from './type'

export function parse(content: string): RootNode {
    // 因為Vue是選擇函數式的寫法、而不是OOP，
    // 所以會需要context來傳遞上下文（？
    const context = createParseContext(content)
    const children = parseChildren(context)
    return createRoot(children)
}
function createParseContext(content: string): AstContext {
    return {
        options: {
            delimiters: ['{{', '}}'],
            isValidTag, // 把解析tag的方法放到options裡,
            isNativeTag, // 可以讓“跨平台”方便配置
        },
        source: content,
    }
}

function parseChildren(context: AstContext) {
    const nodes: ChildrenNode[] = []

    while (!isEnd(context)) {
        const s = context.source
        let node: ChildrenNode
        if (s.startsWith(context.options.delimiters[0])) {
            // parseInterpolation
            node = parseInterpolation(context)
        } else if (s[0] === '<') {
            // parseElement
            node = parseElement(context)
        } else {
            // parseText
            node = parseText(context)
        }
        nodes.push(node)
    }

    // 優化：對於多餘空白格的優化
    let removedWhitespacesFlag = false
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i]
        if (node.type === NodeTypes.TEXT) {
            // 區分文本節點是否全是空白
            if (/[^\t\r\f\n ]/.test(node!.content)) {
                // 文本節點有一些字符,用正則匹配空白
                node.content = node.content.replace(/[\t\r\f\n ]+/g, ' ')
            } else {
                // 文本節點全是空白
                const prev = nodes[i - 1]
                const next = nodes[i + 1]
                if (
                    !prev ||
                    !next ||
                    (prev.type === NodeTypes.ELEMENT &&
                        next.type === NodeTypes.ELEMENT &&
                        /[\r\n]/.test(node.content))
                ) {
                    // 刪除空白節點
                    removedWhitespacesFlag = true
                    nodes[i] = { type: NodeTypes.NULL, content: null }
                } else {
                    node.content = ' '
                }
            }
        }
    }
    return removedWhitespacesFlag ? nodes.filter((node) => node.type !== NodeTypes.NULL) : nodes
}

// 缺陷：
// 假如文本為`a<b`、`/`
function parseText(context: AstContext): TextNode {
    const endToken = ['<', context.options.delimiters[0]]

    let endIndex = context.source.length // 不減1是因為要用slice來截取
    for (let i = 0; i < endToken.length; i++) {
        const index = context.source.indexOf(endToken[i])
        if (index !== -1 && index < endIndex) {
            endIndex = index
        }
    }

    return {
        type: NodeTypes.TEXT,
        content: parseTextData(context, endIndex),
    }
}
function parseElement(context: AstContext): ElementNode {
    // start tag
    const element = parseTag(context)

    // 假如是element是自閉合，就直接返回element、不用繼續parse
    if (element.isSelfClosing || context.options.isValidTag(element.tag)) {
        return element
    }
    // parseChildren
    element.children = parseChildren(context)

    // end tag
    parseTag(context)

    return element
}

function parseTag(context: AstContext): ElementNode {
    const match = /^<\/?([a-z][^\t\r\n\f />]*)/i.exec(context.source)

    const tag = match![1] //[0]為開頭符號'<',正則裡面有分組了

    advanceBy(context, match![0].length)
    advanceSpaces(context)
    const { props, directives } = parseAttributes(context)
    const isSelfClosing = context.source.startsWith('/>')
    advanceBy(context, isSelfClosing ? 2 : 1)

    const tagType = isComponent(context, tag) ? ElementTypes.COMPONENT : ElementTypes.ELEMENT

    return {
        type: NodeTypes.ELEMENT,
        tag,
        tagType,
        props,
        directives,
        isSelfClosing,
        children: [],
    }
}

function parseAttributes(context: AstContext) {
    const props: any[] = []
    const directives: any[] = []

    while (
        context.source.length &&
        !context.source.startsWith('>') &&
        !context.source.startsWith('/>')
    ) {
        let attr = parseAttribute(context)
        if (attr.type === NodeTypes.DIRECTIVE) {
            directives.push(attr)
        } else {
            props.push(attr)
        }
    }
    return { props, directives }
}

// <div v-if="hi"></div>
function parseAttribute(context: AstContext): DirectiveNode | AttributeNode {
    const match = /^[^\t\r\n\f />][^\t\r\n\f />=]*/.exec(context.source)
    const name = match![0]
    advanceBy(context, name.length)
    advanceSpaces(context)

    let value
    if (context.source[0] === '=') {
        advanceBy(context, 1) // 把等號去掉
        advanceSpaces(context) // 可能等號前面有空格
        value = parseAttributeValue(context)
        advanceSpaces(context) // 可能後面有空格
    }
    // Direction, 靠name來判別--- ‘v-*’ or ‘:*’
    if (/^(:|@|v-)/.test(name)) {
        // <div :class="foo">...</div>
        // <div @click="foo">...</div>
        // <div v-bind:class="foo">...</div>
        let dirName, attrContent
        if (name[0] === ':') {
            dirName = 'bind'
            attrContent = name.slice(1)
        } else if (name[0] === '@') {
            dirName = 'on'
            attrContent = name.slice(1)
        } else if (name.startsWith('v-')) {
            ;[dirName, attrContent] = name.slice(2).split(':')
        }

        return {
            type: NodeTypes.DIRECTIVE,
            name: dirName,
            exp: value && {
                type: NodeTypes.SIMPLE_EXPRESSION,
                content: value.content,
                isStatic: false,
            }, // 表达式节点
            arg: attrContent && {
                type: NodeTypes.SIMPLE_EXPRESSION,
                content: camelize(attrContent),
                isStatic: true,
            }, // 表达式节点
        }
    }

    // Attribule
    return {
        type: NodeTypes.ATTRIBUTE,
        name,
        value: value && {
            type: NodeTypes.TEXT,
            content: value.content,
        }, // 纯文本节点
    }
}

function parseAttributeValue(context: AstContext) {
    // 預設一定有個引號
    const quote = context.source[0]
    advanceBy(context, 1)
    const endIndex = context.source.indexOf(quote)
    const content = parseTextData(context, endIndex)
    advanceBy(context, 1) // 去掉最後一個引號

    return { content }
}

function parseInterpolation(context: AstContext): InterpolationNode {
    const [openFlag, closeFlag] = context.options.delimiters
    advanceBy(context, openFlag.length)

    const endIndex = context.source.indexOf(closeFlag)
    const content = parseTextData(context, endIndex).trim()

    advanceBy(context, closeFlag.length)
    return {
        type: NodeTypes.INTERPOLATION,
        content: {
            type: NodeTypes.SIMPLE_EXPRESSION,
            content,
            isStatic: false,
        },
    }
}

function parseTextData(context: AstContext, length: number) {
    const text = context.source.slice(0, length)
    advanceBy(context, length)
    return text
}

function isEnd(context: AstContext) {
    const s = context.source
    return s.startsWith('</') || !s
}

// 吃掉字符
function advanceBy(context: AstContext, numberOfCharacters: number) {
    context.source = context.source.slice(numberOfCharacters)
}

// 吃掉空格
function advanceSpaces(context: AstContext) {
    const match = /^[\t\r\n\f ]+/.exec(context.source)
    if (match) {
        advanceBy(context, match[0].length)
    }
}

function isComponent(context: AstContext, tag: string) {
    return !context.options.isNativeTag(tag)
}
