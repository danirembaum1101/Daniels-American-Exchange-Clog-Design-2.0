(function(){
const PRICE=39.99, COMPARE=89.00;
const SIZES=['5','6','7','8','9','10','11','12'];
// Single colorway concept: all sizes available
const COLORS=[['Concept Colorway','',0,{5:1,6:1,7:1,8:1,9:1,10:1,11:1,12:1}]];
const LISTING=window.LISTING_IMAGES||[];
const VIEWS=['Main','Right','Top','Left','Heel','Sole','Pair','Detail'];
const uploads={}; // key -> objectURL
const $=id=>document.getElementById(id);
const money=n=>'$'+n.toFixed(2);
let galleryDragged=false, colorIdx=0, sizeVal='6', sizeChosen=false, slideIdx=0, pendingKey=null;
const cart=[]; let wish=false;

function toast(t){const el=$('toast');el.textContent=t;el.classList.add('show');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('show'),2200)}
const ICON='<svg><use href="#i-image"/></svg>';
function phHTML(key,label,big=true){
  if(uploads[key]) return `<img class="u" src="${uploads[key]}" alt=""><button type="button" class="replace" data-attach="${key}">Replace image</button>`;
  return `<div class="ph" data-drop="${key}">${ICON}<div class="t">ATTACH IMAGE HERE</div>${label?`<div class="s">${label}</div>`:''}<button type="button" class="attach" data-attach="${key}">Upload image</button></div>`;
}
function keyFor(c,i){return `p-${c}-${i}`}

/* ---------- Gallery ---------- */
function renderGallery(){
  const n=LISTING.length;
  $('slider').innerHTML=LISTING.map((im,i)=>`<div class="slide" data-i="${i}"><img class="u listing" src="${im.full}" alt="Product image ${i+1} of ${n}" draggable="false" ${i>1?'loading="lazy"':''}></div>`).join('');
  $('thumbsRow').innerHTML=LISTING.map((im,i)=>`<button type="button" class="thumb" data-i="${i}" aria-label="Show image ${i+1}"><img src="${im.thumb}" alt="" draggable="false"></button>`).join('');
  $('dots').innerHTML=Array.from({length:n},()=>'<span></span>').join('');
  if(slideIdx>=n) slideIdx=0;
  goTo(slideIdx,false);
}
function goTo(i,anim=true){
  const n=LISTING.length; slideIdx=(i+n)%n;
  const s=$('slider'); if(!anim) s.classList.add('dragging');
  s.style.transform=`translateX(${-slideIdx*100}%)`;
  if(!anim) requestAnimationFrame(()=>s.classList.remove('dragging'));
  document.querySelectorAll('.thumb').forEach((t,k)=>t.classList.toggle('active',k===slideIdx));
  document.querySelectorAll('#dots span').forEach((d,k)=>d.classList.toggle('on',k===slideIdx));
  const at=document.querySelector('.thumb.active'); if(at){const box=$('thumbs');const l=at.offsetLeft-box.clientWidth/2+at.offsetWidth/2;box.scrollTo({left:l,behavior:anim?'smooth':'auto'})}
}
$('thumbsRow').addEventListener('click',e=>{const t=e.target.closest('.thumb');if(t)goTo(+t.dataset.i)});
// drag / swipe
(function(){
  const box=$('mainPhotos'),s=$('slider');let x0=null,dx=0,w=1;
  box.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;x0=e.clientX;dx=0;w=box.clientWidth;s.classList.add('dragging');box.setPointerCapture(e.pointerId)});
  box.addEventListener('pointermove',e=>{if(x0===null)return;dx=e.clientX-x0;s.style.transform=`translateX(calc(${-slideIdx*100}% + ${dx}px))`});
  const end=()=>{if(x0===null)return;s.classList.remove('dragging');galleryDragged=Math.abs(dx)>5;const moved=Math.abs(dx)>w*0.15;x0=null;if(moved)goTo(slideIdx+(dx<0?1:-1));else{goTo(slideIdx);if(Math.abs(dx)<5)wasClick=true}};
  let wasClick=false;
  box.addEventListener('pointerup',end);box.addEventListener('pointercancel',end);
  document.addEventListener('keydown',e=>{if($('lightbox').classList.contains('open')){if(e.key==='Escape')closeLB();if(e.key==='ArrowRight')lbGo(1);if(e.key==='ArrowLeft')lbGo(-1);return}
    if(['INPUT','TEXTAREA'].includes(document.activeElement.tagName))return;
    if(e.key==='Escape'){closeDrawers();$('searchDrawer').classList.remove('open');$('chatPanel').classList.remove('open')}});
})();

