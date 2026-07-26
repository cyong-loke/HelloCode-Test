import { audio } from '../audio/audio';
import { fmtNum, fmtTime } from '../core/math';
import { persist, save } from '../core/save';
import { ALTAR } from '../content/altar';
import { VESSELS, vesselById } from '../content/vessels';
import { WEAPONS } from '../sim/weapons';
import { godById } from '../content/gods';
import type { Modifier } from '../content/daily';
import type { Run } from '../sim/run';
import type { Card, PactOffer } from '../types';

const root = document.getElementById('overlay') as HTMLElement;

function node(html: string): HTMLElement {
  const t = document.createElement('div');
  t.innerHTML = html.trim();
  return t.firstElementChild as HTMLElement;
}

export function clearUi() {
  root.innerHTML = '';
}

export function mount(el: HTMLElement) {
  clearUi();
  root.appendChild(el);
  return el;
}

let toastTimer = 0;
export function toast(message: string) {
  let t = document.getElementById('toast');
  if (!t) {
    t = node('<div id="toast"></div>');
    document.getElementById('app')!.appendChild(t);
  }
  t.textContent = message;
  t.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => t!.classList.remove('show'), 2200);
}

const tap = (el: Element | null, fn: () => void) =>
  el?.addEventListener('click', () => {
    audio.ui();
    fn();
  });

// ── Hub ────────────────────────────────────────────────────────────

export interface HubHandlers {
  onPlay: () => void;
  onDaily: () => void;
  onAltar: () => void;
  onVessel: (id: string) => void;
}

export function hub(daily: Modifier, h: HubHandlers) {
  const el = mount(
    node(`
    <div class="screen">
      <div style="margin-top:6vh">
        <div class="title">PACT</div>
        <div class="subtitle">Gods of the Dark Hour</div>
      </div>
      <div class="spacer"></div>
      <div class="note" style="max-width:340px;margin:0 auto 4vh">${
        save.runs === 0
          ? 'Four minutes. One thumb. Whatever you are willing to sell.'
          : `${save.runs} hour${save.runs === 1 ? '' : 's'} entered · ${save.wins} survived<br>
             longest ${fmtTime(save.bestTime)} · deepest dread ${Math.round(save.bestDread)} · ${fmtNum(save.kills)} slain`
      }</div>
      <div class="hub-foot">
        <div class="heading">Choose a body</div>
        <div class="vessel-strip" id="strip"></div>
        <div class="shards">⛁ ${fmtNum(save.shards)} &nbsp;·&nbsp; ◈ ${save.fragments}</div>
        <button class="btn primary" id="play">Enter the Dark Hour</button>
        <div class="btn-row">
          <button class="btn" id="daily">${save.dailyDone ? '✓ Nightmare' : 'Nightmare'}</button>
          <button class="btn" id="altar">Altar</button>
        </div>
        <div class="note" style="margin-top:12px">
          Tonight — <strong>${daily.name}</strong>. ${daily.desc}
        </div>
        <button class="btn ghost" id="mute">${save.muted ? 'Sound: off' : 'Sound: on'}</button>
      </div>
    </div>
  `),
  );

  const strip = el.querySelector('#strip')!;
  for (const v of VESSELS) {
    const owned = save.unlocked.includes(v.id);
    const chip = node(`
      <div class="vessel-chip ${save.vessel === v.id ? 'active' : ''} ${owned ? '' : 'locked'}">
        <div class="vglyph" style="color:${v.color}">${v.glyph}</div>
        <div class="vname">${v.name}</div>
        ${owned ? '' : `<div class="vcost">◈ ${v.cost}</div>`}
      </div>
    `);
    tap(chip, () => {
      if (owned) {
        save.vessel = v.id;
        persist();
        hub(daily, h);
        h.onVessel(v.id);
      } else if (save.fragments >= v.cost) {
        save.fragments -= v.cost;
        save.unlocked.push(v.id);
        save.vessel = v.id;
        persist();
        toast(`${v.name} answers`);
        hub(daily, h);
      } else {
        toast(`Needs ${v.cost - save.fragments} more effigy`);
      }
    });
    strip.appendChild(chip);
  }

  const active = strip.querySelector('.vessel-chip.active') as HTMLElement | null;
  active?.scrollIntoView({ block: 'nearest', inline: 'center' });

  // A short read on whoever is selected, under the strip.
  const v = vesselById(save.vessel);
  const info = node(`
    <div class="note" style="margin:10px 0 4px;text-align:left">
      <span style="color:${v.color}">${v.name}</span> · ${v.era}<br>
      <span style="opacity:.85">${WEAPONS[v.weapon].name} — ${WEAPONS[v.weapon].desc(1)}</span><br>
      <span style="opacity:.7">${v.passive}</span>
    </div>
  `);
  strip.insertAdjacentElement('afterend', info);

  tap(el.querySelector('#play'), h.onPlay);
  tap(el.querySelector('#daily'), h.onDaily);
  tap(el.querySelector('#altar'), h.onAltar);
  tap(el.querySelector('#mute'), () => {
    audio.setMuted(!save.muted);
    persist();
    hub(daily, h);
  });
}

