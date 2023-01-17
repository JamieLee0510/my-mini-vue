import { isArray, isNumber, isObject, isString } from '../utils'
import { ShapeFlags, VNode, VNodeObject } from '../utils/types'

export const Text = Symbol('text')
export const Fragment = Symbol('Fragment')

/**
 *
 * @param type
 * @param props
 * @param children
 * @returns VNode
 */
export function h(
    type: string | VNodeObject | typeof Text | typeof Fragment,
    props?: Object | null,
    children?: string | number | Array<any> | null,
): VNode {
    let shapeFlags

    if (isString(type)) {
        shapeFlags = ShapeFlags.ELEMENT
    } else if (type == Text) {
        shapeFlags = ShapeFlags.TEXT
    } else if (type == Fragment) {
        shapeFlags = ShapeFlags.FRAGMENT
    } else {
        shapeFlags = ShapeFlags.COMPONENT
    }

    if (isString(children) || isNumber(children)) {
        shapeFlags |= ShapeFlags.TEXT_CHILDREN
        children = children!.toString()
    } else if (isArray(children)) {
        shapeFlags |= ShapeFlags.ARRAY_CHILDREN
    }

    return {
        type,
        props: props!,
        children: children!,
        shapeFlags,
        key: props && props['key'],
    }
}

export function normalizeVNode(result: any) {
    if (isArray(result)) {
        return h(Fragment, null, result)
    }
    if (isObject(result)) {
        // 已經為VNode
        return result
    }
    return h(Text, null, result.toString())
}
