import test from 'node:test';import assert from 'node:assert/strict';import {validateReviewTargetLink} from '../src/ledger/review-target-link.mjs';
const a='a'.repeat(64),b='b'.repeat(64);
const link={format:'INVESTLAB_TEST_REVIEW_TARGET_LINK',version:1,createdAt:'2026-11-13T00:00:00Z',openingDigest:a,evidenceDigest:b,reviewerConfirmed:true,source:'USER_CONFIRMED_FILE_PAIR_NOT_SERVER_VERIFIED',serverVerified:false,canMigrate:false,canPost:false,authorization:'NONE'};
test('matching digests mean same files not server verification',()=>{const r=validateReviewTargetLink(link,{openingDigest:a,evidenceDigest:b});assert.equal(r.matched,true);assert.equal(r.serverVerified,false)});
test('different evidence file does not match',()=>assert.equal(validateReviewTargetLink(link,{openingDigest:a,evidenceDigest:a}).matched,false));
test('reviewer confirmation never authorizes migration',()=>assert.equal(validateReviewTargetLink(link,{openingDigest:a,evidenceDigest:b}).canMigrate,false));
test('unsafe link rejected',()=>assert.throws(()=>validateReviewTargetLink({...link,canPost:true},{openingDigest:a,evidenceDigest:b}),/unsafe/));
