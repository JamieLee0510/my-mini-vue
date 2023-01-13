import { isBoolean } from '../utils'
import { Anchor, ShapeFlags, VNode, VueHTMLElement } from '../utils/types'

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

function patch(n1: VNode | null, n2: VNode, container: VueHTMLElement, anchor?: Anchor) {
    if (n1 && !isSameNode(n1, n2)) {
        anchor = (n1.anchor || n1.el!).nextSibling as Anchor
        unmount(n1)
        n1 = null
    }
    const { shapeFlags } = n2
    if (shapeFlags & ShapeFlags.COMPONENT) {
        processComponent(n1, n2, container, anchor)
    } else if (shapeFlags & ShapeFlags.TEXT) {
        processText(n1, n2, container, anchor)
    } else if (shapeFlags & ShapeFlags.FRAGMENT) {
        processFragment(n1, n2, container, anchor)
    } else {
        processElement(n1, n2, container, anchor)
    }
}

function isSameNode(n1, n2) {
    return n1.type === n2.type
}

function processComponent(n1: VNode | null, n2: VNode, container: VueHTMLElement, anchor?: Anchor) {
    //TODO
}
function processText(n1: VNode | null, n2: VNode, container: VueHTMLElement, anchor?: Anchor) {
    if (n1) {
        n2.el = n1.el
        n1.el!.textContent = n2.children as string
    } else {
        mountTextNode(n2, container, anchor)
    }
}

function processFragment(n1: VNode | null, n2: VNode, container: VueHTMLElement, anchor?: Anchor) {
    // 建立兩個空的節點，讓fragment patch可以插入
    const fragmentStartAnchor = (n2.el = n1 ? n1.el : document.createTextNode(''))
    const fragmentEndAnchor = (n2.anchor = n1 ? n1.anchor : document.createTextNode(''))
    if (n1) {
        patchChildren(n1, n2, container, fragmentEndAnchor)
    } else {
        container.insertBefore(fragmentStartAnchor!, anchor!)
        container.insertBefore(fragmentEndAnchor!, anchor!)
        // 確保新插入的children在fragmentEndAnchor之前
        mountChildren(n2.children, container, fragmentEndAnchor)
    }
}

function processElement(n1: VNode | null, n2: VNode, container: VueHTMLElement, anchor?: Anchor) {
    if (n1) {
        patchElement(n1, n2)
    } else {
        mountElement(n2, container, anchor as Anchor)
    }
}

function mountTextNode(vnode: VNode, container: HTMLElement, anchor?: Anchor) {
    const textNode = document.createTextNode(vnode.children as string)

    container.insertBefore(textNode, anchor!)
    vnode.el = textNode // vnode 記錄掛載的真實的dom節點
}
function mountElement(vnode: VNode, container: HTMLElement, anchor: Text | null) {
    const { shapeFlags, type, props, children } = vnode
    const el = document.createElement(type as string)

    //mountProps(props!, el)
    if (props) {
        patchProps(null, props, el)
    }

    if (shapeFlags & ShapeFlags.TEXT_CHILDREN) {
        mountTextNode(vnode, el)
    } else if (shapeFlags & ShapeFlags.ARRAY_CHILDREN) {
        // 这里不能传anchor。因为anchor限制的是当前的element
        // 作为本element的children，不用指定anchor，append就行
        mountChildren(children, el)
    }

    // container.appendChild(el)
    container.insertBefore(el, anchor)
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
function mountChildren(
    children: string | number | Array<any> | null | Node,
    container: HTMLElement,
    anchor?: Anchor,
) {
    ;(children as Array<any>).forEach((child) => {
        patch(null, child, container, anchor)
    })
}
function unmountComponent(vnode: VNode) {
    throw new Error('Function not implemented.')
}

function unmountFragment(vnode: VNode) {
    throw new Error('Function not implemented.')
}

function unmountChildren(children: string | number | any[] | null | Node) {
    ;(children as Array<any>).forEach((child) => {
        unmount(child)
    })
}
// patchElement不需要anchor??
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
        if (key === 'key') {
            continue
        }
        const nextValue = newProps[key]
        const prevValue = oldProps![key]
        if (prevValue !== nextValue) {
            patchDomProps(prevValue, nextValue, key, el)
        }
    }
    for (const key in oldProps) {
        if (key !== 'key' && newProps![key] == null) {
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
            if (!next) {
                el.removeAttribute('style')
            } else {
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
            }

            break
        default:
            // 專案寫法：
            if (/^on[^a-z]/.test(key)) {
                const eventName = key.slice(2).toLowerCase()
                if (prev) {
                    el.removeEventListener(eventName, prev)
                }
                if (next) {
                    el.addEventListener(eventName, next)
                }
            } else if (domPropsRE.test(key)) {
                // {'checked': ''}
                if (next === '' && isBoolean(el[key])) {
                    next = true
                }
                el[key] = next
            } else {
                // attr
                if (next == null || next === false) {
                    el.removeAttribute(key)
                } else {
                    el.setAttribute(key, next)
                }
            }

            // // deal with event，原本的寫法
            // if (/^on[^a-z]/.test(key)) {
            //     const eventName = key.slice(2).toLowerCase()
            //     if (prev) {
            //         el.removeEventListener(eventName, prev)
            //     }
            //     if (next) {
            //         el.addEventListener(eventName, next)
            //     }
            // } else if (domPropsRE.test(key)) {
            //     // need setAttribue key

            //     // deal with {'checked':''}
            //     if (next == '' && isBoolean(el[key])) {
            //         next = true
            //         el[key] = next
            //     } else {
            //         if (next == null || next === false) {
            //             // 像是移除disable
            //             el.removeAttribute(key)
            //         } else {
            //             el.setAttribute(key, next)
            //         }
            //     }
            // } else {
            //     // like id
            //     el[key] = next
            // }
            break
    }
}

