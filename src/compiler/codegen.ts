import { capitalize } from '../utils'
import { NodeTypes } from './ast'
import {
    AstNodeType,
    DirectiveNode,
    ElementNode,
    InterpolationNode,
    RootNode,
    TextNode,
} from './type'

export function codegen(ast: RootNode) {
    const returns = traverseNode(ast)
    const code = `
    with(ctx){
        const { h, Text, Fragment, renderList, withModel, resolveComponent } = MiniVue;
        return ${returns}
    }`
    return code
}

function traverseNode(node: AstNodeType): string {
    switch (node.type) {
        case NodeTypes.ROOT:
            if (node.children.length === 1) {
                return traverseNode(node.children[0])
            }
            return traverseChildren(node)
        case NodeTypes.ELEMENT:
            return resolveElementASTNode(node as ElementNode)
        case NodeTypes.INTERPOLATION:
            return createInterPolationVNode(node)
        case NodeTypes.TEXT:
            return createTextVNode(node)

        default:
            return ''
    }
}

// 處理特殊指令，如v-if、v-for
function resolveElementASTNode(node: ElementNode) {
    const forNode = plunk(node.directives, 'for')
    if (forNode) {
        // 處理for nodes,借助runtime中的 renderList函數
        // (item, index) in items
        const { exp } = forNode
        const [args, source] = exp!.content.split(/\sin\s|\sof\s/)
        // renderList(items, (item,index)=>h('div',null,item+index))
        return `h(Fragment, null, 
            renderList(
                ${source.trim()},
                ${args.trim()}=>${createElementVNode(node)}))`
    }
    return createElementVNode(node)
}

function createTextVNode(node: TextNode) {
    const child = createText(node)
    return `h(Text,null,${child})`
}
function createInterPolationVNode(node: InterpolationNode) {
    const child = createText(node.content)
    return `h(Text,null,${child})`
}
function createText({ isStatic = true, content = '' }: { isStatic?: boolean; content?: any } = {}) {
    return isStatic ? JSON.stringify(content) : content
}

function createElementVNode(node: ElementNode) {
    const { children } = node
    const tag = JSON.stringify(node.tag)

    const propsArr = createPropArr(node)
    const propsStr = propsArr.length ? `{${propsArr.join(', ')}}` : 'null'

    if (!children.length) {
        if (propsStr !== 'null') {
            return `h(${tag}, ${propsStr})`
        }
        return `h(${tag})`
    }
    let childrenStr = traverseChildren(node)

    return `h(${tag},${propsStr}, ${childrenStr})`
}

function createPropArr(node: ElementNode): string[] {
    const { props, directives } = node

    return [
        ...props.map((prop) => `${prop.name}:${createText(prop.value)}`),
        ...directives.map((dir) => {
            switch (dir.name) {
                case 'bind':
                    return `${dir.arg!.content}: ${createText(dir.exp)}`
                case 'on':
                    const eventName = `on${capitalize(dir.arg!.content)}`

                    let exp = dir.exp!.content

                    // 簡單判斷，不嚴謹---通過判斷它是否以`()`結尾，且不包含 "=>"
                    // vue原始碼的判斷很複雜，還要用到第三方庫
                    if (/\([^)]*?\)$/.test(exp) && !exp.includes('=>')) {
                        exp = `$event => (${exp})`
                    }

                    return `${eventName}: ${exp}`
                case 'html':
                    return `innerHTML: ${createText(dir.exp)}`
                default:
                    return `${dir.name}: ${createText(dir.exp)}`
            }
        }),
    ]
}

function traverseChildren(node: ElementNode | RootNode) {
    const { children } = node

    // 單節點
    if (children.length === 1) {
        const child = children[0]
        if (child.type === NodeTypes.TEXT) {
            return createText(child)
        }
        if (child.type === NodeTypes.INTERPOLATION) {
            return createText(child.content)
        }
    }
    const results: string[] = []

    for (let i = 0; i < children.length; i++) {
        const child = children[i]
        results.push(traverseNode(child))
    }
    return `[${results.join(', ')}]`
}

function plunk(directives: DirectiveNode[], name: string, remove: boolean = true): DirectiveNode {
    const index = directives.findIndex((dir) => dir.name == name)
    const dir = directives[index]
    if (index > -1 && remove) {
        directives.splice(index, 1)
    }
    return dir
}
