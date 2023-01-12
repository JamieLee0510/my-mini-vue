import { reactive, ref, watchEffect, computed } from './reactive'
import { h, Text, Fragment, render } from './runtime'

const observe1 = (window.observed = reactive({ count1: 1, count2: 2 }))
const observeArr = (window.observedArr = reactive([1]))
const observeRef = (window.observedRef = ref(1))

const computedData = (window.computedData = computed(() => {
    console.log('computed!')
    return observeRef.value * 2
}))

watchEffect(() => {
    console.log(`current value: ${observeRef.value}`)
})

watchEffect(() => {
    console.log(`current arr length: ${observeArr.length}`)
})

watchEffect(() => {
    watchEffect(() => {
        console.log(`---watchEffect--count2:${observe1.count2}`)
    })
    console.log(`---watchEffect--count1:${observe1.count1}`)
})

const demoVNode2 = h('ui', null, [
    h('li', null, 'first'),
    h(Fragment, null, [h('li', null, 'middle')]),
    h('li', null, 'last'),
])
const demoVNode1 = h('ui', null, [
    h('li', null, 'first'),
    h(Fragment, null, []),
    h('li', null, 'last'),
])
render(demoVNode1, document.querySelector('#app')!)

setTimeout(() => {
    render(demoVNode2, document.querySelector('#app')!)
}, 2000)

declare global {
    interface Window {
        observed: any
        observedArr: any
        observedRef: any
        computedData: any
    }
}
