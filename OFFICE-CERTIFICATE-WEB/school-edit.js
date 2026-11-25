/* Office Certificate App - editable school details for all certificates
   (Bonafide CSV, Bonafide Excel, Conduct & Attendance). Saved on this computer. */
(function(){
  var KEY='oc_school_details';
  var DEFAULTS={code:'33250800405',name:'GOVERNMENT HIGHER SECONDARY SCHOOL',place:'PANNAIPURAM',pincode:'625524',
                taluk:'UTHAMAPALAYAM',district:'THENI',email:'hss1603007@gmail.com',street:'GHSS, Kombai Main Road'};
  var FIELDS=[['code','School Code'],['name','School Name'],['place','School Place'],['pincode','Pincode'],
              ['taluk','Taluk'],['district','District Name'],['email','Email ID (page bottom)'],['street','Bottom address line (street / short name)']];

  function load(){
    var d={},k,saved={};
    try{saved=JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch(e){}
    for(k in DEFAULTS)d[k]=(saved[k]!==undefined)?saved[k]:DEFAULTS[k];
    return d;
  }
  function save(d){try{localStorage.setItem(KEY,JSON.stringify(d));}catch(e){}}
  function up(s){return (s||'').toUpperCase();}
  function title(s){return (s||'').toLowerCase().replace(/\b[a-z]/g,function(c){return c.toUpperCase();});}
  function plPin(d){return (d.place&&d.pincode)?d.place+' - '+d.pincode:(d.place||d.pincode||'');}

  function setLines(el,lines){
    el.textContent='';
    lines.forEach(function(t,i){if(i)el.appendChild(document.createElement('br'));el.appendChild(document.createTextNode(t));});
  }
  function each(sel,fn){Array.prototype.forEach.call(document.querySelectorAll(sel),fn);}

  function apply(){
    var d=load();
    var place=up(d.place),pin=d.pincode;
    var line5a=up(plPin({place:d.place,pincode:d.pincode}));
    var line5b='TALUK: '+up(d.taluk)+' | DISTRICT: '+up(d.district);
    var sigPlace=title(d.place)+(pin?' - '+pin:'');
    // Bonafide header
    each('.bonafide-wrapper .line3',function(e){e.textContent='SCHOOL CODE: '+d.code;});
    each('.bonafide-wrapper .line4',function(e){e.textContent=up(d.name);});
    each('.bonafide-wrapper .line5',function(e,i){e.textContent=(i%2===0)?line5a:line5b;});
    // Bonafide bottom
    each('.bonafide-wrapper .hm-sig',function(e){
      setLines(e,['Headmaster',title(d.name)+',',sigPlace+',',title(d.district)+' District.']);});
    each('.bonafide-wrapper .print-footer',function(e){
      setLines(e,['Email: '+d.email,(d.street?d.street+', ':'')+title(d.place)+(pin?' - '+pin:'')+'.']);});
    // Conduct & Attendance header
    each('.m3-school-code',function(e){e.textContent='SCHOOL CODE: '+d.code;});
    each('.m3-school-name',function(e){e.textContent=up(d.name);});
    each('.m3-header-text .m3-address',function(e,i){e.textContent=(i%2===0)?line5a:line5b;});
    // Conduct & Attendance bottom
    each('.signature-block--headmaster',function(e){
      setLines(e,['Headmaster',title(d.name),sigPlace,title(d.district)]);});
  }

  /* ---------- editor dialog ---------- */
  var overlay;
  function build(){
    overlay=document.createElement('div');
    overlay.className='se-overlay';overlay.hidden=true;
    var html='<div class="se-dialog" role="dialog" aria-modal="true" aria-labelledby="se-title">'+
      '<h3 id="se-title">Edit School Details</h3>'+
      '<p class="se-sub">These details appear at the top and bottom of every certificate. They are saved on this computer.</p>'+
      '<div class="se-grid">';
    FIELDS.forEach(function(f){
      html+='<label class="se-field'+(f[0]==='name'||f[0]==='street'?' se-wide':'')+'"><span>'+f[1]+'</span>'+
            '<input type="text" id="se-'+f[0]+'"'+(f[0]==='pincode'?' inputmode="numeric" maxlength="6"':'')+'></label>';
    });
    html+='</div><div class="se-actions"><button type="button" class="se-btn se-ghost" id="se-reset">Reset</button>'+
      '<span class="se-spacer"></span><button type="button" class="se-btn se-ghost" id="se-cancel">Cancel</button>'+
      '<button type="button" class="se-btn se-primary" id="se-save">Save</button></div></div>';
    overlay.innerHTML=html;
    document.body.appendChild(overlay);
    overlay.addEventListener('mousedown',function(e){if(e.target===overlay)close();});
    document.getElementById('se-cancel').onclick=close;
    document.getElementById('se-save').onclick=function(){
      var d={};FIELDS.forEach(function(f){d[f[0]]=document.getElementById('se-'+f[0]).value.trim();});
      save(d);apply();close();
    };
    document.getElementById('se-reset').onclick=function(){
      try{localStorage.removeItem(KEY);}catch(e){}
      fill(DEFAULTS);apply();
    };
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!overlay.hidden)close();});
  }
  function fill(d){FIELDS.forEach(function(f){document.getElementById('se-'+f[0]).value=d[f[0]];});}
  function open(){if(!overlay)build();fill(load());overlay.hidden=false;document.getElementById('se-code').focus();}
  function close(){overlay.hidden=true;}
  window.openSchoolEdit=open;

  /* ---------- buttons + click-to-edit ---------- */
  function addButtons(){
    each('.action-row, .conduct-toolbar__row',function(row){
      if(row.querySelector('.se-open'))return;
      var b=document.createElement('button');
      b.type='button';b.className='action-btn theme-neutral se-open';b.textContent='Edit School Details';
      b.onclick=open;
      var exit=row.querySelector('.ml-auto');
      row.insertBefore(b,exit||null);
    });
    each('.bonafide-wrapper header .header-text,.bonafide-wrapper .hm-sig,.bonafide-wrapper .print-footer,'+
         '.m3-header-text,.signature-block--headmaster',function(e){
      e.classList.add('se-click');e.title='Click to edit school details';e.addEventListener('click',open);
    });
  }

  function wrap(name){
    var f=window[name];
    if(typeof f!=='function')return;
    window[name]=function(){var r=f.apply(this,arguments);setTimeout(apply,0);return r;};
  }

  document.addEventListener('DOMContentLoaded',function(){addButtons();apply();});
  if(document.readyState!=='loading'){addButtons();apply();}
  wrap('switchModule');wrap('handleMasterLogin');
})();
