const crypto = require('crypto');
console.log("ENCRYPTION_KEY=" + crypto.randomBytes(32).toString('base64'));
console.log("TOKEN_SECRET=" + crypto.randomBytes(32).toString('base64'));