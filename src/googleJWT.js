const fs = require('fs') 
const googleapis = require('googleapis')

const getGoogleJWTClient = (opts, done) => {
  if(!opts.serviceAccountToken) return done(`no serviceAccountToken option given`)
  if(!opts.scopes) return done(`no scopes option given`)
  
  let privatekey = opts.serviceAccountToken

  const jwtClient = new googleapis.google.auth.JWT(
    privatekey.client_email,
    null,
    privatekey.private_key,
    opts.scopes
  )

  jwtClient.authorize((err, tokens) => {
    if(err) return done(err)
    done(null, jwtClient)
  })
}

module.exports = getGoogleJWTClient