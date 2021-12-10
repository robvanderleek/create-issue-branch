const execSync = require('child_process').execSync
let output = 'main-latest'
try {
  output = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' })
} catch (e) {
  console.error('Could not retrieve version information')
}
console.log('const version = {\n    "revision": "' + output.trim() + '",\n    "date": "' + new Date().toISOString().substring(0, 10) + '"\n}\nmodule.exports = { version: version }')
