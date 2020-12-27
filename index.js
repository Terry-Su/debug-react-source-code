const fs = require('fs-extra')
const path = require(`path`)
const trash = require(`trash`)
const { spawn, exec } = require('child_process')
const {IDENTITY_START_STR, IDENTITY_END_STR, ANNOTATION_PREFIX} = require('./shared.js')

const PATH_PLUGIN = path.resolve(__dirname, 'rollup-plugin-add-path-info-annoation-for-each-file.js').replace(/\\/g, '/')
const PATH_DEPENDENCIES = path.resolve(__dirname, 'dependencies').replace(/\\/g, '/')
const PATH_BUILD = path.resolve(__dirname, 'build').replace(/\\/g, '/')


const PATH_REACT_CONTAINER = path.resolve(__dirname, 'PLACE-REACT-SOURCE-CODE-HERE').replace(/\\/g, '/')
const dirs = fs.readdirSync(PATH_REACT_CONTAINER).filter(v => fs.lstatSync( path.resolve(PATH_REACT_CONTAINER, v).replace(/\\/g, '/') ).isDirectory())
if (dirs.length === 0) { throw new Error('No React Source Code Directory Found!') }
const PATH_REACT = path.resolve(PATH_REACT_CONTAINER, dirs[0]).replace(/\\/g, '/')
const PATH_BUILD_REACT = path.resolve(PATH_BUILD, path.basename(PATH_REACT).replace(/\.js/, '')).replace(/\\/g, '/')


const PATH_REACT_NODE_MODULES = path.resolve(PATH_REACT, 'node_modules').replace(/\\/g, '/')
const PATH_REACT_ROLLUP_BUILD_JS = path.resolve(PATH_REACT, 'scripts/rollup/build.js').replace(/\\/g, '/')
const PATH_NEW_REACT_ROLLUP_BUILD_JS = path.resolve(PATH_REACT, 'scripts/rollup/build.for-debug-react-code.js').replace(/\\/g, '/')
const TMP = 'scripts/rollup/build.for-debug-react-code.js'
const RELATIVE_PATH_NEW_REACT_ROLLUP_BUILD_JS_TO_PLUGIN = path.relative(path.resolve(PATH_REACT, 'scripts/rollup' ), PATH_PLUGIN).replace(/\\/g, '/')
const RELATIVE_PATH_REACT_TO__NEW_REACT_ROLLUP_BUILD_JS = path.relative(PATH_REACT, PATH_NEW_REACT_ROLLUP_BUILD_JS).replace(/\\/g, '/')
const RELATIVE_PATH_ROLLUP_BUILD_JS_TO_REACT = path.relative(PATH_REACT_ROLLUP_BUILD_JS, PATH_REACT).replace(/\\/g, '/')

const NAME_PLUGIN = `$$addPathInfoAnnotationForEachFilePlugin`

const NAME_DEPENDENCY_REACT = 'dependency-react.html'
const NAME_DEPENDENCY_REACT_DOM = 'dependency-react-dom.html'
const NAME_DEPENDENCY_DEFAULT_JS = `index.js`

const PATH_DEPENDENCY_SOURCE_BABEL = path.resolve(PATH_DEPENDENCIES, 'source-babel.js').replace(/\\/g, '/')
const PATH_DEPENDENCY_SOURCE_DEPENDENCY_MAIN = path.resolve(PATH_DEPENDENCIES, 'source-dependency-main.html').replace(/\\/g, '/')
const PATH_DEPENDENCY_SOURCE_DEFAULT_JS = path.resolve(PATH_DEPENDENCIES, 'source-index.js').replace(/\\/g, '/')
const PATH_DEPENDENCY_SOURCE_DEFAULT = path.resolve(PATH_DEPENDENCIES, 'source-index.html').replace(/\\/g, '/')