/* ---------- Uploads ---------- */
document.addEventListener('click',e=>{const b=e.target.closest('[data-attach]');if(!b)return;e.stopPropagation();pendingKey=b.dataset.attach;$('fileInput').value='';$('fileInput').click()});
$('fileInput').addEventListener('change',e=>{const f=e.target.files[0];if(f&&pendingKey)setUpload(pendingKey,f)});
function setUpload(key,f){if(!f.type.startsWith('image/')){toast('Please choose an image file');return}
  if(uploads[key])URL.revokeObjectURL(uploads[key]);uploads[key]=URL.createObjectURL(f);
  if(key.startsWith('tc-'))renderTC();else{renderGallery();renderCart();if($('lightbox').classList.contains('open'))renderLB()}
  toast('Image attached')}
['dragenter','dragover'].forEach(ev=>document.addEventListener(ev,e=>{const d=e.target.closest('[data-drop],.tc-img[data-key]');if(d){e.preventDefault();const p=d.querySelector('.ph')||d;p.classList&&p.classList.add('drag')}}));
['dragleave','drop'].forEach(ev=>document.addEventListener(ev,e=>{document.querySelectorAll('.ph.drag').forEach(p=>p.classList.remove('drag'))}));
document.addEventListener('drop',e=>{const d=e.target.closest('.tc-img[data-key]');if(!d)return;e.preventDefault();const f=e.dataTransfer.files[0];if(!f)return;
  if(!d.dataset.key)return;setUpload(d.dataset.key,f)});
function renderTC(){document.querySelectorAll('.tc-img[data-key]').forEach((el,i)=>{el.innerHTML=phHTML(el.dataset.key,'Lifestyle image '+(i+1))})}

/* ---------- Lightbox ---------- */
let lbIdx=0;
function renderLB(){const n=LISTING.length;$('lbFrame').innerHTML=`<img src="${LISTING[lbIdx].full}" alt="Product image ${lbIdx+1} of ${n}">`;$('lbCount').textContent=`${lbIdx+1} / ${n}`}
function openLB(i){lbIdx=i;renderLB();$('lightbox').classList.add('open');document.body.style.overflow='hidden'}
function closeLB(){$('lightbox').classList.remove('open');document.body.style.overflow='';goTo(lbIdx)}
function lbGo(d){const n=LISTING.length;lbIdx=(lbIdx+d+n)%n;renderLB()}
$('zoomBtn').onclick=()=>openLB(slideIdx);$('lbClose').onclick=closeLB;$('lbPrev').onclick=()=>lbGo(-1);$('lbNext').onclick=()=>lbGo(1);
$('mainPhotos').addEventListener('click',e=>{if(e.target.closest('button')||galleryDragged)return;if(LISTING.length)openLB(slideIdx)});
$('mainPhotos').style.cursor='zoom-in';

/* ---------- Variants ---------- */
function avail(c,s){const v=COLORS[c][3][s];return v===1}
function renderColors(){}
function renderSizes(){
  $('sizeWrap').innerHTML='<legend class="visually-hidden">Size</legend>'+SIZES.map(s=>{
    const dis=!avail(colorIdx,s);
    return `<div class="variant-input"><input type="radio" name="Size" id="s${s}" value="${s}" ${sizeChosen&&s===sizeVal?'checked':''}><label for="s${s}" class="size-btn ${dis?'disabled-opt':''}">${s}</label></div>`}).join('');
  $('sizeLabel').textContent=sizeVal;
}
function updateState(){
  const ok=avail(colorIdx,sizeVal);
  const btn=$('addBtn');
  if(sizeChosen && !ok){btn.textContent='Sold Out';btn.disabled=true}else{btn.textContent='Add to cart';btn.disabled=false}
  $('selectMsg').style.display=sizeChosen?'none':'block';
  $('invLine').style.display=sizeChosen&&ok?'flex':'none';
  $('sku').textContent=`XXXXXX-001-${String(+sizeVal*10).padStart(3,'0')}`;
  $('payTerms').style.visibility=btn.disabled?'hidden':'visible';
}
$('sizeWrap').addEventListener('change',e=>{sizeVal=e.target.value;sizeChosen=true;renderColors();renderSizes();updateState()});
$('payTerms').querySelector('b').textContent=money(Math.round(PRICE/2*100)/100);

