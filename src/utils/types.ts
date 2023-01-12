export const data = ''

export type LazyOption = {
    lazy?: boolean
    scheduler?: () => void
}

export enum ShapeFlags {
    ELEMENT = 1, // 00000001
    TEXT = 1 << 1, // 00000010
    FRAGMENT = 1 << 2, // 00000100
    COMPONENT = 1 << 3, // 00001000
    TEXT_CHILDREN = 1 << 4, // 00010000
    ARRAY_CHILDREN = 1 << 5, // 00100000
    CHILDREN = (1 << 4) | (1 << 5), //00110000
}

export type VNode = {
    type: string | Object | Text | Symbol
    props: Object | null
    children: string | number | Array<any> | null | Node
    shapeFlags: ShapeFlags
    el?: HTMLElement | Text // 用來unmount
    anchor?: Text // 為了Fragment屬性
}

export type Anchor = Text | null

export type VueHTMLElement = {
    _vnode?: VNode | null
} & HTMLElement
