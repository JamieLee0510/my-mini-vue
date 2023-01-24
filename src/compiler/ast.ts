export enum NodeTypes {
    ROOT, // 根節點
    ELEMENT, // 元素節點，有原生HTML和vue component之分（ElementTypes）
    TEXT, // 純文本節點
    SIMPLE_EXPRESSION, // js表達式
    INTERPOLATION, // 插值節點，like：{count}
    ATTRIBUTE, // 屬性 key-value
    DIRECTIVE, // 指令節點，like v-if
    NULL,
}

export enum ElementTypes {
    ELEMENT,
    COMPONENT,
}

export function createRoot(children) {
    return {
        type: NodeTypes.ROOT,
        children,
    }
}
