// Strict offline JSON import. No network, filesystem writes or persistent storage.
import {mapLegacyHoldingsToOpening} from './legacy-holdings-map.mjs';
export const MAX_IMPORT_BYTES=1024*1024;
export function parseLegacyHoldingsFile(text,accountId){
 if(typeof text!=='string')throw Error('file content must be text');
 if(new TextEncoder().encode(text).byteLength>MAX_IMPORT_BYTES)throw Error('file exceeds 1 MiB');
 let parsed;
 try{parsed=JSON.parse(text)}catch{throw Error('invalid JSON file')}
 // Explicitly supported: raw holdings array or object containing holdings array.
 const holdings=Array.isArray(parsed)?parsed:parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?parsed.holdings:undefined;
 if(!Array.isArray(holdings))throw Error('expected holdings array or {holdings:[...]}');
 if(holdings.length>10000)throw Error('too many holdings');
 const result=mapLegacyHoldingsToOpening({holdings,accountId});
 return Object.freeze({...result,fileFormat:'INVESTLAB_LEGACY_HOLDINGS_JSON',sourceCount:holdings.length});
}
