import { readFileSync, writeFileSync } from 'fs';
import { read, utils } from '../node_modules/xlsx/xlsx.mjs';

const wb = read(readFileSync('/home/tirth.v/908-Hardware_Inventory.xlsx'));
const ws = wb.Sheets[wb.SheetNames[0]];
const data = utils.sheet_to_json(ws, { defval: null, raw: false });

console.log('Sheet:', wb.SheetNames[0]);
console.log('Total rows:', data.length);
console.log('Columns:', JSON.stringify(Object.keys(data[0] || {})));
console.log('---DATA---');
console.log(JSON.stringify(data, null, 2));
