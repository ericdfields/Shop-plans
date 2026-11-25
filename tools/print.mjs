// Render a built plan to PDF (one step per page) and PNG previews, headless.
// Usage: node tools/print.mjs dist/<id>.html  ->  dist/<id>.pdf, dist/<id>-step-N.png
// three.js loads from node_modules so this works offline (npm i).
import fs from "node:fs"; import path from "node:path"; import { createRequire } from "node:module";
const require=createRequire(import.meta.url);
const { chromium }=require("playwright");
const file=process.argv[2]; if(!file){console.error("usage: node tools/print.mjs dist/<id>.html");process.exit(1)}
const three=path.dirname(require.resolve("three/package.json"));
const b=await chromium.launch({args:["--use-gl=swiftshader","--enable-unsafe-swiftshader"]});
const page=await b.newPage({viewport:{width:1100,height:1000}});
await page.route("**/three.min.js",r=>r.fulfill({body:fs.readFileSync(path.join(three,"build/three.min.js")),contentType:"text/javascript"}));
await page.route("**/OrbitControls.js",r=>r.fulfill({body:fs.readFileSync(path.join(three,"examples/js/controls/OrbitControls.js")),contentType:"text/javascript"}));
page.on("pageerror",e=>console.error("page error:",e.message));
const html=fs.readFileSync(file,"utf8");
await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head><body>${html}</body></html>`);
await page.waitForFunction(()=>[...document.querySelectorAll("img[data-step]")].every(i=>i.src.startsWith("data:")),null,{timeout:60000});
const out=file.replace(/\.html$/,"");
const imgs=await page.$$eval("img[data-step]",a=>a.map(i=>[i.dataset.step,i.src]));
for(const [n,src] of imgs)fs.writeFileSync(`${out}-step-${n}.png`,Buffer.from(src.split(",")[1],"base64"));
const checks=await page.$eval("#checks h2",e=>e.textContent);
await page.evaluate(()=>dispatchEvent(new Event("beforeprint")));
await page.emulateMedia({media:"print"});
await page.pdf({path:`${out}.pdf`,format:"Letter",preferCSSPageSize:true,printBackground:true});
await b.close();
console.log(`${out}.pdf · ${imgs.length} step images · ${checks}`);
