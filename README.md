# gdrive-tree

A module that downloads a google drive folder recursively loading the contents of spreadsheets and google documents into a tree data structure.

## install

```bash
npm install --save gdrive-tree
```

## usage

You need to have created a service account token with google and downloaded the `.json` file for it.

Also - you need to have given read access to a folder on google drive to that service account and have the id of the folder ready.

```javascript
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

```

Then to use the script above:

```bash
export SERVICE_ACCOUNT_TOKEN_FILE=/path/to/token.json
export GOOGLE_DRIVE_FOLDER_ID=1UiqYqO739hVTwddxnLm8-S_f9QxvYS1r
node examples/test-google-drive-loader.js
```

