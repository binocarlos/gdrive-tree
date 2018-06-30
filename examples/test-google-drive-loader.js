const fs = require('fs')
const googleDriveLoader = require('../src/index')

const SERVICE_ACCOUNT_TOKEN_FILE = process.env.SERVICE_ACCOUNT_TOKEN_FILE
const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID

if(!SERVICE_ACCOUNT_TOKEN_FILE) {
  console.error(`SERVICE_ACCOUNT_TOKEN_FILE variable needed`)
  process.exit(1)
}

if(!GOOGLE_DRIVE_FOLDER_ID) {
  console.error(`GOOGLE_DRIVE_FOLDER_ID variable needed`)
  process.exit(1)
}

if(!fs.existsSync(SERVICE_ACCOUNT_TOKEN_FILE)) {
  console.error(`${SERVICE_ACCOUNT_TOKEN_FILE} file does not exist`)
  process.exit(1)
}

let serviceAccountToken = null

try {
  const serviceAccountTokenContents = fs.readFileSync(SERVICE_ACCOUNT_TOKEN_FILE, 'utf8')
  serviceAccountToken = JSON.parse(serviceAccountTokenContents)
} catch(e) {
  console.error(`error loading service account JSON: ${e.toString()}`)
  process.exit(1)
}

googleDriveLoader({
  serviceAccountToken,
  itemId: GOOGLE_DRIVE_FOLDER_ID,
  logging: true,
}, (err, results) => {
  if(err) {
    console.error(`error: ${err.toString()}`)
    process.exit(1)
  }

  console.log(JSON.stringify(results, null, 4))
})
