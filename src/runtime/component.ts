import { Anchor, Instance, VNode, VueHTMLElement } from '../utils/types'
import { reactive, watchEffect } from '../reactive'
import { VNodeObject } from '../utils/types'
import { normalizeVNode } from './vnode'
import { patch } from './render'
import { queueJob } from './scheduler'

function updateProps(instance: Instance, vnode: VNode) {
    // 這邊有點不太懂，
    const { type: component, props: vnodeProps } = vnode
    const props = (instance.props = {})
    const attrs = (instance.attrs = {})

    for (const key in vnodeProps) {
        // 先假設vue component 的 props只接收array
        if (component['props']?.includes(key)) {
            props[key] = vnodeProps[key]
        } else {
            attrs[key] = vnodeProps[key]
        }
    }

    // 更新了props，也要重新渲染，因此也要把props轉換成響應式
    // 不過Vue 源碼是用 shallowReactive
    instance.props = reactive(instance.props)
}

export function mountComponent(vnode: VNode, container: VueHTMLElement, anchor?: Anchor) {
    const component = vnode.type as VNodeObject
    const instance: Instance = (vnode.component = {
        props: null,
        attrs: null,
        setupState: null,
        ctx: null,
        isMounted: false,
        subtree: null, // 為了保存上一次的狀態，用於patch
        next: null, // 專門存儲n2
        update: null,
    })
    updateProps(instance, vnode)
    if (component.setup) {
        instance.setupState = component.setup(instance.props, { attrs: instance.attrs })
    }

    // Vue3的源碼是用Proxy來代理
    instance.ctx = {
        ...instance.props,
        ...instance.setupState,
    }

    instance.update = watchEffect(
        () => {
            if (!instance.isMounted) {
                // mount state
                const subTree = (instance.subtree = normalizeVNode(component.render(instance.ctx)))

                // 繼承attrs
                if (Object.keys(instance.attrs).length) {
                    subTree.props = {
                        ...subTree.props,
                        ...instance.attrs,
                    }
                }

                patch(null, subTree, container, anchor)
                instance.isMounted = true
            } else {
                // update state
                if (instance.next) {
                    //被動更新

                    vnode = instance.next
                    instance.next = null

                    updateProps(instance, vnode)
                    instance.ctx = {
                        ...instance.props,
                        ...instance.setupState,
                    }
                }
                // 主動更新
                const preSubtree = instance.subtree
                const subTree = (instance.subtree = normalizeVNode(component.render(instance.ctx)))

                // 繼承attrs
                if (Object.keys(instance.attrs).length) {
                    subTree.props = {
                        ...subTree.props,
                        ...instance.attrs,
                    }
                }

                patch(preSubtree, subTree, container, anchor)
            }
        },
        {
            scheduler: queueJob,
        },
    )
}
