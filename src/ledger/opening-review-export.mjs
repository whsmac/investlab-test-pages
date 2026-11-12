// Offline-only export envelope. Not a migration approval or server verification.
export function buildOpeningReviewExport({review,inputs,reviewKind,createdAt}={}){
 if(!review||!inputs||!['allocation','ledger-reconciliation'].includes(reviewKind))throw Error('review export inputs required');
 if(typeof createdAt!=='string'||!/^\d{4}-\d{2}-\d{2}T/.test(createdAt)||!Number.isFinite(Date.parse(createdAt)))throw Error('valid timestamp required');
 if(review.canMigrate===true||review.canPost===true||review.serverVerified===true)throw Error('unsafe review flags');
 const clone=JSON.parse(JSON.stringify({review,inputs}));
 return {format:'INVESTLAB_TEST_OPENING_REVIEW',version:1,createdAt,reviewKind,review:clone.review,inputs:clone.inputs,serverVerified:false,canMigrate:false,canPost:false,authorization:'NONE',notice:'Offline review only; does not authorize migration or Supabase writes'};
}
