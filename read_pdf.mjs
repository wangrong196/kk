import fs from 'fs';
import { pdf } from 'pdf-parse';
const path1 = process.argv[2];
const path2 = process.argv[3];

async function main() {
  if (path1) {
    console.log('正在读取: ' + path1.split('\\').pop());
    const buf1 = fs.readFileSync(path1);
    const data1 = await pdf(buf1);
    console.log('页数:', data1.numpages);
    console.log('---');
    console.log(data1.text.substring(0, 3000));
    console.log('');
  }
  
  if (path2) {
    console.log('正在读取: ' + path2.split('\\').pop());
    const buf2 = fs.readFileSync(path2);
    const data2 = await pdf(buf2);
    console.log('页数:', data2.numpages);
    console.log('---');
    console.log(data2.text.substring(0, 3000));
  }
}
main().catch(e => console.error('Error:', e.message));
