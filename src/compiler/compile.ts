import { codegen } from './codegen'
import { parse } from './parse'

export function compile(template: any) {
    const ast = parse(template)
    return codegen(ast)
}
