import test from "node:test";
import assert from "node:assert/strict";
import {weightedAverageAcquisitionCost} from "../src/ledger/weighted-average-cost.mjs";
const accounts=[
 {holdings:[{ticker:"TSLA",quantityDisplay:"10",averageCostUsd:"200"}]},
 {holdings:[{ticker:"TSLA",quantityDisplay:"20",averageCostUsd:"350"}]}
];
test("whole portfolio uses quantity-weighted average, not arithmetic mean",()=>{
 const r=weightedAverageAcquisitionCost("TSLA",accounts);
 assert.equal(r.quantity,30);assert.equal(r.averageCostUsd,300);
 assert.equal(r.costBasisUsd,9000);assert.equal(r.positions,2);
});
test("selected account shows its own cost",()=>{
 assert.equal(weightedAverageAcquisitionCost("TSLA",[accounts[0]]).averageCostUsd,200);
});
test("missing cost on one account prevents a misleading average",()=>{
 const r=weightedAverageAcquisitionCost("TSLA",[accounts[0],{holdings:[{ticker:"TSLA",quantityDisplay:"5",averageCostUsd:null}]}]);
 assert.equal(r.averageCostUsd,null);assert.equal(r.complete,false);
});
test("invalid quantity and negative cost are rejected",()=>{
 assert.throws(()=>weightedAverageAcquisitionCost("TSLA",[{holdings:[{ticker:"TSLA",quantityDisplay:"NaN",averageCostUsd:"1"}]}]));
 assert.throws(()=>weightedAverageAcquisitionCost("TSLA",[{holdings:[{ticker:"TSLA",quantityDisplay:"1",averageCostUsd:"-1"}]}]));
});
