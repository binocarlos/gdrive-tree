const cheerio = require('cheerio')

const extractBody = (html) => {
  const $ = cheerio.load(html)
  const style = $('head').find('style').html()
  const body = $('body').html()
  const wrappedStyle = style ? `<style type="text/css">${style}</style>` : ''
  return wrappedStyle + body
}

module.exports = extractBody