// ── Altar ──────────────────────────────────────────────────────────

export function altar(onBack: () => void) {
  const el = mount(
    node(`
    <div class="screen">
      <div class="heading" style="margin-top:2vh">Altar of Bones</div>
      <div class="shards">⛁ ${fmtNum(save.shards)}</div>
      <div id="rows" style="margin-top:14px"></div>
      <button class="btn" id="back">Back</button>
      <button class="btn ghost" id="wipe">Erase all progress</button>
    </div>
  `),
  );

  const rows = el.querySelector('#rows')!;
  for (const up of ALTAR) {
    const level = save.altar[up.id] ?? 0;
    const maxed = level >= up.max;
    const cost = up.cost(level);
    const pips = Array.from({ length: up.max }, (_, i) => `<div class="pip ${i < level ? 'on' : ''}"></div>`).join('');

    const row = node(`
      <div class="row">
        <div class="glyph" style="font-size:20px;width:26px;text-align:center;color:#e0a13c">${up.glyph}</div>
        <div class="body">
          <div class="name">${up.name}</div>
          <div class="desc">${up.desc}</div>
          <div class="pips">${pips}</div>
        </div>
        <button class="buy" ${maxed || save.shards < cost ? 'disabled' : ''}>
          ${maxed ? 'MAX' : '⛁ ' + cost}
        </button>
      </div>
    `);

    tap(row.querySelector('.buy'), () => {
      const l = save.altar[up.id] ?? 0;
      const c = up.cost(l);
      if (l >= up.max || save.shards < c) return;
      save.shards -= c;
      save.altar[up.id] = l + 1;
      persist();
      altar(onBack);
    });
    rows.appendChild(row);
  }

  tap(el.querySelector('#back'), onBack);
  tap(el.querySelector('#wipe'), () => {
    if (confirm('Erase every shard, rank and vessel? This cannot be undone.')) {
      import('../core/save').then((m) => {
        m.wipe();
        onBack();
      });
    }
  });
}

// ── Level-up hand ──────────────────────────────────────────────────

export function cardHand(run: Run, onPick: (c: Card) => void, onReroll: () => void) {
  const el = mount(
    node(`
    <div class="screen modal">
      <div class="heading">Level ${run.level}</div>
      <div class="card-stack" id="stack"></div>
      <div id="rerollWrap" style="max-width:460px;margin:0 auto;width:100%"></div>
    </div>
  `),
  );

  const stack = el.querySelector('#stack')!;
  for (const c of run.hand) {
    const level = run.cardLevels[c.id] ?? 0;
    const color = c.weapon ? WEAPONS[c.weapon].color : '#d8d2c4';
    const card = node(`
      <div class="card">
        <div class="glyph" style="color:${color}">${c.glyph}</div>
        <div class="body">
          <div class="name">${c.name}</div>
          <div class="desc">${c.desc(level + 1)}</div>
          <div class="tag">${level === 0 ? 'NEW' : `RANK ${level + 1} / ${c.max}`}</div>
        </div>
      </div>
    `);
    tap(card, () => onPick(c));
    stack.appendChild(card);
  }

  if (!run.hand.length) {
    stack.appendChild(node('<div class="note">Nothing left to learn.</div>'));
    const skip = node('<button class="btn">Continue</button>');
    tap(skip, () => onPick(run.pool[0]));
    stack.appendChild(skip);
  }

  if (run.canReroll) {
    const btn = node('<button class="btn ghost">Sacrifice 12% health — redraw</button>');
    tap(btn, onReroll);
    el.querySelector('#rerollWrap')!.appendChild(btn);
  }
}

// ── Pact offer ─────────────────────────────────────────────────────

