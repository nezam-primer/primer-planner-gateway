import fs from 'node:fs';
import {validatePayload} from './data-contract.mjs';

const p=process.argv[2]||new URL('./data.sample.json',import.meta.url);
const d=JSON.parse(fs.readFileSync(p,'utf8'));
const result=validatePayload(d);
console.log(JSON.stringify(result));
if(!result.ok) process.exit(2);
