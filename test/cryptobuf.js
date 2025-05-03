/*▄────────────────────▄
  █                    █
  █  Загрузка модулей  █
  █                    █
  ▀────────────────────▀*/
require('core'); // Ядро
const CryptoBuffer = require('../lib/crypto-buffer'); // Работа с криптобуфером

/*┌─────────────────────┐
  │ Создаем криптобуфер │
  └─────────────────────┘*/
const cryptoBuffer = new CryptoBuffer();


// cryptoBuffer.update();

const keyString = '0.9562362631011287';  // 512  9
// const keyString = '0.24687244198964353'; // 512 15
// const keyString = '0.3517663706545353';  // 512 17
// const keyString = String(Math.random());
// const keyString = '0.8836932956723573'; // 256
let bufferList = cryptoBuffer.getKeyParts(Buffer.from(keyString), 18);
// _=bufferList
// _=Object.keys(bufferList).length
