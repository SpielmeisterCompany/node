var _  = require( 'underscore' ),
	uglify = require( 'uglifyjs' ),
	uglifyProcessor = uglify.uglify,
	w = uglifyProcessor.ast_walker()


var isAmdHeader = function( node ) {
	var type = node[ 0 ]

	if( type !== 'stat' ) return false

	var value = node[ 1 ],
		action = value[ 0 ]

	if( action !== 'call' ) return false

	var op = value[ 1 ]

	if( op[ 0 ] !== 'name' || op[ 1 ] !== 'define' ) return false

	var args = value[ 2 ]

	if( args[ 0 ][ 0 ] !== 'string' ) return false

	if( args.length === 2 ) {
		if( args[ 1 ][ 0 ] !== 'function' ) return false

	} else if( args.length === 3 ) {
		if( args[ 1 ][ 0 ] !== 'array' || args[ 2 ][ 0 ] !== 'function' ) return false

	} else {
		return false
	}

	return true
}

var hasModuleDependencies = function( args ) {
	return args[ 1 ][ 0 ] === 'array'
}

module.exports = function( moduleSource ) {
	var ast = uglify.parser.parse( moduleSource ),
		moduleId,
		moduleDependencies

	w.with_walkers(
		{
			stat : function() {
				var node = this

				if( !isAmdHeader( node ) ) return

				var args = node[ 1 ][ 2 ]

				moduleId = args[ 0 ][ 1 ]

				if( hasModuleDependencies( args ) ) {
					moduleDependencies = _.map(
						args[ 1 ][ 1 ],
						function( dependency ) {
							return dependency[ 1 ]
						}
					)
				}

				return node
			}
		},
		function() {
			return w.walk( ast )
		}
	)

	if( !moduleId ) {
		return false
	}

	return {
		name : moduleId,
		dependencies : moduleDependencies || []
	}
}
