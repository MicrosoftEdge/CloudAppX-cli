#! /usr/bin/env node

var program = require('commander');
var archiver = require('archiver');
var fs = require('fs');
var request = require('request');
var path = require('path');

var domain = 'https://8b57e1a5.ngrok.io';

function isValidFile (dir) {
  if (!fs.existsSync(dir) || !fs.lstatSync(dir).isFile() || path.extname(dir) !== '.zip') {
    return false;
  }
  return true;
}
function isValidDir(dir) {
  if (!fs.existsSync(dir) || !fs.lstatSync(dir).isDirectory()) {
    return false;
  }
  return true;
}


function main() {
  program
    .version('0.0.1')
    .usage('<input app directory>')
    .option('-z, --zipped', 'Run on zipped file')
    .option('-v, --verbose', 'Print debug info')
    .parse(process.argv);


  if (!program.args.length) {
    program.help();
  } else {
    var dir = program.args[0];
    if (!program.zip) {
      if (isValidDir(dir)) {
        var outfile = dir + '.zip';
        var output = fs.createWriteStream(outfile);
        var archive = archiver('zip');
        output.on('close', function () {
          console.log(archive.pointer() + ' total bytes');
          console.log('archiver has been finalized and the output file descriptor has closed.');
          uploadFile(outfile);
        });

        archive.on('error', function(err){
          throw err;
        });
        archive.pipe(output);
        archive.directory(dir);
        archive.finalize();

      } else if (isValidFile(dir)) {
        console.log(dir);
        uploadFile(dir);
      } else {
        console.log('invalid input');
      }
    }
  }
}

function uploadFile(file) {
  var req = request.post(domain + '/v1/upload', function (err, resp, body) {
    if (err) {
      console.log('Error!');
    } else {
      console.log('URL: ' + body);
      getResult(body);
    }
  });
  var form = req.form();
  form.append('xml', fs.createReadStream(file));
  return body;
}

function getResult(url) {
  var req = request.get(domain + '/' + url)
    .on('response', function(res) {
      var filename = 'package.appx';
      res.pipe(fs.createWriteStream('./' + filename));
    });
}

if (!module.parent) {
  main();
} else {
  module.exports = {
    uploadFile: uploadFile,
    getResult: getResult,
    cloudappx: cloudappx
  };
}
