
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

function createLicenseFile(json) {

  if (json.license === 'MIT') {
    return `MIT License

Copyright (c) ${new Date().getFullYear()} ${json.author.name}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;
  } else {
    return "";
  }
}

function createLicenseReadme(json) {

  return `## Copyright and Licensing

Copyright (c) ${new Date().getFullYear()}, [${json.author.name}](${json.author.url})
Licensed under the MIT license.
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

  if (typeof define === 'function' && define['amd']) {
    define([], function() {
      return ${moduleName};
    });
  } else if (typeof exports === 'object') {
    Object.defineProperty(${moduleName}, "__esModule", { 'value': true });
    ${moduleName}['default'] = ${moduleName};
    ${moduleName}['${moduleName}'] = ${moduleName};
    module['exports'] = ${moduleName};
  } else {
    window['${moduleName}'] = ${moduleName};
  }

})(this);
`
}

function getExterns(externs, type) {
  let str = "";

  if (type === "var") {
    str += "var module;\n";
  }

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

    // Extract externs in format "import Quaternion from 'quaternion';"
    const externs = [];
    sourceCode = sourceCode.replace(/\s*import\s*([a-z0-9.-]+)\s*from\s*["']([a-z0-9.-]+)["']\s*;?/ig, function (_, name, inc) {
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

    fs.writeFile('LICENSE', createLicenseFile(json), (err) => { });

    fs.readFile('README.md', (err, data) => {
      let source = data.toString().replace(/##\s*copyright[^#]+/im, '').trim();

      fs.writeFile('README.md', source + "\n\n" + createLicenseReadme(json), () => { });
    });

    fs.writeFile('externs.js', getExterns(externs, 'var'), function () {

      const closureCompiler = new ClosureCompiler({
        js: 'dist/' + moduleName.toLocaleLowerCase() + '.min.js',
        compilationLevel: sourceCode.indexOf('!simple-compilation') !== -1 ? 'SIMPLE' : 'ADVANCED',
        warningLevel: 'VERBOSE',
        externs: 'externs.js',
        emit_use_strict: true
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