function patchChildren(n1: VNode, n2: VNode, container: VueHTMLElement, anchor?: Anchor) {
    const { shapeFlags: prevShapeFlag, children: c1 } = n1
    const { shapeFlags: nextShapeFlag, children: c2 } = n2

    if (nextShapeFlag & ShapeFlags.TEXT_CHILDREN) {
        //n2 is text-node
        if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            unmountChildren(c1)
        }
        if (c1 !== c2) {
            container!.textContent = c2 as string
        }
    } else if (nextShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // n2 is array-children
        if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
            container!.textContent = ''
            mountChildren(c2, container, anchor)
        } else if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            // use 'key' to apply diff
            // 偷懶：假如第一個元素有key，就當作都有key
            if (
                (c1 as Array<any>)[0] &&
                (c1 as Array<any>)[0].key !== null &&
                (c2 as Array<any>)[0] &&
                (c2 as Array<any>)[0].key !== null
            ) {
                patchKeyedChildren(c1 as Array<any>, c2 as Array<any>, container, anchor)
            } else {
                patchUnkeyedChildren(c1 as Array<any>, c2 as Array<any>, container, anchor)
            }
        } else {
            mountChildren(c2, container)
        }
    } else {
        //n2 null
        if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
            container!.textContent = ''
        } else if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            unmountChildren(c1)
        }
    }
}

function patchUnkeyedChildren(
    c1: Array<any>,
    c2: Array<any>,
    container: VueHTMLElement,
    anchor?: Anchor,
) {
    const oldLength = c1.length
    const newLength = c2.length
    const commonLength = Math.min(oldLength, newLength)
    for (let i = 0; i < commonLength; i++) {
        patch(c1[i], c2[i], container, anchor)
    }

    if (oldLength > newLength) {
        unmountChildren(c1.slice(commonLength))
    } else if (oldLength < newLength) {
        // should anchor??
        mountChildren(c2.slice(commonLength), container, anchor)
    }
}

/**
 *
 * 這個寫法，是接近React的實現（diff）
 * @param c1
 * @param c2
 * @param container
 * @param anchor
 */
function patchKeyedChildren_old(
    c1: Array<any>,
    c2: Array<any>,
    container: VueHTMLElement,
    anchor?: Anchor,
) {
    const map = new Map()
    c1.forEach((prev, index) => {
        map.set(prev.key, { prev, index })
    })
    let maxNewIndexSoFar = 0
    for (let i = 0; i < c2.length; i++) {
        const next = c2[i]
        if (map.has(next.key)) {
            const { prev, index } = map.get(next.key)
            patch(prev, next, container, anchor)
            if (index < maxNewIndexSoFar) {
                const curAnchor = i === 0 ? c1[0].el : c2[i - 1].el.nextSibling
                // if el didnot exist before-->insert to anchor before;
                // if el existed-->move to anchor before
                container.insertBefore(next.el, curAnchor)
            } else {
                maxNewIndexSoFar = index
            }
            map.delete(next.key)
        } else {
            // new child in new array, need to insert
            const curAnchor = i === 0 ? c1[0].el : c2[i - 1].el.nextSibling
            patch(null, next, container, curAnchor)
        }
    }
    map.forEach(({ prep }) => {
        unmount(prep)
    })
}

/**
 * 現在Vue3的diff算法
 * @param c1
 * @param c2
 * @param container
 * @param anchor
 */
