const pkg = require('./package.json')
const typescript = require('@rollup/plugin-typescript')
const server = require('rollup-plugin-serve')
const html = require('@rollup/plugin-html')
const path = require('path')
const fs = require('fs')
module.exports = {
    input: './src/index.ts',
    output: [
        // 1. cjs -> commonjs
        // 2. esm
        {
            format: 'cjs',
            file: pkg.main,
        },
        {
            format: 'es',
            file: pkg.module,
        },
    ],

    plugins: [
        typescript(),
        html({
            fileName: 'index.html',
            template: () => {
                const htmlFilePath = path.join(__dirname, './public/index.html')
                const html = fs.readFileSync(htmlFilePath, { encoding: 'utf8' })
                return html
            },
        }),
        process.env.NODE_ENV === 'development' ? server({ port: 6001, contentBase: 'lib' }) : null,
    ],
}
