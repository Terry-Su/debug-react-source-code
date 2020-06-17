const path = require('path')
const {IDENTITY_START_STR, IDENTITY_END_STR, ANNOTATION_PREFIX} = require('./shared.js')

module.exports = function addPathInfoAnnotationForEachFile (root) {
  return {
    name: 'add path info annotation for each file', // this name will show up in warnings and errors
    transform(source, id) {
      let name =  root == null ? path.basename( id ) : path.relative( root, id )
      name = name.replace(/\\/g, '/')

      // deal with special situation
      const REGEXP = /commonjs\-proxy\:/
      const isCommonJsProxyPath = path => REGEXP.test( path )
      if ( isCommonJsProxyPath( id ) ) {
        id = id.replace( REGEXP, '/' )
        name = id.replace( `${root}`, '' )
      }
      return `${ANNOTATION_PREFIX}${IDENTITY_START_STR} ${ name }
${source}
${ANNOTATION_PREFIX}${IDENTITY_END_STR} ${ name }`
    }
  }
}