function patchKeyedChildren(
    c1: Array<any>,
    c2: Array<any>,
    container: VueHTMLElement,
    anchor?: Anchor,
) {
    let index = 0
    let end01 = c1.length - 1
    let end02 = c2.length - 1

    // comparing from left to right
    while (index <= end01 && index <= end02 && c1[index].key == c2[index].key) {
        patch(c1[index], c2[index], container, anchor)
        index++
    }

    // comparing from right to left
    while (index <= end01 && index <= end02 && c1[end01].key == c2[end02].key) {
        patch(c1[end01], c2[end02], container, anchor)
        end01--
        end02--
    }

    if (index > end01) {
        // 代表 prev-children 都比對完了，next-children剩下的直接mount
        for (let j = index; j <= end02; j++) {
            const nextPos = end02 + 1
            const curAnchor = c2[nextPos] ? c2[nextPos].el : anchor
            patch(null, c2[j], container, curAnchor)
        }
    } else if (index > end02) {
        // 代表比對完後，prev-children還有沒有比對的、代表需要unmount
        for (let j = index; j <= end01; j++) {
            unmount(c1[j])
        }
    } else {
        // 經過由左至右和由右至左比對後，prev和next中間都還有剩
        // 就要用傳統的diff算法，但不添加和移動、只標記和刪除
        // 創建一個source array，記錄新節點在舊array中的index，沒有就-1

        const map = new Map()

        // 還要考慮c1的前後，也可能被diff截掉
        for (let preIndex = index; preIndex <= end01; preIndex++) {
            const prev = c1[preIndex]
            map.set(prev.key, { prev, preIndex })
        }
        // c1.forEach((prev, preIndex) => {
        //     map.set(prev.key, { prev, preIndex })
        // })

        let maxNewIndexSoFar = 0
        let needMove = false
        const source = new Array(end02 - index + 1).fill(-1)

        const toMounted: any[] = []

        for (let i = 0; i < source.length; i++) {
            const next = c2[i + index]
            if (map.has(next.key)) {
                const { prev, preIndex } = map.get(next.key)
                patch(prev, next, container, anchor)
                if (preIndex < maxNewIndexSoFar) {
                    needMove = true
                } else {
                    maxNewIndexSoFar = preIndex
                }
                source[i] = preIndex
                map.delete(next.key)
            } else {
                // TODO,特殊情況（不需要移動，但有需要添加的元素）
                // 記錄下標
                toMounted.push(i + index)
            }
        }
        map.forEach(({ prep }) => {
            unmount(prep)
        })
        if (needMove) {
            // 需要移動時，使用最新的最長遞增子序列
            const seq = getSequence(source)
            let seqEnd = seq.length - 1
            for (let i = source.length - 1; i >= 0; i--) {
                if (source[seqEnd] == i) {
                    // 代表不用移動
                    seqEnd--
                } else {
                    const pos = i + index
                    const nextPos = pos + 1
                    const curAnchor = c2[nextPos] ? c2[nextPos].el : anchor
                    if (source[i] == -1) {
                        // mount
                        patch(null, c2[pos], container, curAnchor)
                    } else {
                        // 要移動
                        container.insertBefore(c2[pos].el, curAnchor)
                    }
                }
            }
        }
        if (toMounted.length !== 0) {
            for (let i = toMounted.length - 1; i >= 0; i--) {
                const pos = toMounted[i]
                const nextPos = pos + 1
                const curAnchor = c2[nextPos] ? c2[nextPos].el : anchor

                // mount
                patch(null, c2[pos], container, curAnchor)
            }
        }
    }
}

// 最長上升子序列的
function getSequence(nums: number[]): number[] {
    const arr = [nums[0]]
    const position = [0]
    for (let i = 1; i < nums.length; i++) {
        if (nums[i] === -1) {
            // source[]裡面可能有-1，代表要新增的節點，因此不參與LIS
            continue
        }
        if (nums[i] > arr[arr.length - 1]) {
            arr.push(nums[i])
            position.push(arr.length - 1)
        } else {
            let l = 0,
                r = arr.length - 1
            while (l <= r) {
                let mid = ~~((l + r) / 2)
                if (nums[i] > arr[mid]) {
                    l = mid + 1
                } else if (nums[i] < arr[mid]) {
                    r = mid - 1
                } else {
                    l = mid
                    break
                }
            }
            arr[l] = nums[i]
            position.push(l)
        }
    }

    let cur = arr.length - 1
    for (let i = position.length - 1; i >= 0 && cur >= 0; i--) {
        if (position[i] === cur) {
            arr[cur--] = i
        }
    }
    return arr
}
