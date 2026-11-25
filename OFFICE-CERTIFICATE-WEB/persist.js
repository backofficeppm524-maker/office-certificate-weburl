/* Office Certificate App - permanent data storage
   Keeps the opened CSV / Excel data and the imported Conduct & Attendance data on this
   computer (browser database), and loads it automatically after every login.
   Opening or importing a file again replaces the saved copy.  Loads after script.js. */
(function(){
  if(window.__ocPersist)return;window.__ocPersist=true; // run only once
  var DB='office_certificate_app',STORE='files';
  var NAMES={c1:'CSV file',c2:'Excel file',c3:'Excel import'};
  var lastName={c3:''};

  /* ---------- IndexedDB helpers ---------- */
  function open(){
    return new Promise(function(res,rej){
      var r=indexedDB.open(DB,1);
      r.onupgradeneeded=function(){r.result.createObjectStore(STORE,{keyPath:'key'});};
      r.onsuccess=function(){res(r.result);};r.onerror=function(){rej(r.error);};
    });
  }
  function tx(mode,fn){
    return open().then(function(db){
      return new Promise(function(res,rej){
        var t=db.transaction(STORE,mode),s=t.objectStore(STORE),q=fn(s);
        t.oncomplete=function(){res(q&&q.result);};t.onerror=t.onabort=function(){rej(t.error);};
      });
    });
  }
  function dbGet(key){return tx('readonly',function(s){return s.get(key);});}
  function dbDel(key){return tx('readwrite',function(s){return s.delete(key);});}
  function dbPut(rec){
    return tx('readwrite',function(s){return s.put(rec);}).catch(function(){
      if(rec.handle){var c={};for(var k in rec)if(k!=='handle')c[k]=rec[k];return tx('readwrite',function(s){return s.put(c);});}
    });
  }

  /* ---------- note bar under each module's toolbar ---------- */
  var css='.pz-note{display:none;align-items:center;gap:10px;flex-wrap:wrap;margin:12px 0 0;padding:10px 14px;border-radius:10px;'+
    'background:#e8f6ef;border:1px solid #b9e2cd;color:#17513a;font:13.5px "Segoe UI",system-ui,sans-serif}'+
    '.pz-note.on{display:flex}.pz-note::before{content:"";width:9px;height:9px;border-radius:50%;background:#1f9d6b;flex:none}'+
    '.pz-note span{flex:1;min-width:200px}.pz-note button{border:1px solid #9fd3bb;background:#fff;color:#17513a;border-radius:8px;padding:6px 12px;font:600 12.5px "Segoe UI",system-ui,sans-serif;cursor:pointer}'+
    '.pz-note button:hover{background:#f3fbf7}@media print{.pz-note{display:none!important}}';
  var notes={};
  function ensureNote(key){
    if(notes[key])return notes[key];
    var host=key==='c1'?document.querySelector('#module-csv .command-panel__body'):
             key==='c2'?document.querySelector('#module-excel .command-panel__body'):
             document.querySelector('#module-conduct .conduct-toolbar');
    if(!host)return null;
    var n=document.createElement('div');n.className='pz-note';
    n.innerHTML='<span></span><button type="button">Remove saved data</button>';
    n.querySelector('button').onclick=function(){removeSaved(key);};
    if(key==='c3')host.parentNode.insertBefore(n,host.nextSibling);else host.appendChild(n);
    notes[key]=n;return n;
  }
  function when(iso){
    try{return new Date(iso).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});}catch(e){return '';}
  }
  function showNote(key,rec){
    var n=ensureNote(key);if(!n)return;
    n.querySelector('span').textContent='Saved permanently in the '+(native?'database':'storage')+' on this computer: '+(rec.name||NAMES[key])+
      ' \u00B7 '+rec.data.length+' records \u00B7 '+when(rec.savedAt)+'. It loads automatically after every login.';
    n.classList.add('on');
  }

  /* ---------- save / restore ---------- */
  var native=window.officeDB; // SQLite bridge inside the installed app (undefined in a normal browser)
  function persist(key,data,name,handle){
    var savedAt=new Date().toISOString();
    var rec={key:key,data:data,name:name||'',savedAt:savedAt};
    if(handle)rec.handle=handle;
    var p;
    if(native){
      // data goes to the SQLite file; the browser store only keeps the file handle
      p=native.save(key,{data:data,name:name||'',savedAt:savedAt}).then(function(){
        var h={key:key,data:[],name:name||'',savedAt:savedAt};if(handle)h.handle=handle;return dbPut(h);
      }).catch(function(e){
        alert('Could not save to the database: '+(e&&e.message?e.message:e));
        return dbPut(rec);
      });
    }else p=dbPut(rec);
    return p.then(function(){showNote(key,rec);}).catch(function(){});
  }
  function loadRec(key){
    return Promise.all([native?native.load(key).catch(function(){return null;}):null,dbGet(key).catch(function(){return null;})])
      .then(function(r){
        var n=r[0],i=r[1];
        if(n&&n.data&&n.data.length){n.key=key;if(i&&i.handle)n.handle=i.handle;return n;}
        return i;
      });
  }
  function restore(){
    ['c1','c2','c3'].forEach(function(key){
      loadRec(key).then(function(rec){
        if(!rec||!rec.data||!rec.data.length)return;
        if(key==='c1'&&c1_db.length===0){
          c1_db=rec.data;if(rec.handle)c1_fileHandle=rec.handle;
          setText('c1_db-status','Loaded '+c1_db.length+' saved records'+(rec.name?' from '+rec.name:''));
        }else if(key==='c2'&&c2_db.length===0){
          c2_db=rec.data;if(rec.handle)c2_fileHandle=rec.handle;
          var st=document.getElementById('c2_file-status');
          if(st){st.textContent='Saved data: '+(rec.name||'Excel file');st.classList.remove('command-status--muted');}
        }else if(key==='c3'&&c3_db.length===0){
          c3_db=rec.data;
        }else return;
        showNote(key,rec);
      }).catch(function(){});
    });
  }
  function removeSaved(key){
    var n=notes[key],btn=n&&n.querySelector('button');
    // first click asks for confirmation inside the page (no pop-up window), second click removes
    if(btn&&!btn.getAttribute('data-armed')){
      btn.setAttribute('data-armed','1');btn.textContent='Click again to confirm';
      setTimeout(function(){btn.removeAttribute('data-armed');btn.textContent='Remove saved data';},4000);
      return;
    }
    if(btn){btn.removeAttribute('data-armed');btn.textContent='Remove saved data';}
    if(n)n.classList.remove('on');                      // hide the message straight away
    try{
      if(key==='c1'){c1_db=[];c1_fileHandle=null;setText('c1_db-status','System Ready.');c1_clearForm();}
      if(key==='c2'){c2_db=[];c2_fileHandle=null;var st=document.getElementById('c2_file-status');
        if(st){st.textContent='Not Connected';st.classList.add('command-status--muted');}c2_clearForm();}
      if(key==='c3'){c3_db=[];c3_clearAll();}
    }catch(e){}
    try{dbDel(key).catch(function(){});}catch(e){}
    try{if(native)native.remove(key).catch(function(){});}catch(e){}
  }

  /* ---------- hook the existing functions (script.js is not edited) ---------- */
  function wrap(name,fn){
    var orig=window[name];if(typeof orig!=='function')return;
    window[name]=function(){
      var self=this,args=arguments;
      return fn.call(self,function(){return orig.apply(self,args);},args);
    };
  }
  function allowWrite(handle){
    if(!handle||!handle.queryPermission)return Promise.resolve();
    var o={mode:'readwrite'};
    return handle.queryPermission(o).then(function(p){
      return p==='granted'?p:handle.requestPermission(o);
    }).catch(function(){});
  }

  // Bonafide - CSV
  wrap('c1_openFile',function(call){
    var before=c1_db;
    return Promise.resolve(call()).then(function(){
      if(c1_db!==before&&c1_db.length)persist('c1',c1_db,c1_fileHandle&&c1_fileHandle.name,c1_fileHandle);
    });
  });
  wrap('c1_saveFile',function(call){
    return allowWrite(c1_fileHandle).then(call).then(function(){
      if(c1_db.length)persist('c1',c1_db,c1_fileHandle&&c1_fileHandle.name,c1_fileHandle);
    });
  });
  wrap('c1_saveFileAs',function(call){
    return Promise.resolve(call()).then(function(){
      if(c1_db.length)persist('c1',c1_db,c1_fileHandle&&c1_fileHandle.name,c1_fileHandle);
    });
  });
  // Bonafide - Excel
  wrap('c2_openDatabase',function(call){
    var before=c2_db;
    return Promise.resolve(call()).then(function(){
      if(c2_db!==before&&c2_db.length)persist('c2',c2_db,c2_fileHandle&&c2_fileHandle.name,c2_fileHandle);
    });
  });
  wrap('c2_saveToDisk',function(call){
    return Promise.resolve(call()).then(function(){
      if(c2_db.length)persist('c2',c2_db,c2_fileHandle&&c2_fileHandle.name,c2_fileHandle);
    });
  });
  // Conduct & Attendance - Excel import
  wrap('c3_handleExcelUpload',function(call,args){
    var f=args[0]&&args[0].target&&args[0].target.files&&args[0].target.files[0];
    lastName.c3=f?f.name:'';
    return call();
  });
  wrap('c3_processData',function(call){
    var before=c3_db,r=call();
    if(c3_db!==before&&c3_db.length)persist('c3',c3_db,lastName.c3);
    return r;
  });

  function start(){
    var s=document.createElement('style');s.textContent=css;document.head.appendChild(s);
    ['c1','c2','c3'].forEach(ensureNote);
    try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist();}catch(e){}
    if(window.indexedDB)restore();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();