const request = require('axios');
const cheerio = require('cheerio');

function isUpperCase(word) {
  return word[0].toUpperCase() === word[0];
}

function transformCase(word) {
  if (isUpperCase(word)) {
    return word.toLowerCase();
  }
  return word[0].toUpperCase() + word.substring(1);
}

function wikiReplace(event, context, callback) {
  console.log('Received event:', JSON.stringify(event, null, 2));
  const find = event.params && event.params.querystring && event.params.querystring.f ? event.params.querystring.f.split(',') : [];
  const replace = event.params && event.params.querystring && event.params.querystring.r ? event.params.querystring.r.split(',') : [];
  const startingUrl = `https://en.wikipedia.org/wiki/${event.params.path.page}`
  const url = replace.reduce((final, word, i) => {
    const regex = new RegExp(word, 'gi');
    final = final.replace(regex, find[i] || '');
    return final;
  }, startingUrl);
  request(url).then(res => {
    const replaced = find.reduce((output, word, i) => {
      const replacer = replace[i] || '';
      const regex = new RegExp(word, 'g');
      const alternateRegex = new RegExp(transformCase(word), 'g');
      output = output.replace(regex, replacer).replace(alternateRegex, transformCase(replacer));
      return output;
    }, res.data);
    const html = cheerio.load(replaced);
    html('link').map((i, elem) => {
      if (elem.attribs.href.indexOf('//') === -1) {
        elem.attribs.href = `//en.wikipedia.org${elem.attribs.href}`;
      }
      return elem;
    });
    html('img').map((i, elem) => {
      replace.forEach((word, i) => {
        if (elem.attribs.src.indexOf(word) !== -1 || elem.attribs.src.indexOf(transformCase(word)) !== -1) {
          const regex = new RegExp(word, 'g');
          const alternateRegex = new RegExp(transformCase(word), 'g');
          elem.attribs.src = elem.attribs.src.replace(regex, find[i] || '').replace(alternateRegex, transformCase(find[i] || ''));
          if (elem.attribs.srcset) {
            elem.attribs.srcset = elem.attribs.srcset.replace(regex, find[i] || '').replace(alternateRegex, transformCase(find[i] || '')); 
          }
        }
        return elem;
      });
    });
    callback(null, html.html());
  }).catch(e => callback(e));
}

exports.handler = wikiReplace;

