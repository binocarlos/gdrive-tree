const fs = require('fs') 
const {google} = require('googleapis')
const async = require('async')

const googleJWT = require('./googleJWT')

const SCOPES = [
  'https://www.googleapis.com/auth/drive'
]

const getGoogleDriveClient = (opts, done) => {
  if(!opts.serviceAccountToken) return done(`no serviceAccountToken option given`)

  const jwtOpts = Object.assign({}, opts, {
    scopes: SCOPES
  })
  async.waterfall([
    (next) => googleJWT(jwtOpts, next),
    (jwtAuth, next) => {
      const drive = google.drive({
        version: 'v3',
        auth: jwtAuth
      })
      next(null, drive)
    }
  ], done)
}

module.exports = getGoogleDriveClient