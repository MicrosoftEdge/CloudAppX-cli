#! /usr/bin/env node

var program = require('commander');
var archiver = require('archiver');
var fs = require('fs');
var request = require('request');
var path = require('path');
var Q = require('q');

var domain = process.env.CLOUDAPPX_SERVER || 'https://90f18825.ngrok.io';

function debugmsg(msg) {
  if (program && program.verbose) {
    console.log(msg);
  }
}

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
    cloudappx(dir);
  }
}

function cloudappx(dir) {
  return zip(dir).then(uploadFile).then(getResult);
}

function zip(dir) {
  var deferred = Q.defer();
  if (isValidDir(dir)) {
    var outfile = dir + '.zip';
    var output = fs.createWriteStream(outfile);
    var archive = archiver('zip');
    output.on('close', function() {
      debugmsg(archive.pointer() + ' total byes');
      debugmsg('archiver has been finalized and the output file descriptor has closed.');
      deferred.resolve(outfile);
    });
    archive.on('error', function(err) {
      deferred.reject(err);
      throw err;
    });
    archive.pipe(output);
    archive.directory(dir, path.basename(dir));
    archive.finalize();

  } else if (isValidFile(dir)) {
    debugmsg(dir);
    deferred.resolve(dir);
  } else {
    debugmsg('invalid input');
    deferred.reject();
  }
  return deferred.promise;
}

function uploadFile(file) {
  var deferred = Q.defer();
  debugmsg('uploading file');
  var req = request.post(domain + '/v1/upload', function (err, resp, body) {
    if (err) {
      debugmsg('Error!');
    } else {
      debugmsg('URL: ' + body);
      deferred.resolve({url: body, file: file});
    }
  });
  var form = req.form();
  form.append('xml', fs.createReadStream(file));
  return deferred.promise;
}

function getResult(dirs) {
  var url = dirs.url;
  var file = dirs.file;
  var tempsplit = file.split('.');
  tempsplit.pop();
  var filename = tempsplit.join('.') + '.appx';
  var deferred = Q.defer();
  var req = request.get(domain + '/' + url)
  .on('response', function(res) {
    //var filename = 'package.appx';
    res.pipe(fs.createWriteStream(filename));
    deferred.resolve();
  });
  return deferred.promise;
}

if (!module.parent) {
  main();
} else {
  module.exports = {
    uploadFile: uploadFile,
    getResult: getResult,
    cloudappx: cloudappx,
    zip: zip
  };
}
