var fs     = require( 'fs' ),
	os     = require( 'os' ),
	path   = require( 'path' ),
	wrench = require( 'wrench' ),
	_      = require( 'underscore' )

/**
 * Creates a list of paths of descendents of basePath.
 *
 * @param basePath the base path
 * @param filter the filter used for filtering the paths
 * @param mode can be "absolute", "relative" or "include-base-path"; the default is "relative"
 * @return {*}
 */
var createPathsFromDirSync = function( basePath, filter, mode ) {
	mode = mode ? mode : 'relative'

	var walk = function( dirPath, relativeFsoPath ) {
		relativeFsoPath = relativeFsoPath || ''

		var results     = [],
			fullFsoPath = path.join( dirPath, relativeFsoPath ),
			listing     = fs.readdirSync( fullFsoPath )

		listing.forEach(
			function( x ) {
				var currentFsoPath = path.join( fullFsoPath, x ),
					stat           = fs.statSync( currentFsoPath )

				if( stat && stat.isDirectory() ) {
					results = results.concat(
						walk(
							dirPath,
							path.join( relativeFsoPath, x )
						)
					)

				} else {
					results.push( path.join( relativeFsoPath, x ) )
				}
			}
		)

		return results;
	}

	var tmp = walk( basePath )

	if( mode == 'absolute' ) {
		tmp = _.map(
			tmp,
			function( x ) {
				return path.join( basePath, x )
			}
		)

	} else if( mode == 'include-base-path' ) {
		var baseName = _.last( basePath.split( path.sep ) )

		tmp = _.map(
			tmp,
			function( x ) {
				return path.join( baseName, x )
			}
		)
	}

	return filter ?
		_.filter( tmp, filter ) :
		tmp
}

/**
 * Creates a list of file paths whose file extensions match one in the provided extensions list.
 *
 * @param basePath
 * @param extensions
 * @param mode
 * @return {*}
 */
var createFilePathsFromDirSync = function( basePath, extensions, mode ) {
	if( _.isArray( extensions ) ) {
		var filter = function( x ) {
			var extension = _.last( x.split( '.' ) )

			return _.contains( extensions, extension )
		}
	}

	return createPathsFromDirSync( basePath, filter, mode )
}

/**
 * Creates an object which grants access to os specific locations like appDataPath, homePath and tempPath.
 *
 * @return {Object}
 */
var createOsPath = function() {
	var type = os.type().toLowerCase()

	if( type.indexOf( 'darwin' ) === 0 ) {
		return {
			createAppDataPath : function( appName ) {
				return this.getHomePath() + '/Library/Application Support/' + appName
			},
			getHomePath : function() {
				return process.env.HOME
			},
			getTempPath : function() {
				return '/tmp'
			}
		}

	} else if( type.indexOf( 'lin' ) === 0 ) {
		return {
			createAppDataPath : function( appName ) {
				return this.getHomePath() + '/.config/' + appName
			},
			getHomePath : function() {
				return process.env.HOME
			},
			getTempPath : function() {
				return '/tmp'
			}
		}

	} else if( type.indexOf( 'win' ) === 0 ) {
		return {
			createAppDataPath : function( appName ) {
				var appDataPath = process.env.LOCALAPPDATA || process.env.APPDATA

				return appDataPath + '\\' + appName
			},
			getHomePath : function() {
				return process.env.USERPROFILE
			},
			getTempPath : function() {
				return process.env.TEMP
			}
		}
	}
}

var createConfigFilePathRecursive = function( currentPath, fileName ) {
	var currentConfigFilePath = path.join( currentPath, fileName )

	if( fs.existsSync( currentConfigFilePath ) ) {
		return currentConfigFilePath
	}

	var nextPath = path.resolve( currentPath, '..' )

	if( nextPath == currentPath ) {
		return
	}

	return createConfigFilePathRecursive( nextPath, fileName )
}

/**
 * Creates a path to a config file. Starts the search in initialPath and expands to search towards the file system root. If no config file can be found during
 * the traversal appName and fileName are used to look up the config file in the users home directory.
 *
 * @param initialPath
 * @param appName
 * @param fileName
 * @return {*}
 */
var createConfigFilePath = function( initialPath, appName, fileName ) {
	var environmentConfigFilePath = createConfigFilePathRecursive( initialPath, fileName )

	if( environmentConfigFilePath ) {
		return environmentConfigFilePath
	}

	var appDataPath = createOsPath().createAppDataPath( appName )

	environmentConfigFilePath = path.join( appDataPath, fileName )

	if( fs.existsSync( environmentConfigFilePath ) ) {
		return environmentConfigFilePath
	}
}

module.exports = {
	createConfigFilePath : createConfigFilePath,
	createOsPath : createOsPath,
	createPathsFromDirSync : createPathsFromDirSync,
	createFilePathsFromDirSync : createFilePathsFromDirSync
}