export function pactOffer(
  run: Run,
  onAccept: (p: PactOffer) => void,
  onRefuse: () => void,
) {
  // Anubis reads the needle exactly. Everyone else gets a feeling.
  const exact = run.vessel.id === 'anubis';
  const vague = (d: number) =>
    d >= 34 ? 'A RUINOUS PRICE' : d >= 26 ? 'A HEAVY PRICE' : 'A PRICE';

  const el = mount(
    node(`
    <div class="screen modal">
      <div class="heading">Something is offering</div>
      <div class="card-stack" id="stack"></div>
      <div style="max-width:460px;margin:0 auto;width:100%">
        <button class="btn ghost" id="refuse">Refuse — recover a tenth of your health</button>
      </div>
    </div>
  `),
  );

  const stack = el.querySelector('#stack')!;
  for (const p of run.pactOffers) {
    const god = godById(p.god);
    const doubled = run.vessel.id === 'lucifer';
    const card = node(`
      <div class="card pact">
        <div class="glyph" style="color:${god.color}">${god.glyph}</div>
        <div class="body">
          <div class="name">${p.name}</div>
          <div class="desc" style="opacity:.7;margin-bottom:5px">${god.name} — ${god.epithet}</div>
          <div class="desc">${p.desc}</div>
          <div class="cost">${exact ? `+${p.dread} DREAD` : vague(p.dread)}${doubled ? ' · BOON DOUBLED' : ''}</div>
        </div>
      </div>
    `);
    tap(card, () => onAccept(p));
    stack.appendChild(card);
  }

  tap(el.querySelector('#refuse'), onRefuse);
}

// ── Pause ──────────────────────────────────────────────────────────

export function pause(onResume: () => void, onQuit: () => void) {
  const el = mount(
    node(`
    <div class="screen modal">
      <div class="heading">Held</div>
      <div style="max-width:460px;margin:0 auto;width:100%">
        <button class="btn primary" id="resume">Continue</button>
        <button class="btn ghost" id="mute">${save.muted ? 'Sound: off' : 'Sound: on'}</button>
        <button class="btn ghost" id="quit">Abandon the hour</button>
      </div>
    </div>
  `),
  );
  tap(el.querySelector('#resume'), onResume);
  tap(el.querySelector('#quit'), onQuit);
  tap(el.querySelector('#mute'), () => {
    audio.setMuted(!save.muted);
    persist();
    pause(onResume, onQuit);
  });
}

// ── Results ────────────────────────────────────────────────────────

const EPITAPHS_WIN = [
  'You walked out wearing someone else’s face. Nobody checked.',
  'The debt is recorded. It is not settled.',
  'Whatever followed you out is still following you.',
  'You survived the hour. The hour is not the point.',
];

const EPITAPHS_LOSE = [
  'The body gives out. You do not.',
  'It was never going to be enough, and you knew that at minute two.',
  'Something takes the coat, the name, and the hands.',
  'You are still here. That is the curse of it.',
];

export function results(
  run: Run,
  shards: number,
  fragments: number,
  onDone: (again: boolean) => void,
) {
  const win = run.won;
  const god = run.boundGod;
  const pool = win ? EPITAPHS_WIN : EPITAPHS_LOSE;
  const line = pool[Math.floor(run.rng.next() * pool.length)];

  const el = mount(
    node(`
    <div class="screen">
      <div style="margin-top:5vh"></div>
      <div class="verdict ${win ? 'win' : 'lose'}">${win ? 'Extracted' : 'Taken'}</div>
      <div class="epitaph">${line}</div>
      <div class="stat-grid">
        <div class="stat"><div class="k">Survived</div><div class="v">${fmtTime(run.t)}</div></div>
        <div class="stat"><div class="k">Slain</div><div class="v">${fmtNum(run.kills)}</div></div>
        <div class="stat"><div class="k">Dread</div><div class="v">${Math.round(run.dread)}</div></div>
        <div class="stat"><div class="k">Level</div><div class="v">${run.level}</div></div>
      </div>
      <div class="note" style="margin-bottom:10px">
        ${
          run.pactsTaken.length
            ? `Bound to <strong style="color:${god?.color}">${god?.name}</strong> through ${run.pactsTaken.length} pact${run.pactsTaken.length > 1 ? 's' : ''}.`
            : 'You refused every offer. The hard way counts double.'
        }
        ${run.hunter.active ? '<br>Its hunter found you.' : ''}
      </div>
      <div class="reward">⛁ ${fmtNum(shards)} &nbsp; ◈ ${fragments}</div>
      <div class="spacer"></div>
      <div class="hub-foot">
        <button class="btn primary" id="again">Again</button>
        <button class="btn ghost" id="hub">Back</button>
      </div>
    </div>
  `),
  );

  tap(el.querySelector('#again'), () => onDone(true));
  tap(el.querySelector('#hub'), () => onDone(false));
}
