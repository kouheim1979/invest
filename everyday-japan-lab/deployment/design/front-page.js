// The homepage markup is inert on article/tool pages; the native post is a fallback.
(()=>{const mount=()=>{
  const template=document.getElementById('ejl-front-template');
  const main=document.querySelector('main.centered-bottom');
  if(!template||!main||location.pathname!=='/'||document.getElementById('ejl-front-page')) return;
  const front=document.createElement('div');
  front.id='ejl-front-page';
  front.append(template.content.cloneNode(true));
  main.prepend(front);
  document.body.classList.add('ejl-front');
};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();})();
