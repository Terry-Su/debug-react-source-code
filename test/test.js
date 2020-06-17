const path = require('path')
const {
    getReactOrReactDOMSplitFilesData,
    generateReactOrReactDOMSplitFiles,
    copyDependencies ,
    generateDependencyReactDOMHTML,
    generateDependencyReactHTML,
    generateMainHTML,
    PATH_REACT
} = require('../index')
const PATH_REACT_DEVELOPMENT = path.resolve(PATH_REACT, `build/node_modules/react/umd/react.development.js`)
const PATH_REACT_DOM_DEVELOPMENT = path.resolve(PATH_REACT, `build/node_modules/react-dom/umd/react-dom.development.js`)

const reactFilesData = getReactOrReactDOMSplitFilesData(PATH_REACT_DEVELOPMENT)
generateReactOrReactDOMSplitFiles(reactFilesData, PATH_REACT_DEVELOPMENT)
generateDependencyReactHTML(reactFilesData, PATH_REACT_DEVELOPMENT)

const reactDOMFilesData = getReactOrReactDOMSplitFilesData(PATH_REACT_DOM_DEVELOPMENT)
generateReactOrReactDOMSplitFiles(reactDOMFilesData, PATH_REACT_DOM_DEVELOPMENT)
generateDependencyReactDOMHTML(reactDOMFilesData, PATH_REACT_DOM_DEVELOPMENT)


copyDependencies()
