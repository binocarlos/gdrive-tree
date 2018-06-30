const async = require('async')
const Bottleneck = require('bottleneck')
const GoogleSpreadsheet = require('google-spreadsheet')
const _ = require('lodash')

const googleDrive = require('./googleDrive')
const extractBody = require('./extractHTMLBody')

const PAGE_SIZE = 1000

/*

  LIMITER

  limit this client to 10 requests per second
  
*/
const limiter = new Bottleneck({
  maxConcurrent: 1,  
  minTime: 150,
});

const logger = (st, opts) => {
  if(process.env.LOGGING || opts.logging) console.log(st)
}

const throttleFunctions = {
  getFile: (opts, params, done) => opts.drive.files.get(params, done),
  listFiles: (opts, params, done) => opts.drive.files.list(params, done),
  exportFile: (opts, params, done) => opts.drive.files.export(params, done),
  getSpreadsheetInfo: (opts, done) => opts.spreadsheet.getInfo(done),
  loadWorksheetRows: (opts, params, done) => opts.worksheet.getRows(params, done),
}

/*

  FILES
  
*/
const getFileMeta = (opts, done) => {
  const params = {
    fileId: opts.itemId,
    fields: 'description,createdTime,modifiedTime,lastModifyingUser,version',
  }
  limiter.submit(throttleFunctions.getFile, opts, params, (err, res) => {
    if(err) return done(err)
    done(null, res.data)
  })
}

/*

  DOCS
  
*/


const getDocumentHTML = (opts, done) => {
  const params = {
    fileId: opts.itemId,
    mimeType: 'text/html',
  }
  limiter.submit(throttleFunctions.exportFile, opts, params, (err, res) => {
    if(err) return done(err)
    done(null, {
      raw: res.data,
      parsed: extractBody(res.data),
    })
  })
}

const getDocument = (opts, done) => {
  async.parallel({
    meta: next => getFileMeta(opts, next),
    html: next => getDocumentHTML(opts, next),
  }, done)
}


/*

  SHEETS
  
*/
const cleanRows = rows => rows.map(r =>
  _.chain(r)
    .omit(["_xml", "app:edited", "save", "del", "_links"])
    .mapKeys((v, k) => _.camelCase(k))
    .mapValues(val => {
      if (val === "") return null;
      // sheets apparently leaves commas in some #s depending on formatting
      if (val.replace(/[,\.\d]/g, "").length === 0 && val !== "") {
        return Number(val.replace(/,/g, ""));
      }
      if (val === "TRUE") return true;
      if (val === "FALSE") return false;
      return val;
    })
    .value()
)

const getSpreadsheet = (opts, done) => {
  async.parallel({
    meta: next => getFileMeta(opts, next),
    worksheets: next => getSpreadsheetData(opts, next),
  }, done)
}

const getSpreadsheetData = (opts, done) => {

  const { itemId, serviceAccountToken } = opts

  async.waterfall([
    (next) => {
      const doc = new GoogleSpreadsheet(itemId)
      doc.useServiceAccountAuth(serviceAccountToken, (err) => {
        if(err) return next(err)
        next(null, doc)
      })
    },

    (spreadsheet, next) => {
      limiter.submit(throttleFunctions.getSpreadsheetInfo, {spreadsheet}, (err, info) => {
        if(err) return next(err)
        next(null, info.worksheets)
      })
    },

    (worksheets, next) => {
      async.map(worksheets, (worksheet, nextWorksheet) => {
        const meta = {
          url: worksheet.url,
          id: worksheet.id,
          title: worksheet.title,
          rowCount: worksheet.rowCount,
          colCount: worksheet.colCount
        }
        limiter.submit(throttleFunctions.loadWorksheetRows, {worksheet}, {}, (err, rows) => {
          if(err) return nextWorksheet(err)
          nextWorksheet(null, {
            meta,
            data: cleanRows(rows)
          })
        })
      }, next)
    }
  ], done)
}


const listFolder = (opts, done) => {  

  const { drive, itemId, serviceAccountToken } = opts

  const params = {
    pageSize: PAGE_SIZE,
    q: `'${itemId}' in parents`,
  }
  logger(`loading folder ${itemId}`, opts)
  limiter.submit(throttleFunctions.listFiles, opts, params, (err, res) => {
    if(err) return done(err)
    const files = res.data.files || []

    async.map(files, (file, next) => {

      let processorFunction = MIME_TYPES[file.mimeType]

      if(!processorFunction) {
        logger(`unknown mime type ${file.mimeType} - ${file.name}`, opts) 
        return next()
      }
      logger(`found ${file.mimeType} ${file.name}`, opts)

      processorFunction({
        drive,
        serviceAccountToken,
        itemId: file.id,
        logging: opts.logging,
      }, (err, results) => {
        if(err) return next(err)
        file.contents = results
        next(null, file)
      })

    }, (err, results) => {
      if(err) return done(err)
      results = results.filter(r => r)
      done(null, results)
    })
  })
}

/*

  FOLDERS
  
*/

const MIME_TYPES = {
  'application/vnd.google-apps.folder': listFolder,
  'application/vnd.google-apps.document': getDocument,
  'application/vnd.google-apps.spreadsheet': getSpreadsheet,
}


/*

  DRIVE
  
*/
const getGoogleDriveLoader = (opts, done) => {
  if(!opts.serviceAccountToken) return done(`no serviceAccountToken option given`)
  if(!opts.itemId) return done(`no itemId option given`)
  async.waterfall([
    (next) => googleDrive(opts, next),
    (drive, next) => listFolder({
      drive,
      serviceAccountToken: opts.serviceAccountToken,
      itemId: opts.itemId,
      logging: opts.logging,
    }, next)
  ], (err, results) => {
    if(err) return done(err)
    done(null, results)
  })
}

module.exports = getGoogleDriveLoader