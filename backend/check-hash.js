const bcrypt = require('bcrypt');
const hash = '$2b$10$CYr0dJ7.akCtJvoUvQnG4e0Hf.fSP9AfgehRCw93m6R6T6jZ2JBdO';
bcrypt.compare('test123', hash).then(res => console.log('Matches test123:', res));
