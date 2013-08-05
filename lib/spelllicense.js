var _      = require( 'underscore'),
	crypto = require( 'crypto' )


var	FORMAT_VERSION          = '01',
	FORMAT_VERSION_OFFSET   = 0,
	FORMAT_VERSION_LENGTH   = 2,
	SIGNATURE_LENGTH_OFFSET = 0,
	SIGNATURE_LENGTH_LENGTH = 4,
	SIGNATURE_OFFSET        = SIGNATURE_LENGTH_OFFSET + SIGNATURE_LENGTH_LENGTH,
	MAX_LINE_LENGTH         = 64

/**
 * Creates a string representation of the numer of supplied length.
 *
 * @param number
 * @param length
 * @return {String}
 */
var createPaddedNumber = function( number, length ) {
	var result = '' + number

	while( result.length < length ) {
		result = '0' + result
	}

	return result
}

/**
 * Adds license header and footer.
 *
 * @param rawLicense
 * @param licensee
 */
var wrap = function( rawLicense, licensee ) {
	// add header and footer and break license into lines of MAX_LINE_LENGTH length
	var numLines = Math.ceil( rawLicense.length / MAX_LINE_LENGTH ),
		lines    = [ '---BEGIN LICENSE KEY---' ]

	if( licensee ) {
		lines.push( [ '---This personal license is issued to ' + licensee + '.---' ] )
	}

	for( var i = 0, from, until, n = numLines; i < n; i++ ) {
		from  = i * MAX_LINE_LENGTH
		until = i + 1 < n ? from + MAX_LINE_LENGTH : undefined

		lines.push( rawLicense.slice( from, until ) )
	}

	lines.push( '---END LICENSE KEY---' )

	return lines.join( '\n' )
}

/**
 * Removes license header and footer.
 *
 * @param license
 */
var unwrap = function( license ) {
	var lines = _.filter(
		license.split( '\n' ),
		function( line ) {
			return line.length >= 2 &&
				line.substr( 0, 2 ) != '--'
		}
	)

	var rawLicense = ''

	if( lines.length == 0 ) {
		return
	}

	for( var i = 0, n = lines.length; i < n; i++ ) {
		rawLicense += lines[ i ]
	}

	return rawLicense
}

var serialize = function( privateKey, version, payload, licensee ) {
	var payloadSerialized = JSON.stringify( payload )

	var signature = crypto.createSign( 'DSS1' )
		.update( payloadSerialized )
		.sign( privateKey, 'hex' )

	var buffer = new Buffer( createPaddedNumber( signature.length, SIGNATURE_LENGTH_LENGTH ) + signature + payloadSerialized )

	return wrap( version + buffer.toString( 'base64' ), licensee )
}

var parse = function( license ) {
	var rawLicense = unwrap( license )

	if( !rawLicense ) {
		return
	}

	try {
		var version           = rawLicense.slice( FORMAT_VERSION_OFFSET, FORMAT_VERSION_LENGTH ),
			contentBase64     = rawLicense.slice( FORMAT_VERSION_LENGTH ),
			content           = new Buffer( contentBase64, 'base64' ).toString(),
			signatureLength   = parseInt( content.slice( SIGNATURE_LENGTH_OFFSET, SIGNATURE_LENGTH_LENGTH ), 10 ),
			signature         = content.slice( SIGNATURE_OFFSET, SIGNATURE_OFFSET + signatureLength ),
			payloadSerialized = content.slice( SIGNATURE_OFFSET + signatureLength )

	} catch( e ) {
		return
	}

	return {
		signature : signature,
		payloadSerialized : payloadSerialized
	}
}

/**
 * Creates a license data string.
 *
 * @param privateKey
 * @param payload {Object}
 * @param licensee
 * @return {String}
 */
var create = function( privateKey, payload, licensee ) {
	if( !privateKey ) {
		throw 'Error: "privateKey" is undefined.'
	}

	if( !payload ) {
		throw 'Error: "payload" is undefined.'
	}

	if( !_.isObject( payload ) ) {
		throw 'Error: "payload" must be of type "object".'
	}

	return serialize( privateKey, FORMAT_VERSION, payload, licensee )
}

/**
 * Verifies that the license data string was signed with the supplied key.
 *
 * @param publicKey
 * @param licenseData
 * @return {*}
 */
var verify = function( publicKey, licenseData ) {
	if( !publicKey ) {
		throw 'Error: "publicKey" is undefined.'
	}

	var license = parse( licenseData )

	if( !license ) {
		return
	}

	try {
		var isValid = crypto.createVerify( 'DSS1' )
			.update( license.payloadSerialized )
			.verify( publicKey, license.signature, 'hex' )

	} catch( e ) {
		return false
	}

	return isValid
}

/**
 * Returns the payload contained in a license data string.
 *
 * @param licenseData
 * @return {*}
 */
var createPayload = function( licenseData ) {
	var license = parse( licenseData )

	if( !license ) {
		return
	}

	try {
		var payload = JSON.parse( license.payloadSerialized )

	} catch( e ) {
		return
	}

	return payload
}

/**
 * Creates a license info object.
 *
 * @param publicKey
 * @param licenseData
 * @param referenceDateTimestamp this timestamp is used to check if the license is in its validity period
 * @return {Object}
 */
var createLicenseInfo = function( publicKey, licenseData, referenceDateTimestamp ) {
	// signature
	var isSignatureValid = verify( publicKey, licenseData )

	if( !isSignatureValid ) {
		return {
			error : 'Error: License signature is invalid.'
		}
	}

	// payload
	var payload = createPayload( licenseData )

	if( !payload ) {
		return {
			error : 'Error: Could not create payload from license data.'
		}
	}

	var referenceDate = referenceDateTimestamp ?
		new Date( referenceDateTimestamp ) :
		new Date()

	// validity period
	var issueDateInUnixtime      = Math.ceil( new Date( payload.isd ).getTime() / 1000 ),
		referenceDateInUnixtime  = Math.ceil( new Date( referenceDate ).getTime() / 1000 ),
		validityPeriodInUnixtime = payload.days * 24 * 60 * 60,
		isInValidityPeriod       = referenceDateInUnixtime < issueDateInUnixtime + validityPeriodInUnixtime

	return {
		payload : payload,
		isInValidityPeriod : isInValidityPeriod,
		isSignatureValid : isSignatureValid,
		isValid : isSignatureValid && isInValidityPeriod
	}
}

module.exports = {
	create : create,
	createLicenseInfo : createLicenseInfo,
	createPayload : createPayload,
	verify : verify
}
