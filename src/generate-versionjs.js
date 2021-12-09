const execSync = require('child_process').execSync
const output = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' })
console.log('const version = {\n    "revision": "' + output.trim() + '",\n    "date": "' + new Date().toISOString().substring(0, 10) + '"\n}\nmodule.exports = { version: version }')
