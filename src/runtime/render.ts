import { isBoolean } from '../utils'
import { ShapeFlags, VNode } from '../utils/types'

export function render(vnode: VNode, container: HTMLElement) {
    mount(vnode, container)
}

function mount(vnode: VNode, container: HTMLElement) {
    const { shapeFlags } = vnode
    if (shapeFlags & ShapeFlags.ELEMENT) {
        mountElement(vnode, container)
    } else if (shapeFlags & ShapeFlags.TEXT) {
        mountTextNode(vnode, container)
    } else if (shapeFlags & ShapeFlags.FRAGMENT) {
        mountFragment(vnode, container)
    } else {
        mountComponent(vnode, container)
    }
}
function mountElement(vnode: VNode, container: HTMLElement) {
    const { type, props, children } = vnode
    const el = document.createElement(type as string)
    mountProps(props!, el)
    mountChildren(vnode, el)
    container.appendChild(el)
}

function mountTextNode(vnode: VNode, container: HTMLElement) {
    const textNode = document.createTextNode(vnode.children as string)
    container.append(textNode)
}
function mountFragment(vnode: VNode, container: HTMLElement) {
    mountChildren(vnode, container)
}

function mountComponent(vnode: VNode, container: HTMLElement) {}
function mountChildren(vnode: VNode, container: HTMLElement) {
    const { shapeFlags, children } = vnode
    if (shapeFlags & ShapeFlags.TEXT) {
        mountTextNode(vnode, container)
    } else if (shapeFlags & ShapeFlags.ARRAY_CHILDREN) {
        ;(children as Array<any>).forEach((child) => {
            mount(child, container)
        })
    }
}

const domPropsRE = /[A-Z]|^(value|checked|selected|muted|disabled)$/

/**
 * @param props
 * 偷懶寫法、
 * 把props.class只用字符串處理
 * props.styles 為對象
 * 事件用`on`開頭
 * example：
 {
  class: 'a b',
  style: {
    color: 'red',
    fontSize: '14px',
  },
  onClick: () => console.log('click'),
  checked: '',
  custom: false
}
 */
function mountProps(props: Object, el: HTMLElement) {
    for (const key in props) {
        let value = props[key]
        switch (key) {
            case 'class':
                el.className = value
                break
            case 'style':
                for (const styleName in value) {
                    el.style[styleName] = value[styleName]
                }
                break
            default:
                // deal with event
                if (/^on[^a-z]/.test(key)) {
                    const eventName = key.slice(2).toLowerCase()
                    el.addEventListener(eventName, value)
                } else if (domPropsRE.test(key)) {
                    // need setAttribue key

                    // deal with {'checked':''}
                    if (value == '' && isBoolean(el[key])) {
                        value = true
                        el[key] = value
                    } else {
                        if (value == null || value === false) {
                            // 像是移除disable
                            el.removeAttribute(key)
                        } else {
                            el.setAttribute(key, value)
                        }
                    }
                } else {
                    // like id
                    el[key] = value
                }
                break
        }
    }
}
