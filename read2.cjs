const fs = require('fs');
const pdf = require('pdf-parse');
async function main() {
  const path = process.argv[2];
  if (!path) { console.log('用法: node read2.js <pdf路径>'); return; }
  console.log('正在读取: ' + path.split('\\').pop());
  const buf = fs.readFileSync(path);
  const data = await pdf(buf);
  console.log('页数:', data.numpages);
  console.log('---');
  console.log(data.text);
}
main().catch(e => console.error('Error:', e.message));
