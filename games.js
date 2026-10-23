'use strict';
(() => {
  // Names are cultural motifs; all personality interpretations are creative writing.
  const personalities = [
    {name:'醴酒 · 温柔知己',traits:'温厚 / 共情 / 珍惜相伴',copy:'你更在意身边的人有没有被照顾。比起热闹的中心，你愿意做那个记得朋友心事、为相逢留一盏灯的人。',line:'一杯留给你，一句话慢慢说。'},
    {name:'菊花酒 · 自在山客',traits:'从容 / 独立 / 自有天地',copy:'你需要自己的节奏，也懂得与日常相处。没有人围坐的时候，你仍能从一阵风、一段路里找到值得珍惜的瞬间。',line:'不必急着赶路，山色正好。'},
    {name:'桂酒 · 雅集同欢',traits:'热忱 / 联结 / 分享快乐',copy:'对你而言，好时光总想与人分享。你擅长把散落的人聚在一起，让一次普通的见面，也成为值得回味的节日。',line:'今夜的好事，是大家都在。'},
    {name:'桑落酒 · 追光行者',traits:'坚定 / 理想 / 仍愿向前',copy:'你心里总有一件想完成的事。即使遇到失意，你也愿意把心事收好，再向前走一步。你的温柔里，也藏着不轻易放下的志向。',line:'暂借一杯慰风尘，明日仍向远处行。'}
  ];
  const questions = [
    {title:'难得有一晚空闲，你最想怎样度过？',options:[['陪一个重要的人，好好聊聊',[3,0,1,0]],['独自散步，听听自己的心声',[0,3,0,1]],['约上朋友，让今晚热闹起来',[1,0,3,0]]]},
    {title:'遇到一件不顺心的事，你通常会……',options:[['找信任的人说说，彼此接住情绪',[3,0,1,0]],['暂时放慢脚步，留点空间给自己',[0,3,0,1]],['记下原因，带着不甘继续试一次',[0,0,1,3]]]},
    {title:'若为今天留一句话，你会选？',options:[['愿惦念的人，都能常常相见',[3,0,2,0]],['且向山水去，自有我的天地',[0,3,0,1]],['愿热爱不散，前路仍有光',[0,0,2,3]]]}
  ];
  let answers=[], step=0;
  const $=s=>document.querySelector(s);
  function renderQuestion(focus=false){
    $('#quiz-questions').hidden=false;$('#quiz-result').hidden=true;
    $('#quiz-progress').textContent=`0${step+1} / 03`;$('#quiz-question').textContent=questions[step].title;
    $('#quiz-back').disabled=step===0;
    const options=$('#quiz-options');options.replaceChildren();
    questions[step].options.forEach(([label],i)=>{const button=document.createElement('button');button.type='button';button.className='quiz-option';const mark=document.createElement('span');mark.textContent=String.fromCharCode(65+i);const text=document.createElement('span');text.textContent=label;button.append(mark,text);button.addEventListener('click',()=>{answers[step]=i;if(step<2){step++;renderQuestion(true);}else showResult();});options.append(button);});
    if(focus)$('#quiz-question').focus({preventScroll:true});
  }
  function showResult(){
    const scores=[0,0,0,0];answers.forEach((a,q)=>questions[q].options[a][1].forEach((n,i)=>scores[i]+=n));
    // Resolve ties with the final choice so all paths have one stable result.
    const last=questions[2].options[answers[2]][1];
    const winner=scores.map((score,i)=>({score:score*10+last[i],i})).sort((a,b)=>b.score-a.score)[0].i;
    const result=personalities[winner];
    $('#personality-name').textContent=result.name;$('#personality-traits').textContent=result.traits;$('#personality-copy').textContent=result.copy;$('#personality-line').textContent=result.line;
    $('#quiz-questions').hidden=true;$('#quiz-result').hidden=false;$('#personality-name').tabIndex=-1;$('#personality-name').focus({preventScroll:true});
  }
  $('#quiz-back').addEventListener('click',()=>{if(step>0){step--;renderQuestion(true);}});
  $('#quiz-restart').addEventListener('click',()=>{answers=[];step=0;renderQuestion(true);});renderQuestion();
  const portraits={moon:{title:'月下知己',wine:'菊花酒意象',description:'把喧嚣留在远处，与你分享此刻的月色。',setting:'月色、青白衣衫与临水长夜'},osmanthus:{title:'桂影雅集',wine:'桂酒意象',description:'把好时光分给同席的人，让相聚成为节日。',setting:'桂花、琥珀金衣衫与庭院灯火'}};
  $('#avatar-form').addEventListener('submit',event=>{
    event.preventDefault();const data=new FormData(event.currentTarget);const mood=data.get('mood'),figure=data.get('figure');const portrait=portraits[mood];
    const src=`assets/characters/${mood}-${figure}.webp`;const name=`${portrait.title} · ${figure==='man'?'公子':'佳人'}`;
    const image=$('#avatar-image');$('#avatar-status').textContent='正在载入形象……';
    image.onload=()=>{$('#avatar-status').textContent=`已揭晓：${name}`;};image.onerror=()=>{$('#avatar-status').textContent='形象暂时无法载入，请重试。';};
    image.src=src;image.alt=`${name}，${portrait.setting}，成年${figure==='man'?'男性':'女性'}古酒拟人艺术形象`;
    $('#avatar-caption-label').textContent=`${portrait.wine} / AI 预绘偏好匹配`;$('#avatar-name').textContent=name;$('#avatar-description').textContent=portrait.description;
    const download=$('#avatar-download');download.href=src;download.download=`${name}.webp`;download.hidden=false;
    $('#avatar-display').classList.add('revealed');$('#avatar-display').scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  });
})();
