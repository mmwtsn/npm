'use strict'

var resolve = require('path').resolve

var readPackageJson = require('read-package-json')
var mapToRegistry = require('./utils/map-to-registry.js')
var npm = require('./npm.js')

var whoami = require('./whoami')

module.exports = access

access.usage =
  'npm access public [<package>]' +
  '\nnpm access restricted [<package>]' +
  '\nnpm access grant <read-only|read-write> <scope:team> [<package>]' +
  '\nnpm access revoke <scope:team> [<package>]' +
  '\nnpm access ls-packages [<user>|<scope:team>]' +
  '\nnpm access ls-collaborators [<package> [<user>]]' +
  '\nnpm access edit [<package>]'

access.subcommands = ['public', 'restricted', 'grant', 'revoke',
                      'ls-packages', 'ls-collaborators', 'edit']

access.completion = function (opts, cb) {
  var argv = opts.conf.argv.remain
  if (argv.length === 2) {
    return cb(null, access.subcommands)
  }

  switch (argv[2]) {
    case 'add':
      if (argv.length === 3) {
        return cb(null, ['read-only', 'read-write'])
      } else {
        return cb(new Error('unimplemented: entities and packages'))
      }
    case 'public':
    case 'restricted':
    case 'ls-packages':
    case 'ls-collaborators':
    case 'edit':
      return cb(new Error('unimplemented: packages you can change'))
    case 'rm':
      return cb(new Error('unimplemented: entities and packages'))
    default:
      return cb(new Error(argv[2] + ' not recognized'))
  }
}

function access (args, cb) {
  var cmd = args.shift()
  var params
  return parseParams(cmd, args, function (err, p) {
    if (err) { return cb(err) }
    params = p
    return mapToRegistry(params.package, npm.config, invokeCmd)
  })

  function invokeCmd (err, uri, auth, base) {
    if (err) { return cb(err) }
    params.auth = auth
    try {
      return npm.registry.access(cmd, uri, params, function (err, data) {
        !err && data && console.log(JSON.stringify(data))
        cb(err, data)
      })
    } catch (e) {
      cb(e.message + '\n\nUsage:\n' + access.usage)
    }
  }
}

function parseParams (cmd, args, cb) {
  var params = {}
  if (cmd === 'grant') {
    params.permissions = args.shift()
  }
  if (['grant', 'revoke', 'ls-packages'].indexOf(cmd) !== -1) {
    var entity = (args.shift() || '').split(':')
    params.scope = entity[0]
    params.team = entity[1]
  }
  getPackage(args.shift(), function (err, pkg) {
    if (err) { return cb(err) }
    params.package = pkg

    if (!params.scope && cmd === 'ls-packages') {
      whoami([], true, function (err, scope) {
        params.scope = scope
        cb(err, params)
      })
    } else {
      if (cmd === 'ls-collaborators') {
        params.user = args.shift()
      }
      cb(null, params)
    }
  })
}

function getPackage (name, cb) {
  if (name && name.trim()) {
    cb(null, name.trim())
  } else {
    readPackageJson(
      resolve(npm.prefix, 'package.json'),
      function (err, data) { cb(err, data.name) })
  }
}
