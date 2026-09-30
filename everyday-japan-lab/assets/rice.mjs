import { measureRiceBatch, riceClock } from './rice-model.mjs';
const initRice = () => {
  const root = document.querySelector('[data-rice-guide]');
  if (!root || root.dataset.ready) return;
  root.dataset.ready = 'true';
  const q = s => root.querySelector(s);
  const form = q('[data-rice-measure]'), output = q('[data-measure-result]'), error = q('[data-measure-error]');
  form.addEventListener('input', () => { output.hidden = true; error.hidden = true; });
  form.addEventListener('submit', event => {
    event.preventDefault();
    output.hidden = true; error.hidden = true;
    try {
      const raw = q('#rice-cup-capacity').value.trim();
      const r = measureRiceBatch(raw === '' ? NaN : Number(raw));
      const fmt = n => new Intl.NumberFormat('en', { maximumFractionDigits: 3 }).format(n);
      output.textContent = `For this fixed batch: ${r.riceMl} mL dry rice about ${fmt(r.riceCups)} of your cups; ${r.waterMl} mL water about ${fmt(r.waterCups)} of your cups. Prefer the mL markings for accuracy. The batch size has not changed.`;
      output.hidden = false; output.focus();
    } catch (e) { error.textContent = e.message; error.hidden = false; error.focus(); }
  });
  const primary = q('[data-rice-start]'), next = q('[data-rice-next]'), reset = q('[data-rice-reset]');
  const title = q('[data-phase-title]'), instruction = q('[data-phase-instruction]');
  const clock = q('[data-rice-clock]'), clockNote = q('[data-clock-note]'), status = q('[data-rice-status]');
  const settings = [...root.querySelectorAll('[data-rice-duration]')];
  const steps = [...root.querySelectorAll('[data-rice-step]')];
  const progress = [...root.querySelectorAll('[data-rice-progress]')];
  const showProgress = current => progress.forEach((el, i) => {
    if (i === current) el.setAttribute('aria-current', 'step'); else el.removeAttribute('aria-current');
    el.classList.toggle('rice-completed', i < current);
  });
  const titles = ['Soak', 'Bring to a boil', 'Cook on low heat', 'Rest off the heat', 'Fluff and serve'];
  const instructions = [
    'Rinsed rice and measured water in the pan; heat off.',
    'Cover and use medium-high heat. Watch for bubbling and steam; there is no fixed boiling time.',
    'After boiling, reduce to low heat. Stay with the hob and check the cooking cues.',
    'Heat must be off. Leave the lid in place.',
    'Open carefully and gently loosen the rice. The timer has finished.'
  ];
  const nextLabels = ['Soaking complete - heat the pan', 'Boiling now - heat reduced to low', 'Water absorbed, heat off - start resting', 'Rest complete - fluff rice'];
  const dueMessages = ['Soak reminder reached. Continue when ready.', '', 'Check the pan now. When water is absorbed, turn off the heat before starting the rest step.', 'Rest reminder reached. Continue when ready.'];
  let phase = -1, deadline = null, started = 0, interval = null, announced = false;
  const mmss = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const drawClock = () => {
    if (phase < 0 || phase > 3) return;
    if (phase === 1) { clock.textContent = mmss(Math.max(0, Math.floor((Date.now() - started) / 1000))); clockNote.textContent = 'Elapsed - wait for actual bubbling and steam.'; return; }
    const t = riceClock(deadline, Date.now());
    clock.textContent = mmss(t.remaining);
    clockNote.textContent = t.remaining > 0 ? 'Remaining in this step' : `Reminder reached ; ${mmss(t.overdue)} since target time`;
    if (t.remaining === 0 && !announced) { status.textContent = dueMessages[phase]; announced = true; }
  };
  const enterPhase = value => {
    clearInterval(interval); phase = value; started = Date.now(); announced = false;
    settings.forEach(el => { el.disabled = true; });
    title.textContent = `${phase + 1} / 5 - ${titles[phase]}`;
    instruction.textContent = instructions[phase];
    steps.forEach((el, i) => { if (i === phase) el.setAttribute('aria-current', 'step'); else el.removeAttribute('aria-current'); });
    showProgress(phase);
    primary.hidden = true; next.hidden = phase === 4; reset.hidden = false;
    status.textContent = `${titles[phase]}. ${instructions[phase]}`;
    if (phase === 4) { clock.textContent = 'Done'; clockNote.textContent = 'No active timer.'; title.focus(); return; }
    next.textContent = nextLabels[phase];
    const minutes = phase === 0 ? Number(q('#rice-soak').value) : phase === 2 ? Number(q('#rice-low').value) : Number(q('#rice-rest').value);
    deadline = phase === 1 ? null : started + minutes * 60000;
    drawClock(); interval = setInterval(drawClock, 250); title.focus();
  };
  primary.addEventListener('click', () => enterPhase(0));
  next.addEventListener('click', () => { if (phase >= 0 && phase < 4) enterPhase(phase + 1); });
  reset.addEventListener('click', () => {
    clearInterval(interval); interval = null; phase = -1; deadline = null;
    settings.forEach(el => { el.disabled = false; });
    steps.forEach(el => el.removeAttribute('aria-current'));
    showProgress(-1);
    title.textContent = 'Ready when your ingredients are measured'; instruction.textContent = 'Start with the heat off.';
    clock.textContent = '-'; clockNote.textContent = 'No active timer.';
    status.textContent = 'Timer reset. This does not switch off your hob.';
    next.hidden = true; reset.hidden = true; primary.hidden = false; primary.focus();
  });
  document.addEventListener('visibilitychange', drawClock);
  q('[data-rice-print]').addEventListener('click', () => window.print());
  const notesForm = q('[data-rice-notes]'), noteOutput = q('[data-note-output]');
  const noteText = q('#rice-note-text'), noteStatus = q('#rice-note-copy-status');
  const noteFields = [...notesForm.querySelectorAll('[data-note-label]')];
  const blankNote = q('[data-note-paper]').textContent;
  const prepareNote = () => ['MY STOVETOP RICE RECORD', 'Everyday Japan Lab - my own observations',
    'Guide: ' + (document.querySelector('link[rel="canonical"]')?.href || location.href.split('#')[0]),
    '', ...noteFields.map(el => `${el.dataset.noteLabel}: ${el.value.trim() || '(not recorded)'}`),
    '', 'Reference only: 360 mL dry short-grain white rice + 400 mL water in a covered 20 cm deep pan.',
    'My recorded measurements and results may differ from the reference.'].join('\n');
  notesForm.addEventListener('input', () => { noteOutput.hidden = true; noteStatus.textContent = ''; });
  notesForm.addEventListener('submit', event => {
    event.preventDefault(); noteText.value = prepareNote(); noteOutput.hidden = false;
    noteStatus.textContent = 'Ready to copy or select. Keep a copy before leaving this page.'; noteText.focus();
  });
  q('[data-note-copy]').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(noteText.value); noteStatus.textContent = 'Copied. Paste into your own notes app to keep it.'; }
    catch { noteText.focus(); noteText.select(); noteStatus.textContent = 'Automatic copying is unavailable. The note is selected; use your device\'s Copy command.'; }
  });
  let notesWereOpen = false;
  window.addEventListener('beforeprint', () => {
    notesWereOpen = q('#rice-notes').open; q('#rice-notes').open = true;
    q('[data-note-paper]').textContent = noteFields.some(el => el.value.trim()) ? prepareNote() : blankNote;
  });
  window.addEventListener('afterprint', () => { q('#rice-notes').open = notesWereOpen; });
  q('[data-rice-notes-ui]').hidden = false;
  q('[data-rice-interactive]').hidden = false;
};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initRice);
else initRice();
