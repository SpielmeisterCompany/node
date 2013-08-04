var loadModule = require( 'amdhelper_loadModule' ),
	fs         = require( 'fs' ),
	wrench     = require( 'wrench' ),
	path       = require( 'path' ),
	pathUtil   = require( 'pathUtil' ),
	_          = require( 'underscore' )

module.exports = function( basePath ) {
	var jsFilePaths = pathUtil.createFilePathsFromDirSync( basePath, [ 'js' ], 'absolute' )

	return _.reduce(
		jsFilePaths,
		function( memo, filePath ) {
			var module = loadModule( filePath )

			if( module ) {
				memo[ module.name ] = _.pick( module, [ 'dependencies', 'source', 'path' ] )
			}

			return memo
		},
		{}
	)
}
