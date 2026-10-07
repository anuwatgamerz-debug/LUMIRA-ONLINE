'use strict';
// password storage: bcrypt (cost from BCRYPT_COST, default 12) via the vendored pure-JS bcryptjs (no native build on
// the Windows VPS). Old accounts hold scrypt hashes (salt + 32-byte key); they still verify and are re-hashed with
// bcrypt after the next successful login. Plaintext / MD5 / SHA are never used.
const crypto = require('crypto');
const bcrypt = require('./vendor/bcryptjs');
const MAX_BYTES = 72; // bcrypt only uses the first 72 bytes: longer passwords are refused instead of silently cut
const tooLong = pw => Buffer.byteLength(String(pw), 'utf8') > MAX_BYTES;
module.exports = function passwords(cost = 12) {
  return {
    tooLong,
    // -> { alg, salt, hash }
    async hash(pw) { return { alg: 'bcrypt', salt: '', hash: await bcrypt.hash(String(pw), cost) }; },
    async verify(a, pw) {
      if (!a || !a.hash) return false;
      if (a.alg === 'bcrypt' || /^\$2[aby]\$/.test(a.hash)) return bcrypt.compare(String(pw), a.hash);
      // legacy scrypt (salt hex string, 32-byte key hex)
      const k = await new Promise(r => crypto.scrypt(String(pw), a.salt, 32, (e, b) => r(e ? null : b)));
      if (!k) return false; const want = Buffer.from(String(a.hash), 'hex');
      return want.length === k.length && crypto.timingSafeEqual(want, k);
    },
    needsUpgrade: a => !!(a && a.hash && !(a.alg === 'bcrypt' || /^\$2[aby]\$/.test(a.hash))),
  };
};
