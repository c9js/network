const k = 17;   // Длина ключа
const n = 1508; // Длина сообщения

const entropyPositions = log2Binomial(n, k);
const entropyValues = k * 8; // 8 бит на байт

const totalEntropy = entropyPositions + entropyValues;

[
    `${k} байт — Длина ключа`,
    `${n} байт — Длина сообщения`,
    `---`,
    `${entropyPositions.toFixed(0)} бит ≈ log2(C(${n}, ${k})) — Энтропия расположений`,
    `${entropyValues.toFixed(0)} бит = (8 * ${k}) — Энтропия значений`,
    `${totalEntropy.toFixed(0)} бит — Общая энтропия`,
].forEach(message => console.log(message));

function lnFactorial(n) {
// Формула Стирлинга для приближенного вычисления ln(n!)
    if (n === 0 || n === 1) return 0;
    return n * Math.log(n) - n + 0.5 * Math.log(2 * Math.PI * n);
}

function log2Binomial(n, k) {
    const lnBinomial = lnFactorial(n) - lnFactorial(k) - lnFactorial(n - k);
    return lnBinomial / Math.log(2);
}