/* ---------- Cart ---------- */
function openDrawer(id){$(id).classList.add('open');$('overlay').classList.add('on');document.body.style.overflow='hidden'}
function closeDrawers(){document.querySelectorAll('.drawer').forEach(d=>d.classList.remove('open'));$('overlay').classList.remove('on');document.body.style.overflow=''}
$('overlay').onclick=closeDrawers;document.querySelectorAll('[data-close]').forEach(b=>b.onclick=closeDrawers);

$('menuBtn').onclick=()=>openDrawer('navDrawer');
$('productForm').addEventListener('submit',e=>{e.preventDefault();
  if(!sizeChosen){const m=$('selectMsg');m.style.display='block';m.animate([{transform:'translateX(0)'},{transform:'translateX(-6px)'},{transform:'translateX(6px)'},{transform:'translateX(0)'}],{duration:300});$('sizeWrap').scrollIntoView({behavior:'smooth',block:'center'});return}
  if(!avail(colorIdx,sizeVal))return;
  const btn=$('addBtn');btn.classList.add('adding');btn.textContent='Adding…';
  setTimeout(()=>{btn.classList.remove('adding');btn.textContent='Add to cart';
    const ex=cart.find(it=>it.c===colorIdx&&it.s===sizeVal);if(ex)ex.q++;else cart.push({c:colorIdx,s:sizeVal,q:1});
    renderCart();btn.textContent='Added to cart';setTimeout(()=>{btn.textContent='Add to cart'},1500)},450)});
function renderCart(){
  const count=cart.reduce((a,b)=>a+b.q,0),sub=cart.reduce((a,b)=>a+b.q*PRICE,0);
  $('cartCount').textContent=count;$('cartCount').classList.toggle('show',count>0);
  $('cartFooter').style.display=count?'block':'none';
  if(!count){$('cartBody').innerHTML='<div class="cart-empty">Your cart is currently empty.</div>';return}
  $('cartBody').innerHTML=cart.map((it,i)=>{return `<div class="cart-item">
    <div class="cart-item__img">${LISTING[0]?`<img src="${LISTING[0].thumb}" alt="">`:''}</div>
    <div><div class="cart-item__name">Omnis Removable Inner Sock Clog</div><div class="cart-item__variant">Size ${it.s}</div>
      <div class="qty"><button data-q="${i}" data-d="-1" aria-label="Decrease">−</button><span>${it.q}</span><button data-q="${i}" data-d="1" aria-label="Increase">+</button></div>
      <button class="cart-item__remove" data-rm="${i}">Remove</button></div>
    <div class="cart-item__price"><s>${money(COMPARE*it.q)}</s><span class="on-sale">${money(PRICE*it.q)}</span></div></div>`}).join('');
  $('subtotal').textContent=money(sub);
  const left=60-sub;$('shipText').innerHTML=left>0?`You're <b>${money(left)}</b> away from free shipping!`:'You qualify for <b>free shipping!</b>';
  $('shipFill').style.width=Math.min(100,sub/60*100)+'%';
}
$('cartBody').addEventListener('click',e=>{const q=e.target.closest('[data-q]'),r=e.target.closest('[data-rm]');
  if(q){const it=cart[+q.dataset.q];it.q+=+q.dataset.d;if(it.q<1)cart.splice(+q.dataset.q,1);renderCart()}
  if(r){cart.splice(+r.dataset.rm,1);renderCart()}});
$('checkoutBtn').onclick=()=>toast('Checkout is disabled in this preview');

/* ---------- Wishlist ---------- */
$('wishBtn').onclick=()=>{wish=!wish;$('wishBtn').classList.toggle('on',wish);$('wishBtn').querySelector('span').textContent=wish?'Added to Wishlist':'Add to Wishlist';toast(wish?'Added to wishlist':'Removed from wishlist')};
$('hdrWish').onclick=()=>toast(wish?'1 item in your wishlist':'Your wishlist is empty');
$('payInfo').onclick=()=>toast('Pay in installments at checkout');

