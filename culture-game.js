'use strict';
(() => {
  const entries = {
    friend: {name:'相逢与牵挂',situation:'想念一个人',poem:'劝君更尽一杯酒，\n西出阳关无故人。',source:'王维《送元二使安西》',today:'愿下一次相逢，我们都能从容说起今天。',reflection:'古人借酒把送别说得更重；今天，我们仍会为一个将远行的人，认真地留下一句祝愿。'},
    ambition: {name:'失意与壮志',situation:'努力还没被看见',poem:'停杯投箸不能食，\n拔剑四顾心茫然。',source:'李白《行路难》其一',today:'今天的失意，不是我全部的故事。',reflection:'古人也曾在理想与现实之间茫然。我们读到的不只是杯中的酒，也是一颗不甘被困住、仍想向前的心。'},
    festival: {name:'庆祝与祝愿',situation:'盼一场团圆',poem:'但愿人长久，\n千里共婵娟。',source:'苏轼《水调歌头·明月几时有》',today:'即使不在同一张桌旁，也愿我们分享同一份祝福。',reflection:'苏轼在中秋怀念子由。时代与节日的形式会变，想念远方的人、盼望彼此安好的心，仍然可以相通。'}
  };
  const storageKey='gujiu.resonance.v1';
  const state={mood:null,poem:null,message:''};
  try {
    const saved=JSON.parse(sessionStorage.getItem(storageKey)||'null');
    if(saved){state.mood=entries[saved.mood]?saved.mood:null;state.poem=entries[saved.poem]?saved.poem:null;state.message=typeof saved.message==='string'?saved.message.slice(0,60):'';}
  }catch{/* Optional browser-local persistence. */}
  const input=document.querySelector('#today-message');
  function save(){try{sessionStorage.setItem(storageKey,JSON.stringify(state));}catch{}}
  function navigate(n){document.querySelector(`.scene-rail button[data-go="${n}"]`)?.click();}
  function render(){
    document.querySelectorAll('[data-mood]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.mood===state.mood)));
    document.querySelectorAll('[data-poem]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.poem===state.poem)));
    const mood=entries[state.mood];
    document.querySelector('#game-context').textContent=mood?`你的情境：${mood.situation}。哪一种古人的表达，与你最有共鸣？`:'你可以从任意一份情感开始，不必寻找唯一的标准答案。';
    const choice=entries[state.poem];
    document.querySelector('#poem-response').textContent=choice?(state.mood&&state.mood!==state.poem?`你把“${mood.situation}”与“${choice.name}”连在了一起。情感可以有多种读法，也欢迎写下你的理解。`:`你选择了“${choice.name}”。把古人的表达接到自己的今天，这份联系就开始发生。`):'选一句诗，再留下一句今天的心里话。';
    const note=choice||mood||entries.friend;
    const example=!state.mood&&!state.poem&&!state.message;
    document.querySelector('#note-theme').textContent=`共鸣诗笺 / ${note.name}${example?' · 示例':''}`;
    document.querySelector('#note-poem').textContent=note.poem;
    document.querySelector('#note-source').textContent=note.source;
    document.querySelector('#note-today').textContent=state.message.trim()||entries[state.mood]?.today||note.today;
    document.querySelector('#note-reflection').textContent=note.reflection;
  }
  input.value=state.message;
  document.querySelectorAll('[data-mood]').forEach(button=>button.addEventListener('click',()=>{
    state.mood=button.dataset.mood;state.poem=null;state.message='';input.value='';save();render();navigate(14);
  }));
  document.querySelectorAll('[data-poem]').forEach(button=>button.addEventListener('click',()=>{state.poem=button.dataset.poem;save();render();}));
  input.addEventListener('input',()=>{state.message=input.value.slice(0,60);save();render();});
  document.querySelector('#make-poem').addEventListener('click',()=>{
    if(!state.poem)state.poem=state.mood||'friend';state.message=input.value.slice(0,60);save();render();navigate(15);
  });
  const sources=document.querySelector('#culture-sources');
  document.querySelector('#open-culture-sources').addEventListener('click',()=>sources.showModal());
  sources.addEventListener('click',event=>{if(event.target===sources){const rect=sources.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)sources.close();}});
  render();
})();
