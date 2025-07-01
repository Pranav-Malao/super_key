const crypto = require("crypto");

const generateUnlockCodes = () => {
  const codes = new Set();
  while (codes.size < 12) {
    const code = crypto.randomInt(100000, 1000000).toString();
    codes.add(code);
  }
  return Array.from(codes);
};

const generateUnlockCodes2 = () => {
  const codes = new Set();
  while (codes.size < 12) {
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    const code = (array[0] % 900000 + 100000).toString();
    codes.add(code);
  }
  return Array.from(codes);
};


console.log(generateUnlockCodes2());