'use strict';
// Vector effects share the presentation's canvas and animation lifecycle.
// Nothing runs outside the bounded transition frame loop in app.js.
window.createGujiuTransitions = (ctx, { randomSource, getPaper }) => {
  const clamp = value => Math.max(0, Math.min(1, value));
  const ease = value => value * value * (3 - 2 * value);
  const score = [
    ['stamp','朱印落纸'], ['vermilion','印泥漫开'], ['scroll','画卷舒展'], ['moon','月洞入境'],
    ['vortex','杯中旋流'], ['ink','浓墨破境'], ['mist','山岚过隙'], ['page','古籍翻页'],
    ['grain','谷粒归仓'], ['tear','残页裂隙'], ['data','墨字成数'], ['weave','经纬织合'],
    ['rubbing','证据拓印'], ['ripple','酒波漾开'], ['petals','花影归庭'], ['bamboo','简册合卷']
  ];
  function prepare(effect, width, height, seed) {
    const random = randomSource(seed);
    const particles = Array.from({length:90}, () => ({x:random(),y:random(),phase:random()*Math.PI*2,size:random()}));
    let rubbing = null;
    if(effect === 'rubbing') {
      rubbing = document.createElement('canvas'); rubbing.width=width; rubbing.height=height;
      const ink=rubbing.getContext('2d'); ink.fillStyle='#29352e';ink.fillRect(0,0,width,height);
      ink.fillStyle='#d3cfb9';ink.textAlign='center';ink.textBaseline='middle';
      ink.font=`${height*.65}px "KaiTi", "SimSun", serif`;ink.fillText('证',width*.5,height*.5);
      ink.font=`${Math.max(14,width*.017)}px "SimSun", serif`;
      const text='文献有据推断有界实验可验体验难返';
      for(let col=0;col<6;col++) for(let row=0;row<8;row++) {
        ink.globalAlpha=.28;ink.fillText(text[(col*8+row)%text.length],width*(.08+col*.166),height*(.12+row*.11));
      }
      ink.globalAlpha=1;
      for(let n=0;n<4000;n++){ink.fillStyle=random()>.5?'#d3cfb922':'#15251d44';ink.fillRect(random()*width,random()*height,random()*2+1,1);}
    }
    return {particles,rubbing};
  }
  function paper() { ctx.fillStyle=getPaper(); }
  function circlePath(x,y,r) {ctx.beginPath();ctx.arc(x,y,Math.max(0,r),0,Math.PI*2);}

  function stamp(c,w,h) {
    ctx.globalAlpha=clamp((c-.28)/.72);paper();ctx.fillRect(0,0,w,h);ctx.globalAlpha=1;
    if(c<=0)return;
    ctx.save();ctx.translate(w*.5,h*.5);ctx.rotate(-.16);const scale=2.7-1.7*ease(c);ctx.scale(scale,scale);
    ctx.globalAlpha=clamp(c*3);const size=Math.min(w,h)*.43;
    ctx.strokeStyle='#ae3525';ctx.lineWidth=7;ctx.strokeRect(-size/2,-size/2,size,size);
    ctx.lineWidth=2;ctx.strokeRect(-size/2+12,-size/2+12,size-24,size-24);
    ctx.fillStyle='#ae3525';ctx.font=`bold ${size*.79}px "KaiTi", "SimSun", serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('酒',0,0);ctx.restore();
  }
  function moon(c,w,h) {
    const x=w*.5,y=h*.53,r=Math.hypot(w,h)*.62*(1-ease(c));
    paper();ctx.beginPath();ctx.rect(-1,-1,w+2,h+2);ctx.moveTo(x+r,y);ctx.arc(x,y,r,0,Math.PI*2);ctx.fill('evenodd');
    if(c>.015&&c<.995){
      const rim=ctx.createLinearGradient(x-r,0,x+r,0);rim.addColorStop(0,'#59634c');rim.addColorStop(.5,'#a6a588');rim.addColorStop(1,'#56634f');
      ctx.strokeStyle=rim;ctx.lineWidth=Math.max(4,Math.min(22,r*.06));circlePath(x,y,r);ctx.stroke();
      ctx.strokeStyle='#dfd4b6';ctx.lineWidth=1;circlePath(x,y,r+8);ctx.stroke();
    }
  }
  function vortex(c,w,h) {
    if(c<=0)return;
    const x=w*.55,y=h*.52,limit=Math.hypot(w,h)*1.18;
    ctx.fillStyle='#665039';circlePath(x,y,limit*c*c);ctx.fill();
    const colors=['#584c37','#89714a','#b49b68'];
    for(let strand=0;strand<3;strand++){
      ctx.beginPath();
      for(let i=0;i<=150;i++){
        const t=i/150,angle=t*Math.PI*5+c*5+strand*2.1;
        const radius=(1-t)*limit*c;
        const px=x+Math.cos(angle)*radius,py=y+Math.sin(angle)*radius*.8;
        if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
      }
      ctx.strokeStyle=colors[strand];ctx.lineWidth=Math.max(1,limit*c*.05);ctx.lineCap='round';ctx.stroke();
    }
  }
  function mist(c,w,h,particles,direction) {
    if(c<=0)return;
    // Opaque mist only settles after the moving cloud banks have arrived.
    ctx.globalAlpha=clamp((c-.58)/.42);ctx.fillStyle='#dedfce';ctx.fillRect(0,0,w,h);ctx.globalAlpha=1;
    for(const p of particles){
      const x=(p.x-1+c*2.5)*w*(direction>0?1:-1)+(direction>0?0:w);
      const y=p.y*h+Math.sin(c*4+p.phase)*h*.035;
      const r=(.07+p.size*.13)*w;
      const fog=ctx.createRadialGradient(x,y,0,x,y,r);fog.addColorStop(0,'#d7ddcbd9');fog.addColorStop(.55,'#dce0ce99');fog.addColorStop(1,'#e5e5d700');
      ctx.fillStyle=fog;ctx.save();ctx.translate(x,y);ctx.scale(1,.48);circlePath(0,0,r);ctx.fill();ctx.restore();
    }
  }
  function page(c,w,h,direction) {
    if(c<=0)return;
    const d=(w+h+6)*ease(c);
    ctx.save();if(direction<0){ctx.translate(w,0);ctx.scale(-1,1);}
    paper();ctx.beginPath();ctx.moveTo(-2,-2);ctx.lineTo(d,-2);ctx.lineTo(-2,d);ctx.closePath();ctx.fill();
    ctx.save();ctx.beginPath();ctx.moveTo(-2,-2);ctx.lineTo(d,-2);ctx.lineTo(-2,d);ctx.closePath();ctx.clip();
    const curl=ctx.createLinearGradient(d-60,0,d,0);curl.addColorStop(0,'#c0ac8000');curl.addColorStop(.65,'#af986880');curl.addColorStop(1,'#f7edcf');
    ctx.fillStyle=curl;ctx.beginPath();ctx.moveTo(d-70,0);ctx.lineTo(d,0);ctx.lineTo(0,d);ctx.lineTo(0,d-70);ctx.closePath();ctx.fill();
    ctx.fillStyle='#796c4c44';ctx.font=`${Math.max(12,w*.018)}px "SimSun", serif`;ctx.textAlign='left';
    for(let row=1;row<9;row++)ctx.fillText('古籍有迹　酿造有法　循文寻酒',w*.12,h*row*.11);
    ctx.restore();ctx.restore();
  }
  function grain(c,w,h,particles) {
    if(c<=0)return;
    const size=Math.max(28,w/32),local=ease(c);
    let n=0;
    for(let y=size/2;y<h+size;y+=size)for(let x=size/2;x<w+size;x+=size){
      const p=particles[n++%particles.length],shift=(1-local)*w*.5;
      ctx.save();ctx.translate(x+Math.sin(p.phase)*shift,y-Math.abs(Math.cos(p.phase))*shift);ctx.rotate((1-local)*p.phase+.22);
      ctx.fillStyle=p.size>.5?'#ddcda4':'#c9b98d';ctx.beginPath();ctx.ellipse(0,0,size*1.5*local,size*.9*local,0,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#8c805833';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(-size*.6*local,0);ctx.quadraticCurveTo(0,size*.12*local,size*.6*local,0);ctx.stroke();ctx.restore();
    }
  }
  function tear(c,w,h) {
    if(c<=0)return;
    const reach=(h*.5+3)*ease(c),ragged=Math.sin(c*Math.PI)*19;
    for(const side of [-1,1]){
      ctx.save();if(side>0){ctx.translate(0,h);ctx.scale(1,-1);}
      paper();ctx.beginPath();ctx.moveTo(-2,-2);ctx.lineTo(w+2,-2);ctx.lineTo(w+2,reach);
      for(let x=w;x>=-12;x-=12)ctx.lineTo(x,reach+ragged*(Math.sin(x*.047)+Math.sin(x*.129)*.45));
      ctx.closePath();ctx.fill();ctx.strokeStyle='#8d7c593d';ctx.lineWidth=1;ctx.stroke();
      ctx.strokeStyle='#fbf2d6aa';
      for(let x=0;x<w;x+=17){const yy=reach+ragged*(Math.sin(x*.047)+Math.sin(x*.129)*.45);ctx.beginPath();ctx.moveTo(x,yy-2);ctx.lineTo(x+5,yy+7);ctx.stroke();}
      ctx.restore();
    }
  }
  function weave(c,w,h) {
    if(c<=0)return;
    const size=Math.max(24,w/34),thickness=size*ease(c);
    for(let x=0;x<w+size;x+=size){
      ctx.fillStyle=Math.round(x/size)%2?'#62735c':'#53664f';ctx.fillRect(x+(size-thickness)/2,-1,thickness+1,h+2);
      ctx.strokeStyle='#b8b58b66';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x+size*.5,0);ctx.lineTo(x+size*.5,h);ctx.stroke();
    }
    for(let y=0;y<h+size;y+=size){
      ctx.fillStyle=Math.round(y/size)%2?'#7f8863':'#8b906d';ctx.fillRect(-1,y+(size-thickness)/2,w+2,thickness*.52);
      for(let x=0;x<w;x+=size*2){ctx.fillStyle='#596b52';ctx.fillRect(x,y+(size-thickness)/2,thickness,thickness*.52);}
    }
  }
  function rubbing(c,w,h,source) {
    if(c<=0)return;
    const step=Math.max(36,w/25);
    ctx.save();ctx.beginPath();
    for(let y=step/2;y<h+step;y+=step)for(let x=step/2;x<w+step;x+=step){
      const delay=(x/w)*.35+(Math.sin(y*.03)+1)*.07;
      const local=clamp((c-delay)/(1-delay));const r=step*local;
      ctx.moveTo(x+r,y);ctx.arc(x,y,r,0,Math.PI*2);
    }
    ctx.clip();ctx.drawImage(source,0,0);ctx.restore();
  }
  function petals(c,w,h) {
    if(c<=0)return;
    const x=w*.66,y=h*.48,limit=Math.hypot(w,h)*1.15,r=limit*ease(c);
    const colors=['#c38c75','#d0a18b','#b97c68','#d4b09a'];
    for(let n=0;n<11;n++){
      const a=n/11*Math.PI*2+c*.3;
      ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.fillStyle=colors[n%4];ctx.beginPath();ctx.moveTo(0,0);
      ctx.bezierCurveTo(r*.3,-r*.3,r*.9,-r*.35,r,0);ctx.bezierCurveTo(r*.9,r*.35,r*.3,r*.3,0,0);ctx.fill();ctx.restore();
    }
    ctx.fillStyle='#c2947e';circlePath(x,y,limit*c*c);ctx.fill();
    ctx.fillStyle='#b78068';for(let n=0;n<9;n++){const a=n/9*Math.PI*2;circlePath(x+Math.cos(a)*r*.12,y+Math.sin(a)*r*.12,Math.max(1,r*.012));ctx.fill();}
  }
  function bamboo(c,w,h) {
    if(c<=0)return;
    const count=22,size=w/count;
    for(let n=0;n<count;n++){
      const delay=(n/count)*.24,local=clamp((c-delay)/(1-delay));if(!local)continue;
      const reach=(h+3)*ease(local),top=n%2?-2:h-reach;
      const shade=ctx.createLinearGradient(n*size,0,(n+1)*size,0);shade.addColorStop(0,'#806b43');shade.addColorStop(.18,'#baaa7c');shade.addColorStop(.7,'#c8b58a');shade.addColorStop(1,'#968056');
      ctx.fillStyle=shade;ctx.fillRect(n*size-.5,top,size+1,reach+2);
      ctx.strokeStyle='#655b3d66';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(n*size+size*.14,top);ctx.lineTo(n*size+size*.14,top+reach);ctx.stroke();
      ctx.fillStyle='#776540';for(const y of [h*.2,h*.8])if(y>=top&&y<=top+reach)ctx.fillRect(n*size,y,size,3);
    }
  }
  const renderers={stamp,moon,vortex,mist,page,grain,tear,weave,rubbing,petals,bamboo};
  function render(effect,c,w,h,direction,prepared) {
    if(effect==='mist')mist(c,w,h,prepared.particles,direction);
    else if(effect==='page')page(c,w,h,direction);
    else if(effect==='grain')grain(c,w,h,prepared.particles);
    else if(effect==='rubbing')rubbing(c,w,h,prepared.rubbing);
    else renderers[effect]?.(c,w,h);
    ctx.save();ctx.globalCompositeOperation='source-atop';ctx.globalAlpha=.11;paper();ctx.fillRect(0,0,w,h);ctx.restore();
  }
  return {score,prepare,render};
};
