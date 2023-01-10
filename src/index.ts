import { reactive, ref, watchEffect, computed } from './reactive'

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

declare global {
    interface Window {
        observed: any
        observedArr: any
        observedRef: any
        computedData: any
    }
}
