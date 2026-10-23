'use strict';
(() => {
  const audio=document.querySelector('#game-music');
  const dock=document.querySelector('#game-music-dock');
  const toggle=document.querySelector('#game-music-toggle');
  const film=document.querySelector('#film-intro');
  let userPaused=false, pending=false, failed=false;
  audio.volume=.2;
  const inGames=()=>Boolean(document.querySelector('.play-scene.active'))&&film.hidden;
  const shouldPlay=()=>inGames()&&!document.hidden&&!userPaused;
  function label(){
    toggle.textContent=failed?'配乐载入失败':audio.paused?'♫ 播放配乐':'♫ 暂停配乐';
    toggle.setAttribute('aria-pressed',String(!audio.paused));
  }
  async function play(){
    if(pending||!audio.paused||!shouldPlay()||failed)return;
    pending=true;
    try{await audio.play();if(!shouldPlay())audio.pause();}
    catch(error){if(error.name!=='NotAllowedError'&&error.name!=='AbortError')failed=true;}
    finally{pending=false;label();}
  }
  function sync(){
    dock.hidden=!inGames();
    if(shouldPlay())play();else audio.pause();
    label();
  }
  toggle.addEventListener('click',()=>{userPaused=!audio.paused||pending;if(userPaused)audio.pause();else{failed=false;play();}label();});
  // A direct visit may need a click before the browser permits audible playback.
  for(const event of ['pointerdown','keydown'])document.addEventListener(event,e=>{
    if(!e.target.closest('#game-music-toggle')&&shouldPlay())play();
  },{capture:true});
  const observer=new MutationObserver(sync);
  document.querySelectorAll('.play-scene').forEach(scene=>observer.observe(scene,{attributes:true,attributeFilter:['class']}));
  observer.observe(film,{attributes:true,attributeFilter:['hidden']});
  document.addEventListener('visibilitychange',sync);
  window.addEventListener('pagehide',()=>audio.pause());
  window.addEventListener('pageshow',sync);
  audio.addEventListener('play',label);audio.addEventListener('pause',label);
  audio.addEventListener('error',()=>{failed=true;label();});
  sync();
})();