/* ---------- Feature set lightbox ---------- */
(function(){
  const panels=[...document.querySelectorAll('.feature-zoom')];if(!panels.length)return;
  const lb=document.createElement('div');lb.className='feat-lb';lb.setAttribute('role','dialog');lb.setAttribute('aria-label','Feature set image');
  lb.innerHTML='<div class="feat-lb__bar"><span id="fCount"></span><div class="btns"><button class="lb-btn" id="fPrev" aria-label="Previous"><svg class="icon" style="width:20px;height:20px"><use href="#i-arrow"/></svg></button><button class="lb-btn" id="fNext" aria-label="Next"><svg class="icon" style="width:20px;height:20px;transform:scaleX(-1)"><use href="#i-arrow"/></svg></button><button class="lb-btn" id="fClose" aria-label="Close"><svg class="icon"><use href="#i-x"/></svg></button></div></div><div class="feat-lb__scroll" id="fScroll"><img id="fImg" alt=""></div><div class="feat-lb__hint">Swipe sideways to read the full panel · Rotate your phone for a wider view</div>';
  document.body.appendChild(lb);
  let idx=0;const img=lb.querySelector('#fImg');
  function show(i){idx=(i+panels.length)%panels.length;const src=panels[idx].querySelector('img');img.src=src.dataset.hi||src.src;img.alt=src.alt;lb.querySelector('#fCount').textContent=(idx+1)+' / '+panels.length;$('fScroll').scrollLeft=0}
  function open(i){show(i);lb.classList.add('open');document.body.style.overflow='hidden';lb.querySelector('#fClose').focus()}
  function close(){lb.classList.remove('open');document.body.style.overflow='';panels[idx].focus()}
  panels.forEach((b,i)=>b.addEventListener('click',()=>open(i)));
  // Serve the 2400px version only where the panel is shown wider than ~1250 device pixels (desktop / retina); phones keep the lighter 1200px file.
  function upgrade(){panels.forEach(b=>{const im=b.querySelector('img');if(im.dataset.hi&&!im.dataset.up&&im.clientWidth*(window.devicePixelRatio||1)>1250){im.dataset.up=1;const hi=new Image();hi.decoding='async';hi.src=im.dataset.hi;hi.decode().then(()=>{im.src=hi.src}).catch(()=>{im.src=hi.src})}})}
  if('IntersectionObserver' in window){const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)upgrade()}),{rootMargin:'400px'});panels.forEach(b=>io.observe(b))}else upgrade();
  window.addEventListener('resize',upgrade,{passive:true});
  lb.querySelector('#fClose').onclick=close;lb.querySelector('#fPrev').onclick=()=>show(idx-1);lb.querySelector('#fNext').onclick=()=>show(idx+1);
  document.addEventListener('keydown',e=>{if(!lb.classList.contains('open'))return;if(e.key==='Escape')close();if(e.key==='ArrowRight')show(idx+1);if(e.key==='ArrowLeft')show(idx-1)});
})();

/* ---------- Search ---------- */

$('searchClose').onclick=()=>{$('searchDrawer').classList.remove('open');$('searchNote').style.display='none'};
$('searchInput').oninput=e=>$('searchNote').style.display=e.target.value?'block':'none';
$('searchForm').onsubmit=e=>{e.preventDefault();$('searchNote').style.display='block'};

/* ---------- Newsletter ---------- */
$('newsForm').onsubmit=e=>{e.preventDefault();const v=$('newsEmail').value.trim(),m=$('newsMsg');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)){m.textContent='Please enter a valid email address.';m.className='news-msg err';return}
  m.textContent='Thanks for subscribing!';m.className='news-msg';$('newsEmail').value=''};

/* ---------- Chat ---------- */
$('chatBtn').onclick=()=>$('chatPanel').classList.toggle('open');
$('chatForm').onsubmit=e=>{e.preventDefault();const v=$('chatInput').value.trim();if(!v)return;const b=$('chatBody');
  b.insertAdjacentHTML('beforeend',`<div class="chat-msg me"></div><div style="clear:both"></div>`);b.querySelector('.chat-msg.me:last-of-type').textContent=v;$('chatInput').value='';
  setTimeout(()=>{b.insertAdjacentHTML('beforeend','<div class="chat-msg">Thanks! A team member will be with you shortly.</div>');b.scrollTop=b.scrollHeight},700)};

/* ---------- Megamenu position ---------- */
function placeMega(){const h=document.querySelector('.site-header').getBoundingClientRect();document.querySelectorAll('.megamenu').forEach(m=>m.style.top=h.bottom+'px')}
window.addEventListener('scroll',placeMega,{passive:true});window.addEventListener('resize',placeMega);

renderColors();renderSizes();renderGallery();renderTC();renderCart();updateState();placeMega();
})();
