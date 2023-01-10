import { isBoolean } from '../utils'
import { ShapeFlags, VNode, VueHTMLElement } from '../utils/types'

export function render(vnode: VNode | null, container: VueHTMLElement) {
    const prevVNode = container._vnode
    if (!vnode) {
        if (prevVNode) {
            unmount(prevVNode)
        }
    } else {
        patch(prevVNode!, vnode, container)
    }
    container!._vnode = vnode
}
function unmount(vnode: VNode) {
    const { shapeFlags, el } = vnode
    if (shapeFlags & ShapeFlags.COMPONENT) {
        unmountComponent(vnode)
    } else if (shapeFlags & ShapeFlags.FRAGMENT) {
        unmountFragment(vnode)
    } else {
        el?.parentNode?.removeChild(el)
    }
}

function patch(n1: VNode | null, n2: VNode, container: VueHTMLElement) {
    if (n1 && !isSameNode(n1, n2)) {
        unmount(n1)
        // n1 = null
    }
    const { shapeFlags } = n2

    if (shapeFlags & ShapeFlags.COMPONENT) {
        processComponent(n1, n2, container)
    } else if (shapeFlags & ShapeFlags.TEXT) {
        processText(null, n2, container)
    } else if (shapeFlags & ShapeFlags.FRAGMENT) {
        processFragment(null, n2, container)
    } else {
        processElement(null, n2, container)
    }
}

function isSameNode(n1, n2) {
    return n1.type === n2.type
}

function processComponent(n1: VNode | null, n2: VNode, container: VueHTMLElement) {
    //TODO
    console.log('processComponent')
    // mountComponent(n2, container)
}
function processText(n1: VNode | null, n2: VNode, container: VueHTMLElement) {
    if (n1) {
        n2.el = n1.el
        n1.el!.textContent = n2.children as string
    } else {
        mountTextNode(n2, container)
    }
}

function processFragment(n1: VNode | null, n2: VNode, container: VueHTMLElement) {
    if (n1) {
        patchChildren(n1, n2, container)
    } else {
        mountChildren(n2.children, container)
    }
}

function processElement(n1: VNode | null, n2: VNode, container: VueHTMLElement) {
    if (n1) {
        patchElement(n1, n2)
    } else {
        mountElement(n2, container)
    }
}

function mountTextNode(vnode: VNode, container: HTMLElement) {
    console.log(vnode.children)
    const textNode = document.createTextNode(vnode.children as string)
    container.append(textNode)
    vnode.el = textNode // vnode 記錄掛載的真實的dom節點
}
function mountElement(vnode: VNode, container: HTMLElement) {
    const { shapeFlags, type, props, children } = vnode
    const el = document.createElement(type as string)
    console.log('mountElement, vnode:', vnode)
    //mountProps(props!, el)
    patchProps(null, props, el)

    if (shapeFlags & ShapeFlags.TEXT_CHILDREN) {
        mountTextNode(vnode, el)
    } else if (shapeFlags & ShapeFlags.ARRAY_CHILDREN) {
        mountChildren(children, el)
    }

    container.appendChild(el)
    vnode.el = el // vnode 記錄掛載的真實的dom節點
}

const domPropsRE = /[A-Z]|^(value|checked|selected|muted|disabled)$/

// function mountProps(props: Object, el: HTMLElement) {
//     for (const key in props) {
//         let value = props[key]
//         switch (key) {
//             case 'class':
//                 el.className = value
//                 break
//             case 'style':
//                 for (const styleName in value) {
//                     el.style[styleName] = value[styleName]
//                 }
//                 break
//             default:
//                 // deal with event
//                 if (/^on[^a-z]/.test(key)) {
//                     const eventName = key.slice(2).toLowerCase()
//                     el.addEventListener(eventName, value)
//                 } else if (domPropsRE.test(key)) {
//                     // need setAttribue key

