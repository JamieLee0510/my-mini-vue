import { render } from './render'
import { h } from './vnode'
import { isString } from '../utils'
import { VNode, VueHTMLElement } from '../utils/types'

export function createApp(rootComponent: any) {
    const app = {
        mount(rootContainer: VueHTMLElement | string) {
            if (isString(rootContainer)) {
                const container = document.querySelector(rootContainer as string)
                render(h(rootComponent), container as VueHTMLElement)
            } else {
                render(h(rootComponent), rootContainer as VueHTMLElement)
            }
        },
    }
    return app
}
