/*────────────────────────────────────────────────────────────────────────────────────────────────*/

Object.defineProperties(global,{__:{set:v=>process.exit(_=v)},_:{set:console.log}});
Object.defineProperty(global, '$', {value:{}});

/*────────────────────────────────────────────────────────────────────────────────────────────────*/

const crypto = require('crypto');

let max = 3;
let fragmentSize = 1;

_=crypto.randomInt(max - fragmentSize) + fragmentSize + 1