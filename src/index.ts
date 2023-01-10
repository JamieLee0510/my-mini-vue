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

const demoVNode = h(
    'div',
    {
        class: 'hello vnode',
        style: {
            border: '1px solid',
        },
        onClick: () => {
            console.log('click on vnode')
        },
        id: 'foo',
        checked: '',
        custom: false,
    },
    [
        h('ul', null, [
            h('li', { style: { color: 'red' } }, [h(Text, null, '1')]),
            h('li', null, '2'),
            h('li', { style: { color: 'blue' } }, '3'),
            h(Fragment, null, [h('li', null, '4'), h('li', null, 5)]),
            h('li', null, [h(Text, null, 'hello world')]),
        ]),

        ,
    ],
)

render(demoVNode, document.querySelector('#app')!)

declare global {
    interface Window {
        observed: any
        observedArr: any
        observedRef: any
        computedData: any
    }
}