// # generate a new build js
function generateNewBuildJS() {
    const buildJsStr = fs.readFileSync(PATH_REACT_ROLLUP_BUILD_JS, {encoding: 'utf8'})
    const lines = buildJsStr.split('\n')
    const newFistLine = `const ${NAME_PLUGIN} = require('${RELATIVE_PATH_NEW_REACT_ROLLUP_BUILD_JS_TO_PLUGIN}');\n`
    newBuildJsStr = newFistLine + lines.map(line => {
        if (line.match(/rollup\(/)) {
            return `rollupConfig.plugins.push(${NAME_PLUGIN}('${PATH_REACT}'));
    ${line}`
        }
        return line
    }).join('\n')
    fs.writeFileSync(PATH_NEW_REACT_ROLLUP_BUILD_JS, newBuildJsStr, {encoding: 'utf-8'})
    console.log(`$$ DEBUG REACT SOURCE CODE: generated a new build js!`)    
}

function installDependencies(cb) {
    const ls = spawn(`yarn.cmd`, [`install`], {cwd: PATH_REACT})
    ls.stdout.on('data', data => console.log(data.toString()))
    ls.stdout.on('close', cb)
}

function build(cb) {
    const ls = spawn('node', [TMP, `react/index,react-dom/index`, `--type`, `UMD_DEV`], {cwd: PATH_REACT})
    // const ls = spawn('node', [TMP], {cwd: PATH_REACT})
    ls.stdout.on('data', data => console.log(data.toString()))
    ls.stderr.on('data', data => console.log(data.toString()))
    ls.on('close', () => {
        console.log(`$$ DEBUG REACT SOURCE CODE: generated react.development.js and react-dom.development.js!`)
        cb && cb()
    })
}

function getReactOrReactDOMNamespace(reactOrReactDOMDevelopmentFile) {
    const isReactFile = path.parse(reactOrReactDOMDevelopmentFile).name.replace(/\..*/, '') === 'react'
    return isReactFile ? 'React' : 'ReactDOM'
}

/**
 * 
 * @param {*} reactOrReactDOMDevelopmentFile 
 * @return {{outputFile, text}[]}
 */
function getReactOrReactDOMSplitFilesData(reactOrReactDOMDevelopmentFile) {
    const getFileOnEndLine = (line) => {
        const isSpecialFormat = /commonjs-proxy-/.test( line )

        if ( isSpecialFormat ) {
          let tmpPath = line.replace( /.*commonjs-proxy-/, '' )
          tmpPath = path.relative( PATH_REACT, tmpPath ).replace(/\\/g,'/')
          
          return `commonjs-proxy-/${ tmpPath }`
          // return path
        }
        return line.replace( new RegExp(`.*${ANNOTATION_PREFIX.replace('/', '\\/')}${IDENTITY_END_STR.replace(/\$/g, '\\$')} `), '' )
    }
    const isStartLine = line => new RegExp( `${IDENTITY_START_STR.replace(/\$/g, '\\$')}` ).test( line )
    const isEndLine = line => new RegExp( `${IDENTITY_END_STR.replace(/\$/g, '\\$')}` ).test( line )

    const namespace = getReactOrReactDOMNamespace(reactOrReactDOMDevelopmentFile)

    const sourceText = fs.readFileSync(reactOrReactDOMDevelopmentFile, {encoding: 'utf8'})
    const lines = sourceText.split( '\n' )
    /** @type {{outputFile, text}[]} */
    const data = []
    let hasStarted = false
    // resolve the content between **end** and **start**
    let isBetweenEndAndStart = false
    /** @type {string[]} */
    let curry = []
    let lineIndex = -1
    for (let line of lines) {
        lineIndex++

        if (isStartLine(line)) {
            hasStarted = true
        }
        if (hasStarted) {
            if (isStartLine(line) || lineIndex === lines.length - 2) {
                if (isBetweenEndAndStart && curry.length > 0 && !(curry.every(line => line.trim() === ''))) {
                    const outputFile = `$$umd/line-number-${lineIndex}.js`
                    let text = curry.join('\n')
                    text = text.replace(/exports/g, namespace)
                    data.push({outputFile, text})
                }
                isBetweenEndAndStart = false
                curry = []
            }
            if (!isStartLine(line) && !isEndLine(line)) {curry.push(line)}
            if (isEndLine(line)) {
                let text = curry.join('\n')
                text = text.replace(/exports/g, namespace)
                const outputFile = getFileOnEndLine(line)
                data.push({outputFile, text})
                curry = []
                isBetweenEndAndStart = true
            }
        }
    }
    return data
}

/**
 * 
 * @param {{outputFile, text}[]} filesData 
 * @param {string} reactOrReactDOMDevelopmentFile 
 */
function generateReactOrReactDOMSplitFiles(filesData, reactOrReactDOMDevelopmentFile) {
    for (let {outputFile, text} of filesData) {
        const folderName = path.parse(reactOrReactDOMDevelopmentFile).name
        const targetPath = path.resolve(PATH_BUILD_REACT, `${folderName}/${outputFile}`)
        const folerPath = path.dirname(targetPath)
        !fs.existsSync(folerPath) && fs.mkdirSync(folerPath, {recursive: true})
        fs.writeFileSync(targetPath, text, {encoding: 'utf-8'})
    }
}

function copyDependencies() {
    const dependencyPaths = [
        PATH_DEPENDENCY_SOURCE_BABEL,
        PATH_DEPENDENCY_SOURCE_DEPENDENCY_MAIN,
        PATH_DEPENDENCY_SOURCE_DEFAULT_JS,
        PATH_DEPENDENCY_SOURCE_DEFAULT,
    ]
    for (let file of dependencyPaths) {
        const filename = path.parse(file).base.replace(/^source-/, '')
        const targetPath = path.resolve(PATH_BUILD_REACT, filename)
        fs.copyFileSync(file, targetPath)
    }
}


function generateDependencyReactDOMHTML(reactDOMFilesData, reactDOMFile) {
    const namespace = getReactOrReactDOMNamespace(reactDOMFile)
    const dependencyFolerName = path.parse(reactDOMFile).name
    const mainText = reactDOMFilesData.map(v => `<script src="./${dependencyFolerName}/${v.outputFile}"></script>`).join('\n')
    const text = `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Dependency ${namespace}</title>
        <script>var React = window.parent.React;</script>
        <script>var ${namespace} = {};</script>
        ${mainText}
    </head>
    <body>
    </body>
    </html>`
    const targetPath = path.resolve(PATH_BUILD_REACT, NAME_DEPENDENCY_REACT_DOM)
    fs.writeFileSync(targetPath, text, {encoding: 'utf-8'})
}

function generateDependencyReactHTML(reactFilesData, reactFile) {
    const namespace = getReactOrReactDOMNamespace(reactFile)
    const dependencyFolerName = path.parse(reactFile).name
    const mainText = reactFilesData.map(v => `<script src="./${dependencyFolerName}/${v.outputFile}"></script>`).join('\n')
    const text = `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Dependency ${namespace}</title>
        <script>var ${namespace} = {};</script>
        ${mainText}
    </head>
    <body>
        <iframe id="react-dom" src="./${NAME_DEPENDENCY_REACT_DOM}" frameborder="0"></iframe>
        <script>
            const domReactDOM = document.querySelector('#react-dom')
            domReactDOM.contentWindow.onload = () => {
                window.parent.run(React, domReactDOM.contentWindow.ReactDOM)
            }
        </script>
    </body>
    </html>`
    const targetPath = path.resolve(PATH_BUILD_REACT, NAME_DEPENDENCY_REACT)
    fs.ensureFileSync(targetPath)
    fs.writeFileSync(targetPath, text, {encoding: 'utf-8'})
}

async function takeOnReactReactDOMFiles() {
    await trash(PATH_BUILD_REACT)
    const PATH_REACT_DEVELOPMENT = path.resolve(PATH_REACT, `build/node_modules/react/umd/react.development.js`)
    const PATH_REACT_DOM_DEVELOPMENT = path.resolve(PATH_REACT, `build/node_modules/react-dom/umd/react-dom.development.js`)
    
    const reactFilesData = getReactOrReactDOMSplitFilesData(PATH_REACT_DEVELOPMENT)
    generateReactOrReactDOMSplitFiles(reactFilesData, PATH_REACT_DEVELOPMENT)
    generateDependencyReactHTML(reactFilesData, PATH_REACT_DEVELOPMENT)
    
    const reactDOMFilesData = getReactOrReactDOMSplitFilesData(PATH_REACT_DOM_DEVELOPMENT)
    generateReactOrReactDOMSplitFiles(reactDOMFilesData, PATH_REACT_DOM_DEVELOPMENT)
    generateDependencyReactDOMHTML(reactDOMFilesData, PATH_REACT_DOM_DEVELOPMENT)

    copyDependencies() 
    console.log(`$$ DEBUG REACT SOURCE CODE: built ${path.parse(PATH_BUILD_REACT).name} to ${PATH_BUILD_REACT}!`)
}


generateNewBuildJS();installDependencies( () => build( takeOnReactReactDOMFiles ))
// build(takeOnReactReactDOMFiles)
// takeOnReactReactDOMFiles()


module.exports.getReactOrReactDOMSplitFilesData = getReactOrReactDOMSplitFilesData
module.exports.generateReactOrReactDOMSplitFiles = generateReactOrReactDOMSplitFiles
module.exports.copyDependencies = copyDependencies
module.exports.generateDependencyReactDOMHTML = generateDependencyReactDOMHTML
module.exports.generateDependencyReactHTML = generateDependencyReactHTML
module.exports.PATH_REACT = PATH_REACT
