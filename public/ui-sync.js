/* Reconcile live UI without detaching unchanged controls or native select popups. */
window.LiveUI=(()=>{
 const sources=new WeakMap();
 function key(node){if(node.nodeType!==1)return null;const gameKey=['sortId','sortHandle','sortUp','sortDown','wireLeft','wireRight','dial','maze','mazeMove','scrub','light','slide','pour','pixel','paint','weight','tower','flood','gear','domino','flip'].find(k=>k in node.dataset);if(gameKey)return gameKey+':'+node.dataset[gameKey];return node.dataset.uiKey||node.id||(node.dataset.taskId?'task:'+node.dataset.taskId:null)||(node.matches('form.task-form')?'task-form:'+node.dataset.id:null)||(node.matches('form.ability')?'ability:'+node.dataset.type:null)||(node.tagName==='DETAILS'?'details:'+node.querySelector('summary')?.textContent:null)||(node.tagName==='OPTION'?'option:'+node.value:null)||(node.matches('input,select,textarea')?'field:'+node.name+':'+node.type+(node.type==='checkbox'?':'+node.value:''):null);}
 function compatible(a,b){return a.nodeType===b.nodeType&&(a.nodeType!==1||a.tagName===b.tagName)&&key(a)===key(b);}
 function patch(node,next){
  if(node.nodeType!==1){if(node.nodeValue!==next.nodeValue)node.nodeValue=next.nodeValue;return;}
  const preserve=name=>(node.tagName==='DETAILS'&&name==='open')||(node.tagName==='SELECT'&&name==='size')||(node.matches('input,textarea,select')&&['value','checked','selected'].includes(name));
  for(const attr of [...node.attributes])if(!next.hasAttribute(attr.name)&&!preserve(attr.name))node.removeAttribute(attr.name);
  for(const attr of next.attributes)if(!preserve(attr.name)&&node.getAttribute(attr.name)!==attr.value)node.setAttribute(attr.name,attr.value);
  // Avoid rebuilding options while a native picker is open. Filtering owns their live DOM.
  if(node.tagName==='SELECT'){
   const source=next.innerHTML;
   if(sources.get(node)!==source){const value=node.value;children(node,next);sources.set(node,source);node.value=[...node.options].some(o=>o.value===value)?value:'';if(node.name==='target')node.form.availableOptions=[...next.options].map(o=>({value:o.value,text:o.textContent}));}
   return;
  }
  if(node.tagName==='INPUT'||node.tagName==='TEXTAREA')return;
  children(node,next);
 }
 function children(parent,next){const old=[...parent.childNodes],used=new Set();let cursor=parent.firstChild;
  for(const desired of [...next.childNodes]){let node=old.find(n=>!used.has(n)&&compatible(n,desired));
   if(node){used.add(node);if(node!==cursor){while(cursor&&!used.has(cursor)&&!nextHas(next,cursor)){const following=cursor.nextSibling;cursor.remove();cursor=following;}if(node!==cursor)parent.insertBefore(node,cursor);}patch(node,desired);}
   else {node=desired.cloneNode(true);parent.insertBefore(node,cursor);seed(node);}
   cursor=node.nextSibling;
  }
  for(const node of old)if(!used.has(node)&&node.parentNode===parent)node.remove();
 }
 function nextHas(next,node){return [...next.childNodes].some(n=>compatible(node,n));}
 function seed(node){if(node.nodeType!==1)return;if(node.tagName==='SELECT')sources.set(node,node.innerHTML);for(const select of node.querySelectorAll('select'))sources.set(select,select.innerHTML);}
 function update(root,html){const template=document.createElement('template');template.innerHTML=html;
  for(const e of template.content.querySelectorAll('.phasebar,.layout,.hope,.vote-stage,.dead-summary,.lobby-guide,.lobby-tabs'))e.dataset.uiKey=e.classList[0];
  for(const e of template.content.querySelectorAll('.card')){const title=e.querySelector('h3');if(title)e.dataset.uiKey=title.classList.contains('role')?'self-card':title.textContent;}
  children(root,template.content);
 }
 return {update};
})();

