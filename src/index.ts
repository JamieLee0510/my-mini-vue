import { compile } from './compiler/compile'
import {
    createApp,
    render,
    h,
    Text,
    Fragment,
    nextTick,
    renderList,
    // withModel,
    // resolveComponent,
} from './runtime'
import { reactive, ref, computed, effect } from './reactivity'

export const MiniVue = (window.MiniVue = {
    createApp,
    render,
    h,
    Text,
    Fragment,
    nextTick,
    reactive,
    ref,
    computed,
    effect,
    compile,
    renderList,
    // withModel,
    // resolveComponent,
})

declare global {
    interface Window {
        observed: any
        observedArr: any
        observedRef: any
        computedData: any
        MiniVue: any
    }
}
