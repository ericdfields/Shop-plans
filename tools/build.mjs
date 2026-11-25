// Bundle engine + one plan into a single self-contained HTML page (publishable as an artifact).
// Usage: node tools/build.mjs plans/<id>   ->  dist/<id>.html
import fs from "node:fs"; import path from "node:path";
const dir=process.argv[2]; if(!dir){console.error("usage: node tools/build.mjs plans/<id>");process.exit(1)}
const root=path.dirname(new URL(import.meta.url).pathname)+"/..";
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const plan=fs.readFileSync(path.join(dir,"plan.js"),"utf8");
const title=(/title:"([^"]+)"/.exec(plan)||[,"Shop plan"])[1];
const id=path.basename(path.resolve(dir));
const out=read("engine/shell.html").replace("{{TITLE}}",title).replace("{{CSS}}",()=>read("engine/engine.css"))
  .replace("{{CORE}}",()=>read("engine/core.js")).replace("{{PLAN}}",()=>plan).replace("{{ENGINE}}",()=>read("engine/engine.js"));
fs.mkdirSync(path.join(root,"dist"),{recursive:true});
fs.writeFileSync(path.join(root,"dist",id+".html"),out);
console.log(`dist/${id}.html  ${(out.length/1024).toFixed(0)} KB`);
