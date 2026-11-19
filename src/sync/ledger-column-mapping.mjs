// Offline-only mapping candidates; schema must be supplied from a verified SQL column inventory.
const validName=s=>typeof s==='string'&&/^[a-zA-Z_][a-zA-Z0-9_]{0,62}$/.test(s);
export function previewLedgerColumnMapping(ledger,columns,{section='transactions'}={}){
 if(!ledger||typeof ledger!=='object'||Array.isArray(ledger))throw Error('원장 JSON 객체가 필요합니다');
 if(!Array.isArray(columns)||columns.length===0||columns.length>200)throw Error('DB 컬럼 목록이 필요합니다');
 const rows=ledger[section];if(!Array.isArray(rows))throw Error('원장 배열 섹션을 찾을 수 없습니다: '+section);
 const seen=new Set();const fields=new Set();
 for(const row of rows){if(!row||typeof row!=='object'||Array.isArray(row))throw Error('원장 행은 객체여야 합니다');for(const key of Object.keys(row))fields.add(key);}
 const mapped=[];
 for(const col of columns){
  if(!col||!validName(col.column_name)||seen.has(col.column_name)||!['YES','NO'].includes(col.is_nullable)||typeof col.data_type!=='string')throw Error('DB 컬럼 정보 형식 오류');
  seen.add(col.column_name);
  mapped.push({column:col.column_name,type:col.data_type,nullable:col.is_nullable==='YES',sourceField:fields.has(col.column_name)?col.column_name:null,requiresReview:!fields.has(col.column_name)});
 }
 return {table:'ledger_transactions',section,sourceRows:rows.length,mapped,unmappedSourceFields:[...fields].filter(f=>!seen.has(f)).sort(),schemaProvided:true,schemaServerVerified:false,rlsIsolationVerified:false,canPost:false,canSync:false};
}
