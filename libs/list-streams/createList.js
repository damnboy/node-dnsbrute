var stream = require('stream')
var fs = require('fs')
var path = require('path')
var genStreams = require('../list-streams')

function createListStream (list) {
  var ps = new stream.Transform({objectMode: true})
  ps._transform = function (data, enc, callback) {
    callback(null, data)
  }
  ps.pause()

  if (list) {
    var listStream = fs.createReadStream(
      path.resolve(path.join(path.dirname(__filename), '../../dicts'), list))

    var liner = genStreams.liner();
    /*
    liner.on('end', function(){

      console.log('liner end')

    })

    liner.on('close', function(){

      console.log('liner close')

    });

    liner.on('finish', function(){

      console.log('liner finish')

    })
    */


    listStream
      .pipe(liner)
      .pipe(genStreams.cleaner())
      .pipe(ps)
  } else {
    // pipe the fuzzer stream to the pause stream
  }

  return ps
}

module.exports = createListStream