//                     // deal with {'checked':''}
//                     if (value == '' && isBoolean(el[key])) {
//                         value = true
//                         el[key] = value
//                     } else {
//                         if (value == null || value === false) {
//                             // 像是移除disable
//                             el.removeAttribute(key)
//                         } else {
//                             el.setAttribute(key, value)
//                         }
//                     }
//                 } else {
//                     // like id
//                     el[key] = value
//                 }
//                 break
//         }
//     }
// }
function mountChildren(children: string | number | Array<any> | null, container: HTMLElement) {
    ;(children as Array<any>).forEach((child) => {
        patch(null, child, container)
    })
}
function unmountComponent(vnode: VNode) {
    throw new Error('Function not implemented.')
}

function unmountFragment(vnode: VNode) {
    throw new Error('Function not implemented.')
}

function unmountChildren(children: string | number | any[] | null) {
    ;(children as Array<any>).forEach((child) => {
        unmount(child)
    })
}

function patchElement(n1: VNode, n2: VNode) {
    n2.el = n1.el
    patchProps(n1.props, n2.props, n2.el)
    patchChildren(n1, n2, n2.el as VueHTMLElement)
}
function patchProps(
    oldProps: Object | null,
    newProps: Object | null,
    el: HTMLElement | Text | undefined,
) {
    if (oldProps === newProps) {
        return
    }

    oldProps = oldProps || {}
    newProps = newProps || {} // 不用ES6的默認寫法，是因為可能為null、就沒辦法賦值

    for (const key in newProps) {
        const nextValue = newProps[key]
        const prevValue = oldProps![key]
        if (prevValue! == nextValue) {
            patchDomProps(prevValue, nextValue, key, el)
        }
    }
    for (const key in oldProps) {
        if (newProps![key] == null) {
            patchDomProps(oldProps[key], null, key, el)
        }
    }
}
function patchDomProps(prev, next, key, el) {
    switch (key) {
        case 'class':
            el.className = next || ''
            break
        case 'style':
            for (const styleName in next) {
                el.style[styleName] = next[styleName]
            }

            // 去除掉prev中的css屬性（而且next沒有的屬性）
            if (prev) {
                for (const styleName in prev) {
                    if (next[styleName] == null) {
                        el.style[styleName] = ''
                    }
                }
            }

            break
        default:
            // deal with event
            if (/^on[^a-z]/.test(key)) {
                const eventName = key.slice(2).toLowerCase()
                if (prev) {
                    el.removeEventListener(eventName, prev)
                }
                if (next) {
                    el.addEventListener(eventName, next)
                }
            } else if (domPropsRE.test(key)) {
                // need setAttribue key

                // deal with {'checked':''}
                if (next == '' && isBoolean(el[key])) {
                    next = true
                    el[key] = next
                } else {
                    if (next == null || next === false) {
                        // 像是移除disable
                        el.removeAttribute(key)
                    } else {
                        el.setAttribute(key, next)
                    }
                }
            } else {
                // like id
                el[key] = next
            }
            break
    }
}

function patchChildren(n1: VNode, n2: VNode, container: VueHTMLElement) {
    const { shapeFlags: prevShapeFlag, children: c1 } = n1
    const { shapeFlags: nextShapeFlag, children: c2 } = n2

    if (nextShapeFlag & ShapeFlags.TEXT) {
        //n2 is text-node
        if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            unmountChildren(c1)
        }
        if (c1 !== c2) {
            container!.textContent = c2 as string
        }
    } else if (nextShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // n2 is array-children
        if (prevShapeFlag & ShapeFlags.TEXT) {
            container!.textContent = ''
        } else if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            patchArrayChildren(c1 as Array<any>, c2 as Array<any>, container)
        } else {
            mountChildren(c2, container)
        }
    } else {
        //n2 null
        if (prevShapeFlag & ShapeFlags.TEXT) {
            container!.textContent = ''
        } else if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            unmountChildren(c1)
        }
    }
}

function patchArrayChildren(c1: Array<any>, c2: Array<any>, container: VueHTMLElement) {
    const oldLength = c1.length
    const newLength = c2.length
    const commonLength = Math.min(oldLength, newLength)
    for (let i = 0; i < commonLength; i++) {
        patch(c1[i], c2[i], container)
    }

    if (oldLength > newLength) {
        unmountChildren(c1.slice(commonLength))
    } else if (oldLength < newLength) {
        mountChildren(c2.slice(commonLength), container)
    }
}
