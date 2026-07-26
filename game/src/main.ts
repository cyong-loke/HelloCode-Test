import './style.css';
import { audio } from './audio/audio';
import { Input } from './core/input';
import { hashSeed, todayKey } from './core/rng';
import { persist, refreshDaily, save } from './core/save';
import { MODIFIERS, type Modifier } from './content/daily';
import { Renderer } from './render/renderer';
import { Run } from './sim/run';
import * as ui from './ui/ui';

const canvas = document.getElementById('stage') as HTMLCanvasElement;
const app = document.getElementById('app') as HTMLElement;
const renderer = new Renderer(canvas);
const input = new Input(canvas);

type State = 'hub' | 'altar' | 'run';

let state: State = 'hub';
let run: Run | null = null;
let paused = false;
let prevPhase = '';
let isDaily = false;

refreshDaily();

/** Everyone in the world gets the same modifier on the same date. */
function dailyModifier(): Modifier {
  const seed = hashSeed('nightmare:' + todayKey());
  return MODIFIERS[seed % MODIFIERS.length];
}

// ── Pause control ──────────────────────────────────────────────────

const pauseBtn = document.createElement('button');
pauseBtn.id = 'pause-btn';
pauseBtn.textContent = '❚❚';
app.appendChild(pauseBtn);
pauseBtn.addEventListener('click', () => openPause());

function openPause() {
  if (!run || run.phase !== 'play' || paused) return;
  paused = true;
  input.reset();
  ui.pause(
    () => {
      paused = false;
      ui.clearUi();
    },
    () => {
      paused = false;
      run?.finish(false);
    },
  );
}

// ── Screens ────────────────────────────────────────────────────────

function showHub() {
  state = 'hub';
  run = null;
  paused = false;
  pauseBtn.classList.remove('on');
  renderer.setFilter('none');
  canvas.style.opacity = '0.25';
  refreshDaily();

  ui.hub(dailyModifier(), {
    onPlay: () => startRun(false),
    onDaily: () => startRun(true),
    onAltar: () => showAltar(),
    onVessel: () => {},
  });
}

function showAltar() {
  state = 'altar';
  ui.altar(showHub);
}

function startRun(daily: boolean) {
  audio.unlock();
  isDaily = daily;

  const modifier = daily ? dailyModifier() : null;
  const seed = daily ? hashSeed('nightmare:' + todayKey()) : (Math.random() * 0xffffffff) >>> 0;

  run = new Run(save.vessel, seed, modifier);
  run.setView(renderer.w, renderer.h);
  state = 'run';
  prevPhase = 'play';
  paused = false;
  canvas.style.opacity = '1';
  pauseBtn.classList.add('on');
  ui.clearUi();
  audio.startRun();

  if (daily) ui.toast(`Nightmare — ${modifier!.name}`);
}

function showCards() {
  if (!run) return;
  const r = run;
  input.reset();
  ui.cardHand(
    r,
    (card) => {
      r.chooseCard(card);
      if (r.phase === 'cards') showCards();
      else ui.clearUi();
    },
    () => {
      r.rerollHand();
      showCards();
    },
  );
}

function showPact() {
  if (!run) return;
  const r = run;
  input.reset();
  ui.pactOffer(
    r,
    (offer) => {
      r.acceptPact(offer);
      ui.clearUi();
    },
    () => {
      r.refusePact();
      ui.clearUi();
    },
  );
}

function endRun() {
  if (!run) return;
  const r = run;
  const shards = r.shardsEarned;
  const fragments = r.fragmentsEarned;

  save.shards += shards;
  save.fragments += fragments;
  save.runs += 1;
  save.kills += r.kills;
  if (r.won) save.wins += 1;
  save.bestTime = Math.max(save.bestTime, r.t);
  save.bestDread = Math.max(save.bestDread, r.dread);

  if (isDaily) {
    save.dailyDone = true;
    save.dailyBest = Math.max(save.dailyBest, r.kills);
  }

  // The second vessel is free and arrives the moment the first run ends —
  // the meta has to announce itself before anyone decides the game is thin.
  let unlockedNapoleon = false;
  if (!save.unlocked.includes('napoleon')) {
    save.unlocked.push('napoleon');
    unlockedNapoleon = true;
  }
  persist();

  pauseBtn.classList.remove('on');
  canvas.style.opacity = '0.35';
  input.reset();

  ui.results(r, shards, fragments, (again) => {
    if (again) startRun(isDaily && !save.dailyDone);
    else showHub();
  });

  if (unlockedNapoleon) ui.toast('Napoleon answers the call');
}

// ── Loop ───────────────────────────────────────────────────────────

let last = performance.now();

function frame(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  if (state === 'run' && run) {
    if (!paused) run.update(dt, input.x, input.y);

    renderer.setFilter(run.bandInfo.filter);
    renderer.draw(run, input, now / 1000);

    if (run.phase !== prevPhase) {
      prevPhase = run.phase;
      if (run.phase === 'cards') showCards();
      else if (run.phase === 'pact') showPact();
      else if (run.phase === 'over') endRun();
      else if (run.phase === 'play' && !paused) ui.clearUi();
    }

    pauseBtn.style.display = run.phase === 'play' && !paused ? 'block' : 'none';
  }

  requestAnimationFrame(frame);
}

// ── Wiring ─────────────────────────────────────────────────────────

window.addEventListener('resize', () => {
  renderer.resize();
  run?.setView(renderer.w, renderer.h);
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) openPause();
});

// iOS will not start an AudioContext outside a gesture, so the first tap
// anywhere in the app is what actually turns the sound on.
const unlockOnce = () => {
  audio.unlock();
  window.removeEventListener('pointerdown', unlockOnce);
};
window.addEventListener('pointerdown', unlockOnce);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {
      /* Offline support is a bonus — a failure here must never block the game. */
    });
  });
}

/**
 * QA handle. Scores are local-only so there is nothing to protect, and being
 * able to fast-forward a four-minute run is the difference between testing the
 * late game and hoping about it.
 */
(window as unknown as { __pact: unknown }).__pact = {
  get run() {
    return run;
  },
  /** Steps the simulation forward in fixed slices without waiting real time. */
  warp(seconds: number) {
    if (!run) return;
    const step = 1 / 60;
    for (let i = 0; i < seconds / step; i++) {
      if (!run || run.phase !== 'play') break;
      run.update(step, 0, 0);
    }
  },
  start: (daily = false) => startRun(daily),
};

showHub();
requestAnimationFrame(frame);
