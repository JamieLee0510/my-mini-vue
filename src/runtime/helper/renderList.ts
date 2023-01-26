// import { ElementNode } from '../../compiler/type'
// import { isArray, isNumber, isObject, isString } from '../../utils'

// function renderList(source: any, renderItem: (value: any, key: any, index: number) => ElementNode| (value: any,  index: number) => ElementNode) {
//     // item in items
//     // item(value, key,index) in object
//     // item in 10
//     // item in 'abcde'
//     const nodes: ElementNode[] = []
//     if (isArray(source) || isString(source)) {
//         for (let i = 0; i < source.length; i++) {
//             nodes.push(renderItem(source[i], i))
//         }
//     } else if (isObject(source)) {
//         const keys = Object.keys(source)
//         keys.forEach((key,index)=>{
//             nodes.push(renderItem(source[key] ,key,index))
//         })
//     } else if (isNumber(source)) {
//         for (let i = 0; i < source; i++) {
//             nodes.push(renderItem(i + 1, i))
//         }
//     }
// }

// export default renderList

// import { ElementNode, VNodeChild } from '../vnode'
import { ElementNode } from '../../compiler/type'
import { isArray, isString, isObject, isNumber } from '../../utils'
// import { warn } from '../warning'

/**
 * v-for string
 * @private
 */
export function renderList(
    source: string,
    renderItem: (value: string, index: number) => ElementNode,
): ElementNode[]

/**
 * v-for number
 */
export function renderList(
    source: number,
    renderItem: (value: number, index: number) => ElementNode,
): ElementNode[]

/**
 * v-for array
 */
export function renderList<T>(
    source: T[],
    renderItem: (value: T, index: number) => ElementNode,
): ElementNode[]

/**
 * v-for iterable
 */
export function renderList<T>(
    source: Iterable<T>,
    renderItem: (value: T, index: number) => ElementNode,
): ElementNode[]

/**
 * v-for object
 */
export function renderList<T>(
    source: T,
    renderItem: <K extends keyof T>(value: T[K], key: K, index: number) => ElementNode,
): ElementNode[]

/**
 * Actual implementation
 */
export function renderList(
    source: any,
    renderItem: (...args: any[]) => ElementNode,
): ElementNode[] {
    const nodes: ElementNode[] = []
    if (isArray(source) || isString(source)) {
        for (let i = 0; i < source.length; i++) {
            nodes.push(renderItem(source[i], i))
        }
    } else if (isObject(source)) {
        const keys = Object.keys(source)
        keys.forEach((key, index) => {
            nodes.push(renderItem(source[key], key, index))
        })
    } else if (isNumber(source)) {
        for (let i = 0; i < source; i++) {
            nodes.push(renderItem(i + 1, i))
        }
    }
    return nodes
}
