import {cpSync} from 'node:fs';
cpSync('assets','dist/assets',{recursive:true});
