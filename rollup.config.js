const pkg = require('./package.json')
const typescript = require('@rollup/plugin-typescript')
const server = require('rollup-plugin-serve')
const html = require('@rollup/plugin-html')
const path = require('path')
const fs = require('fs')
const sourcemaps = require('rollup-plugin-sourcemaps')

const fullPath = path.join(__dirname, './examples')

// 复制目录
function selfCopyFiles(from, to) {
    fs.cp(from, to, { recursive: true }, (err) => {
        if (err) {
            console.error(err)
        }
    })
}

function copyFiles(from, to, overwrite = false) {
    return {
        name: 'copy-files',
        generateBundle() {
            const log = (msg) => console.log('\x1b[36m%s\x1b[0m', msg)
            log(`copy files: ${from} → ${to}`)
            fs.readdirSync(from).forEach((file) => {
                const fromFile = `${from}/${file}`
                const toFile = `${to}/${file}`
                if (fs.existsSync(toFile) && !overwrite) return
                log(`• ${fromFile} → ${toFile}`)
                fs.copyFileSync(path.resolve(fromFile), path.resolve(toFile))
            })
        },
    }
}

module.exports = {
    input: './src/index.ts',
    output: [
        // 1. cjs -> commonjs
        // 2. esm
        {
            // sourcemap: true,
            format: 'cjs',
            file: pkg.main,
        },
        {
            // sourcemap: true,
            format: 'es',
            file: pkg.module,
        },
    ],

    plugins: [
        typescript(),
        selfCopyFiles(path.join(__dirname, './examples'), path.join(__dirname, './lib')),
        // sourcemaps(),
        html({
            fileName: 'index.html',
            // template: () => {
            //     // const htmlFilePath = path.join(__dirname, './public/index.html')
            //     const htmlFilePath = path.join(__dirname, './examples/index.html')
            //     const html = fs.readFileSync(htmlFilePath, { encoding: 'utf8' })
            //     return html
            // },
        }),

        process.env.NODE_ENV === 'development' ? server({ port: 6001, contentBase: 'lib' }) : null,
    ],
}
