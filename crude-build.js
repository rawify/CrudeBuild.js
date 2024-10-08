
const fs = require('fs');

const ClosureCompiler = require('google-closure-compiler').compiler;

const moduleName = process?.argv?.[2] || "None";

function createLicenseHeader(json) {

  function getToday() {
    const date = new Date;
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    return `${month}/${day}/${year}`;
  }

  return `/**
 * @license ${json.title} v${json.version} ${getToday()}
 * ${json.homepage}
 *
 * Copyright (c) ${new Date().getFullYear()}, ${json.author.name} (${json.author.url})
 * Licensed under the ${json.license} license.
 **/

`;
}

function createOrig_TPL(moduleName, licenseHeader, sourceCode) {
  return licenseHeader + sourceCode + "\n";
}

function createCJS_TPL(moduleName, licenseHeader, sourceCode, externs) {
  return `'use strict';
${getExterns(externs, 'cjs')}
${sourceCode}

Object.defineProperty(${moduleName}, "__esModule", { 'value': true });
${moduleName}['default'] = ${moduleName};
${moduleName}['${moduleName}'] = ${moduleName};
module['exports'] = ${moduleName};
`;
}

function createESM_TPL(moduleName, licenseHeader, sourceCode, externs) {
  return `'use strict';
${getExterns(externs, 'esm')}
${sourceCode}
export {
  ${moduleName} as default, ${moduleName}
};
`;
}

function createIIFE_TPL(moduleName, licenseHeader, sourceCode, externs) {
  return `${licenseHeader}
(function(window) {
${sourceCode}

  window['${moduleName}'] = ${moduleName};

})(this);
`
}

function getExterns(externs, type) {
  let str = "";

  for (let e of externs) {
    switch (type) {
      case 'var':
        str += "var " + e.name + ";\n";
        break;
      case 'esm':
        str += "import " + e.name + " from '" + e.inc + "';\n";
        break;
      case 'cjs':
        str += "const " + e.name + " = require('" + e.inc + "');\n";
        break;
    }
  }
  return str;
}

fs.readFile('package.json', function (err, package) {
  let json = JSON.parse(package.toString());

  fs.readFile('src/' + moduleName.toLocaleLowerCase() + '.js', function (err, data) {

    if (err) {
      console.log(err);
      return;
    }

    let sourceCode = data.toString().replace(/\/\*.+?@license.+?\*\//s, '').trim();
    let licenseHeader = createLicenseHeader(json);

    const ORIG_TPL = createOrig_TPL(moduleName, licenseHeader, sourceCode);

    // Extract externs in format "/* import Quaternion from quaternion */"
    const externs = [];
    sourceCode = sourceCode.replace(/\/\*\s*import\s*([a-z0-9.-]+)\s*from\s*([a-z0-9.-]+)\s*\*\//ig, function (_, name, inc) {
      externs.push({ name, inc });
      return '';
    });

    const CJS_TPL = createCJS_TPL(moduleName, licenseHeader, sourceCode, externs);
    const ESM_TPL = createESM_TPL(moduleName, licenseHeader, sourceCode, externs);
    const IIFE_TPL = createIIFE_TPL(moduleName, licenseHeader, sourceCode, externs);

    fs.writeFile('src/' + moduleName.toLocaleLowerCase() + '.js', ORIG_TPL, (err) => { }); // Write back new header
    fs.writeFile('dist/' + moduleName.toLocaleLowerCase() + '.js', CJS_TPL, (err) => { });
    fs.writeFile('dist/' + moduleName.toLocaleLowerCase() + '.mjs', ESM_TPL, (err) => { });
    fs.writeFile('dist/' + moduleName.toLocaleLowerCase() + '.min.js', IIFE_TPL, (err) => { });

    fs.writeFile('externs.js', getExterns(externs, 'var'), function () {

      const closureCompiler = new ClosureCompiler({
        js: 'dist/' + moduleName.toLocaleLowerCase() + '.min.js',
        compilationLevel: sourceCode.indexOf('!simple-compilation') !== -1 ? 'SIMPLE' : 'ADVANCED',
        warningLevel: 'VERBOSE',
        externs: 'externs.js',
        emit_use_strict: true,
        languageOut: 'ES6'
      });

      // Minify IIFE
      closureCompiler.run((exitCode, stdOut, stdErr) => {
        console.log(stdErr.toString());

        let newCont = stdOut.toString().replace(/^ +/gm, '');

        fs.writeFile('dist/' + moduleName.toLocaleLowerCase() + '.min.js', newCont, (err) => { });
        fs.unlink('externs.js', (err) => { });
      });
    });

  });

});