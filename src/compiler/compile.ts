import { NodeTypes } from './ast'
import { codegen } from './codegen'
import { parse } from './parse'
import { AstNodeType, TextNode } from './type'

export function compile(template: any) {
    const ast = parse(template)
    return codegen(ast)
}
