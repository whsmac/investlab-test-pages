import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {renderPortfolioDashboard} from "../src/ui/pilot-portfolio-dashboard.mjs";

class Element {
 constructor(){this.children=[];this.textContent="";this.style={};this.classList={add:()=>{}};this.value="ALL";}
 append(...nodes){this.children.push(...nodes);}
 replaceChildren(){this.children=[];}
 dispatchEvent(){}
}
const elements=new Map();
global.document={
 getElementById:(id)=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);},
 querySelector:()=>{if(!elements.has("total-label"))elements.set("total-label",new Element());return elements.get("total-label");},
 createElement:()=>new Element()
};
const el=id=>document.getElementById(id);
const data={version:1,accounts:[{id:"a",name:"일반계좌",type:"brokerage"}],entries:[
 {id:"1",accountId:"a",type:"OPEN",symbol:"TSLA",qty:10,price:200,date:"2026-01-01"},
 {id:"2",accountId:"a",type:"DEPOSIT",currency:"USD",amount:300,date:"2026-01-01"},
 {id:"3",accountId:"a",type:"DEPOSIT",currency:"KRW",amount:500000,date:"2026-01-01"}
]};
const prices=new Map([["TSLA",{date:"2026-11-20",close:250,currency:"USD"}]]);
test("KRW display applies FX to holdings, cash, total and gains",()=>{
 renderPortfolioDashboard({data,prices,fx:1000,fxDate:"2026-11-20",selected:"ALL",displayCurrency:"KRW"});
 assert.equal(el("dashboardTotal").textContent,"KRW 3,300,000");
 assert.equal(el("dashboardStocks").textContent,"KRW 2,500,000");
 assert.equal(el("dashboardGain").textContent,"+KRW 500,000");
 assert.equal(el("holdingAverageHeader").textContent,"평균단가 KRW");
 assert.equal(el("dashboardAccounts").children.length,2);
});
test("USD selection switches the same source amounts without data mutation",()=>{
 const before=JSON.stringify(data);
 renderPortfolioDashboard({data,prices,fx:1000,fxDate:"2026-11-20",selected:"ALL",displayCurrency:"USD"});
 assert.equal(el("dashboardTotal").textContent,"USD 3,300");
 assert.equal(el("dashboardStocks").textContent,"USD 2,500");
 assert.equal(el("dashboardGain").textContent,"+USD 500");
 assert.equal(el("holdingCloseHeader").textContent,"최근 종가 USD");
 assert.equal(JSON.stringify(data),before);
});
test("unavailable FX never fabricates a converted total",()=>{
 renderPortfolioDashboard({data,prices,fx:null,fxDate:"",selected:"ALL",displayCurrency:"KRW"});
 assert.equal(el("dashboardTotal").textContent,"—");
 assert.equal(el("dashboardCash").textContent,"—");
 renderPortfolioDashboard({data,prices,fx:null,fxDate:"",selected:"ALL",displayCurrency:"USD"});
 assert.equal(el("dashboardTotal").textContent,"—");
 assert.equal(el("dashboardStocks").textContent,"USD 2,500");
});
test("real portfolio screen exposes a user controlled currency select",()=>{
 const html=readFileSync(new URL("../my-portfolio.html",import.meta.url),"utf8");
 assert.match(html,/id="displayCurrency"/);
 assert.match(html,/displayCurrency:\$\('displayCurrency'\)\.value/);
 assert.match(html,/\$\('displayCurrency'\)\.addEventListener\('change'/);
});
