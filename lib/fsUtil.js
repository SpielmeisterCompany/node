var fs     = require( 'fs' ),
	os     = require( 'os' ),
	path   = require( 'path' ),
	wrench = require( 'wrench' ),
	_      = require( 'underscore' )

var copyFile = function( inputFilePath, outputFilePath ) {
	fs.writeFileSync(
		outputFilePath,
		fs.readFileSync( inputFilePath )
	)
}

/**
 * Copies the specified files in filePaths to targetDirectoryPath - relative to the sourceDirectoryPath
 *
 * @param sourceDirectoryPath
 * @param targetDirectoryPath
 * @param filePaths
 */
var copyFiles = function( sourceDirectoryPath, targetDirectoryPath, filePaths ) {
	_.each(
        _.flatten( filePaths ),
		function( filePathInfo ) {
			// indicates if the path and or name of the file changes from source to target location
			var isMoved = _.isArray( filePathInfo ) && filePathInfo.length === 2

			var sourceFilePath = isMoved ?
				filePathInfo[ 0 ] :
				path.resolve( sourceDirectoryPath,  filePathInfo )

			if( isDirectory( sourceFilePath ) ) return

			var targetFilePath = isMoved ?
				filePathInfo[ 1 ] :
				path.resolve( targetDirectoryPath,  filePathInfo )

			var targetPath = path.dirname( targetFilePath )

			if( !fs.existsSync( targetPath ) ) {
				wrench.mkdirSyncRecursive( targetPath )
			}

			copyFile( sourceFilePath, targetFilePath )
		}
	)
}

var isDirectory = function( directoryPath ) {
	if( fs.existsSync( directoryPath ) ) {
		var stat = fs.lstatSync( directoryPath )

		if( stat.isDirectory() ) {
			return true
		}
	}

	return false
}

var isFile = function( filePath ) {
	if( fs.existsSync( filePath ) ) {
		var stat = fs.lstatSync( filePath )

		if( stat.isFile() ) {
			return true
		}
	}

	return false
}

module.exports = {
	copyFiles : copyFiles,
	copyFile : copyFile,
	isDirectory : isDirectory,
	isFile : isFile
}
