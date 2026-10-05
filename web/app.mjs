import { parseU01, prepareModel, optimize, LIMITS } from '../src/core.mjs';
import { exportBundle } from '../src/export.mjs';
import { generateDemo } from '../src/demo.mjs';

const $ = (selector) => document.querySelector(selector);
const root = $('#app');
const MAX_PREVIEW = 5000, MAX_RECORDS = 120, MAX_SEQUENCE = 120;
const state = { lang: 'ja', needles: [], jobs: [], result: null, bundle: null, epoch: 0, busy: '', error: null, status: 'loading', demo: true };
const strings = {
  ja: {
    title: 'NeedleBatch · 糸替えを、先に整える', privacy: 'ファイルは端末の外へ出ません', kicker: 'A SMALL TOOL FOR THE NEXT STITCH', hero: '糸替えを、<br><span>先に整える。</span>', intro: '縫う順番は、そのまま。複数の .u01 ファイルを見渡して、針に掛ける糸と交換のタイミングをまとめて計画します。', tag1: '固定順序のバッチ計画', tag2: '厳密な最小交換数', tag3: '外部通信・アップロードなし', work: 'バッチの準備', sample: 'デモを読み込む', clear: '空の状態に戻す', sampleTag: '3 つの小さな刺繍で試す', customTag: 'あなたのファイルで計画する', machine: 'いまの針と糸', machineNote: '針番号は 1–15、使用可能な針は 6 本まで。現在の糸の識別名を入力します。空欄は糸なし。', needle: '針番号', thread: '糸の識別名', lock: '固定', unavailable: '使用不可', removeNeedle: '針を削除', addNeedle: '＋ 針を追加', available: '使用可能', lockNote: '<strong>固定</strong>した糸は交換しません。<strong>使用不可</strong>の針は計画から外れます。', identityNote: '糸は色ではなく識別名で区別します。同じ糸は大文字・小文字も同じ名前に。プレビューの色は目印です。', queue: '縫う順番', importTitle: '.u01 ファイルを追加', importSub: 'ドロップも可 · 2–8 件 · 1 件 1 MiB / 合計 4 MiB まで', importLimits: 'レコード数：1 件 20 万 / 合計 50 万まで。選針命令：1 件 1 万 / 合計 3 万まで。', choose: 'ファイルを選ぶ', jobs: '件', stitches: '針', stops: 'STOP', records: 'レコード', source: '元の針番号 → 糸の識別名', sourceNeedle: '元の針', mapLabel: 'の糸の識別名', moveUp: 'を上へ', moveDown: 'を下へ', removeJob: 'を削除', preview: 'の刺繍プレビュー', previewNote: 'プレビューは先頭 5,000 レコードのみ。計画と出力は全レコードを使用します。', recordDetails: '針選択・STOP とレコードを確認', recordNote: '先頭 120 レコードを表示。元ファイルの全レコードは保持されます。', emptyJobs: '2 件以上の .u01 ファイルを追加してください', optimize: '最小交換を計画する ↗', optimizing: '最小交換を計算しています…', optimizeNote: '糸交換はジョブ開始前だけ。縫っている途中の掛け替えや、ジョブの並べ替えは行いません。', result: '糸替えの計画', exact: '厳密解', emptyResult: '準備ができたら、まとめて計画。', emptyResultSub: '針と糸を変えたら、もう一度計算してください。', minimum: '最小の糸交換', greedy: '先読みなしの交換', saved: '減らせる交換', times: '回', cannotGreedy: '計画不可', objective: '最初のジョブ前の準備を含む、糸の掛け替え回数です。針選択の回数や作業時間ではありません。', changes: '交換', unchanged: '交換なし', beforeJob: '開始前', emptyThread: '空', selection: '出力の選針順', sequenceNote: '先頭 120 回のみ表示。出力は全ての針選択を保持します。', exportTitle: 'そのまま、次の作業へ。', exportSub: 'ZIP：針番号を更新した .u01 ＋ HTML 作業表 ＋ JSON 記録', zip: 'ZIP を保存 ↓', json: 'JSON', stats: '探索した状態', transitions: '遷移', note1: '順番を変えずに、全体を見る', note1body: '次に使う糸も見越して、バッチ全体の交換数を最小化。ひとつのジョブの中では、同じ元針番号は同じ糸を指します。', note2: '触れるのは、針番号だけ', note2body: '元の針選択を物理針へ割り当てます。縫い目の移動、STOP、その他のバイトは変更せず、元ファイルも上書きしません。', note3: '実機の前に、必ず確認を', note3body: '研究・制作向けの計画ツールです。プレビューは実機シミュレーターではありません。出力を機械ソフトで開き、割当と動作を試し縫いで確認してください。', footer: 'ローカル処理 · 2–8 ジョブ / 使用可能な針 6 本まで / 糸の識別名 10 種まで', ready: 'デモを読み込みました。最小 2 回と、先読みなし 3 回を比べてみてください。', loading: 'デモを読み込んでいます…', edited: '入力が変わりました。計画を再計算してください。', cleared: '空の状態に戻しました。ファイルと針を設定してください。', importing: 'ファイルを端末内で読み込んでいます…', imported: 'ファイルを追加しました。元の針番号に糸の識別名を設定してください。', completed: '計画ができました。作業表と出力の針番号を確認してください。', exporting: '出力ファイルを準備しています…', exported: 'ダウンロードを開始しました。実機への読み込み前に、作業表を確認してください。', errorStatus: '入力を確認してください。計画は保存できません。', infeasible: 'この条件では、途中の糸交換なしに全ジョブを縫えません。使用可能な針、固定設定、各ジョブの糸を見直してください。', details: '技術的な詳細', invalid: 'ファイルまたは設定を確認してください。', extension: '.u01 ファイルだけを追加できます。', tooMany: 'ジョブは最大 8 件です。追加前に不要なファイルを削除してください。', fileSize: 'ファイルは 1 件 1 MiB までです。', totalSize: 'ファイルの合計は 4 MiB までです。', importFailed: 'ファイルの読み込みに失敗しました。', demoFailed: 'デモの読み込みに失敗しました。ページを再読み込みするか、手元の .u01 を追加してください。', noPreview: 'プレビューなし', skip: '作業エリアへ', failed: '計画を作成できませんでした。', fields: '糸の識別名は 64 文字まで。同じ糸は大文字・小文字も一致させてください。', addLimit: '使用可能な針は 6 本まで。追加した針は使用不可に設定されます。', numberOf: '物理針', threadOf: '現在の糸', recordLabel: 'レコード', bytes: 'バイト', stopPreserved: 'STOP を保持', planning: '計画中…', readOnly: '元ファイルは保持されます', downloadDisabled: '計画後に保存できます', lockedTag: '固定', unavailableTag: '使用不可'
  },
  en: {
    title: 'NeedleBatch · Set up the next stitch', privacy: 'Your files stay on this device', kicker: 'A SMALL TOOL FOR THE NEXT STITCH', hero: 'Less rethreading.<br><span>More making.</span>', intro: 'Keep your sewing order. Look across a batch of .u01 designs to plan which threads to load and when to change them.', tag1: 'Fixed-order batch planning', tag2: 'Exact minimum changes', tag3: 'No uploads or third-party calls', work: 'Prepare your batch', sample: 'Load demo', clear: 'Reset to empty', sampleTag: 'Try three little embroidery jobs', customTag: 'Plan with your own files', machine: 'Your needle rack', machineNote: 'Needles 1–15, with up to 6 available. Enter the current thread identity. Leave it blank for an empty needle.', needle: 'Needle', thread: 'Thread identity', lock: 'Locked', unavailable: 'Unavailable', removeNeedle: 'Remove needle', addNeedle: '+ Add needle', available: 'available', lockNote: '<strong>Locked</strong> threads stay in place. <strong>Unavailable</strong> needles are excluded from the plan.', identityNote: 'Threads are identified by case-sensitive names, not color. Use the same name for the same thread. Preview colors are visual guides.', queue: 'Your sewing order', importTitle: 'Add .u01 designs', importSub: 'Or drop files · 2–8 jobs · 1 MiB each / 4 MiB total', importLimits: 'Records: 200,000 per file / 500,000 total. Needle-selection commands: 10,000 per file / 30,000 total.', choose: 'Choose files', jobs: 'jobs', stitches: 'stitches', stops: 'STOP', records: 'records', source: 'Source needle → thread identity', sourceNeedle: 'Source needle', mapLabel: 'thread identity', moveUp: 'move up', moveDown: 'move down', removeJob: 'remove', preview: 'stitch preview', previewNote: 'Preview shows only the first 5,000 records. Planning and export use every record.', recordDetails: 'Inspect needle selections, STOPs, and records', recordNote: 'Showing the first 120 records. All original records are preserved.', emptyJobs: 'Add at least two .u01 designs to begin', optimize: 'Find minimum changes ↗', optimizing: 'Finding the minimum changes…', optimizeNote: 'Reload threads only before a job. No mid-job rethreading and no automatic changes to job order.', result: 'Your rethreading plan', exact: 'EXACT OPTIMUM', emptyResult: 'All set? Plan the whole batch.', emptyResultSub: 'Recalculate whenever you change a needle, thread, or job.', minimum: 'Minimum thread changes', greedy: 'Without looking ahead', saved: 'Changes saved', times: 'changes', cannotGreedy: 'infeasible', objective: 'Counts thread replacements, including setup before the first job. This is not the number of needle selections or an estimate of time.', changes: 'changes', unchanged: 'no changes', beforeJob: 'Before sewing', emptyThread: 'empty', selection: 'Output needle sequence', sequenceNote: 'Showing the first 120 selections. Every selection is retained in the export.', exportTitle: 'Ready for the next step.', exportSub: 'ZIP: retargeted .u01 files + HTML checklist + JSON manifest', zip: 'Download ZIP ↓', json: 'JSON', stats: 'states explored', transitions: 'transitions', note1: 'Same order. A wider view.', note1body: 'Consider threads needed later to minimize replacements across the entire batch. Within each job, one source needle always means one thread identity.', note2: 'Only the needle numbers change.', note2body: 'Source needle selections are retargeted to physical needles. Stitch movements, STOPs, and all other bytes stay intact. Your original files are never overwritten.', note3: 'Check before you stitch.', note3body: 'A planning tool for research and making, not a machine simulator. Open exported files in your machine software, verify the assignments, and perform a test sew before production.', footer: 'Local processing · 2–8 jobs / up to 6 available needles / 10 thread identities', ready: 'Demo loaded. Compare an optimum of 2 changes with 3 without looking ahead.', loading: 'Loading the demo…', edited: 'Inputs changed. Recalculate the plan before downloading.', cleared: 'Reset to empty. Add your files and configure the needles.', importing: 'Reading files locally…', imported: 'Files added. Assign a thread identity to every source needle.', completed: 'Plan ready. Review the checklist and output needle assignments.', exporting: 'Preparing your output files…', exported: 'Download started. Check the worksheet before loading files on your machine.', errorStatus: 'Check your inputs. The plan cannot be downloaded.', infeasible: 'These settings cannot cover every job without mid-job rethreading. Check the available needles, locks, and thread identities required by each job.', details: 'Technical details', invalid: 'Please check the file or settings.', extension: 'Only .u01 files are supported.', tooMany: 'A batch can have at most 8 jobs. Remove a file before adding more.', fileSize: 'Each file must be at most 1 MiB.', totalSize: 'Files must total at most 4 MiB.', importFailed: 'The files could not be read.', demoFailed: 'The demo could not be loaded. Reload the page or add your own .u01 files.', noPreview: 'No preview', skip: 'Skip to workspace', failed: 'The plan could not be created.', fields: 'Use up to 64 characters per identity. Thread names are case-sensitive.', addLimit: 'At most 6 needles can be available. The new needle starts as unavailable.', numberOf: 'Physical needle', threadOf: 'Current thread', recordLabel: 'record', bytes: 'bytes', stopPreserved: 'STOPs preserved', planning: 'Planning…', readOnly: 'Original files are preserved', downloadDisabled: 'Download after planning', lockedTag: 'locked', unavailableTag: 'unavailable'
  }
};
const errorText = {
  RECORD_COUNT: ['レコード数は 1 件 20 万、バッチ合計 50 万までです。ファイルを減らすか、小さなバッチに分けてください。', 'Use at most 200,000 records per file and 500,000 across the batch. Remove files or split the batch.'],
  NEEDLE_COMMAND_COUNT: ['選針命令は 1 件 1 万、バッチ合計 3 万までです。ファイルを減らすか、小さなバッチに分けてください。', 'Use at most 10,000 needle-selection commands per file and 30,000 across the batch. Remove files or split the batch.'],
  FILE_TYPE: ['対応する .u01 形式のファイルを選んでください。ファイル名は 255 文字以内です。', 'Select a .u01 file with a name of at most 255 characters.'],
  STALE: ['入力が変わっています。計画を再計算してから保存してください。', 'Inputs changed. Recalculate the plan before exporting.'],
  INFEASIBLE: ['この条件で実行可能な計画がありません。針と糸の設定を確認してください。', 'No feasible plan exists for these settings. Check the needles and threads.'],
  FORMAT: ['対応する .u01 バイナリファイルを選んでください。', 'Choose a supported binary .u01 file.'],
  FILE_SIZE: ['1 件のファイルは 1 MiB までです。', 'Each file must be at most 1 MiB.'],
  TRUNCATED: ['レコードが不完全か、未対応の末尾データがあります。', 'A record is incomplete or the file has an unsupported trailer.'],
  COMMAND: ['未対応の U01 コマンドが含まれています。', 'This file contains an unsupported U01 command.'],
  TRAILER: ['END の後にデータがあります。この形式には対応していません。', 'Data after END is not supported.'],
  IMPLICIT_NEEDLE: ['縫製の前に明示的な針選択が必要です。機械ソフトで針選択を設定してください。', 'An explicit needle selection is required before sewing. Set it in your machine software.'],
  END_MOVEMENT: ['END コマンドに移動量が含まれています。', 'The END command contains a displacement.'],
  EMPTY_DESIGN: ['明示的な針選択と縫い目のあるデザインが必要です。', 'The design needs an explicit needle selection and at least one stitch.'],
  MISSING_END: ['最後の END レコードがありません。', 'The file is missing its final END record.'],
  THREAD: ['糸の識別名は前後の空白を除いた 1–64 文字で入力してください。制御文字は使えません。', 'Thread identities must contain 1–64 characters, without leading/trailing spaces or control characters.'],
  MODEL: ['針とジョブの設定を確認してください。', 'Check the needle and job settings.'],
  JOB_COUNT: ['2–8 件のジョブを設定してください。', 'Use 2–8 ordered jobs.'],
  NEEDLE_COUNT: ['針位置は 1–15 本、使用可能な針は 1–6 本にしてください。', 'Use 1–15 physical positions and 1–6 available needles.'],
  NEEDLE_NUMBER: ['物理針番号は重複しない 1–15 の整数にしてください。', 'Physical needle numbers must be unique integers from 1 to 15.'],
  THREAD_COUNT: ['現在の糸とジョブ全体を合わせて、識別名は 10 種までです。', 'Use at most 10 thread identities across current loads and all jobs.'],
  MAPPING: ['元の針番号ごとに、ひとつの糸の識別名を設定してください。', 'Assign exactly one stable thread identity to every source needle.'],
  TOTAL_SIZE: ['入力ファイルの合計は 4 MiB までです。', 'Input files must total at most 4 MiB.']
};
const t = (key) => strings[state.lang][key] ?? key;
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nf = (n) => Number(n).toLocaleString(state.lang === 'ja' ? 'ja-JP' : 'en-US');
const mark = '<svg class="brand-mark" viewBox="0 0 34 34" aria-hidden="true"><path d="M8 27 23 6c2-3 6 0 4 3L12 30Z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m22 10 2-3M10 25C-1 6 17-3 15 14s17 19 17 5" fill="none" stroke="#929f7c" stroke-width="1.5" stroke-linecap="round"/></svg>';
const heroArt = '<svg viewBox="0 0 290 176" fill="none" aria-hidden="true"><path d="M8 129C35 81 51 162 93 112S156 21 212 70 252 135 280 104" stroke="#c1cbb1" stroke-width="1.5" stroke-dasharray="3 5"/><path d="M10 81C45 141 59 26 109 65s35 86 86 29 49-67 79-15" stroke="#728962" stroke-width="2"/><path d="M17 110C59 173 70 32 123 68s14 76 74 38 55-71 74-35" stroke="#c88e61" stroke-width="1.2"/><g stroke="#285844" stroke-width="2"><path d="m63 28 27 105c1 5-4 7-6 2L54 31c-2-8 7-11 9-3Z" fill="#f4f3ee"/><path d="m58 28 4 15" stroke-width="1.5"/><path d="m153 13-26 137c-1 5-7 4-6-2l22-137c1-8 12-6 10 2Z" fill="#f4f3ee"/><path d="m148 12-3 18" stroke-width="1.5"/><path d="m231 30-60 111c-3 5-8 2-5-3l54-113c4-8 15-4 11 5Z" fill="#f4f3ee"/><path d="m225 28-8 16" stroke-width="1.5"/></g><circle cx="58" cy="30" r="3" fill="#c88e61"/><circle cx="147" cy="13" r="3" fill="#728962"/><circle cx="225" cy="30" r="3" fill="#c1cbb1"/></svg>';

function inputSnapshot() {
  return { needles: state.needles.map(n => ({ ...n })), jobs: state.jobs.map(j => ({name: j.name, bytes: j.bytes, mapping: {...j.mapping}})) };
}
function setStatus(key) { state.status = key; const el = $('#status'); if (el) el.textContent = t(key); }
function invalidate(key = 'edited') {
  state.epoch++; state.result = null; state.bundle = null; state.error = null; state.busy = '';
  setStatus(key); renderResults(); renderError(); updateButtons(); return state.epoch;
}
function setError(error, fallback = 'invalid') {
  state.error = { code: error?.code, detail: error?.message || String(error), fallback };
  state.busy = ''; state.result = null; state.bundle = null; setStatus('errorStatus'); renderError(); renderResults(); updateButtons();
}
function renderError() {
  const host = $('#error'); if (!host) return;
  if (!state.error) { host.hidden = true; host.replaceChildren(); return; }
  const e = state.error, message = errorText[e.code]?.[state.lang === 'ja' ? 0 : 1] ?? t(e.fallback);
  host.hidden = false;
  host.innerHTML = `<strong>${esc(message)}</strong><details><summary>${t('details')}</summary><pre>${esc(e.code ? `${e.code}: ${e.detail}` : e.detail)}</pre></details>`;
}
function updateButtons() {
  const run = $('#optimize'); if (run) { run.disabled = !!state.busy || state.jobs.length < 2; run.textContent = t(state.busy === 'optimize' ? 'planning' : 'optimize'); }
  for (const id of ['download-zip','download-json']) { const b = document.getElementById(id); if (b) b.disabled = !!state.busy || state.result?.status !== 'optimal'; }
  const add = $('#add-needle'); if (add) add.disabled = state.needles.length >= 15;
  const file = $('#file-input'); if (file) file.disabled = state.busy === 'import';
  const workspace = $('#workspace'); if (workspace) workspace.setAttribute('aria-busy', state.busy ? 'true' : 'false');
}
function render() {
  document.documentElement.lang = state.lang; document.title = t('title');
  $('.skip-link').textContent = t('skip');
  root.innerHTML = `<div class="shell">
    <header class="topbar"><div class="brand">${mark}<span>NeedleBatch</span><span class="badge">LOCAL TOOL</span></div><div class="header-right"><span class="privacy"><i class="dot"></i>${t('privacy')}</span><div class="lang-switch" role="group" aria-label="Language / 言語"><button data-action="language" data-lang="ja" aria-pressed="${state.lang === 'ja'}">日本語</button><button data-action="language" data-lang="en" aria-pressed="${state.lang === 'en'}">EN</button></div></div></header>
    <section class="hero" aria-labelledby="hero-title"><div><div class="eyebrow">${t('kicker')}</div><h1 id="hero-title">${t('hero')}</h1><p class="hero-copy">${t('intro')}</p><div class="hero-tags"><span><i class="dot"></i>${t('tag1')}</span><span><i class="dot"></i>${t('tag2')}</span><span><i class="dot"></i>${t('tag3')}</span></div></div><div class="hero-art">${heroArt}<span class="hero-art-label">ONE BATCH. FEWER CHANGES.</span></div></section>
    <main id="workspace" tabindex="-1"><div class="workbar"><div class="workbar-left"><h2>${t('work')}</h2><span class="section-kicker">${t(state.demo ? 'sampleTag' : 'customTag')}</span></div><div class="workbar-actions"><button class="linklike" data-action="demo" id="load-demo">${t('sample')}</button><button class="linklike" data-action="clear" id="reset-empty">${t('clear')}</button></div></div><div class="workspace">
    <aside class="panel machine-panel" aria-labelledby="machine-title"><div class="panel-heading"><h2 id="machine-title"><span class="step-num">01</span>${t('machine')}</h2></div><p class="label-note">${t('machineNote')}</p><div class="rack" id="rack"></div><div class="rack-foot"><button class="small ghost" data-action="add-needle" id="add-needle">${t('addNeedle')}</button><span id="available-count"></span></div><div class="machine-explainer"><p>${t('lockNote')}</p><p>${t('identityNote')}</p></div></aside>
    <div class="job-area"><section class="panel queue-panel" aria-labelledby="queue-title"><div class="queue-heading"><h2 id="queue-title"><span class="step-num">02</span>${t('queue')}</h2><span class="count-badge" id="job-count"></span></div><div class="import-area" id="drop-zone"><div class="import-copy">${t('importTitle')}<small>${t('importSub')}</small></div><div class="file-picker"><input type="file" id="file-input" accept=".u01" multiple aria-label="${t('choose')}" aria-describedby="import-limits"><label for="file-input" class="file-label">${t('choose')} ＋</label></div></div><p class="import-limits" id="import-limits">${t('importLimits')}</p><div class="jobs" id="jobs"></div><div class="queue-footer"><small>${t('optimizeNote')}</small><button class="primary optimize-button" id="optimize" data-action="optimize">${t('optimize')}</button></div><p id="status" class="status" role="status" aria-live="polite" aria-atomic="true">${esc(t(state.status))}</p><div id="error" class="error-box" role="alert" hidden></div></section><section class="panel results-panel" id="results" aria-labelledby="results-title"></section></div></div></main>
    <section class="bottom-notes" aria-label="${state.lang === 'ja' ? '使い方と注意事項' : 'How it works and limitations'}">${[1,2,3].map(i => `<div class="bottom-note"><h3>${t(`note${i}`)}</h3><p>${t(`note${i}body`)}</p></div>`).join('')}</section><footer><span class="footer-brand">NeedleBatch <span aria-hidden="true">↗</span></span><span>${t('footer')}</span></footer></div>`;
  renderRack(); renderJobs(); renderResults(); renderError(); updateButtons();
}
function renderRack() {
  $('#rack').innerHTML = state.needles.map((n, i) => `<div class="needle-row ${n.unavailable ? 'unavailable' : ''}"><div class="needle-row-top"><div class="field number-field"><label for="needle-number-${i}">${t('needle')}</label><input id="needle-number-${i}" data-needle="${i}" data-field="number" type="number" min="1" max="15" step="1" value="${esc(n.number)}" aria-label="${t('numberOf')} ${i+1}"></div><div class="field thread-field"><label for="needle-thread-${i}">${t('thread')}</label><input id="needle-thread-${i}" data-needle="${i}" data-field="thread" value="${esc(n.thread)}" maxlength="64" autocomplete="off" spellcheck="false" placeholder="${t('emptyThread')}" aria-label="${t('numberOf')} ${esc(n.number)} ${t('threadOf')}"></div><button class="remove-needle danger" data-action="remove-needle" data-index="${i}" aria-label="${t('removeNeedle')} ${esc(n.number)}">×</button></div><div class="needle-options"><label class="check-label"><input type="checkbox" data-needle="${i}" data-field="locked" ${n.locked ? 'checked' : ''} aria-label="${t('numberOf')} ${esc(n.number)} ${t('lock')}">${t('lock')}</label><label class="check-label"><input type="checkbox" data-needle="${i}" data-field="unavailable" ${n.unavailable ? 'checked' : ''} aria-label="${t('numberOf')} ${esc(n.number)} ${t('unavailable')}">${t('unavailable')}</label></div></div>`).join('');
  updateRackCount();
}
function updateRackCount() { $('#available-count').textContent = `${state.needles.filter(n => !n.unavailable).length} / 6 ${t('available')}`; }
function color(identity) { const palette = ['#527557','#ae6648','#456f83','#85704b','#88678a','#4b8583']; let hash = 0; for (const c of String(identity)) hash = (hash * 31 + c.charCodeAt(0)) >>> 0; return palette[hash % palette.length]; }
function preview(job) {
  const records = job.parsed.records.slice(0, MAX_PREVIEW); let px = 0, py = 0, current = null, minX = 0, minY = 0, maxX = 0, maxY = 0;
  const paths = new Map();
  for (const r of records) {
    if (r.needle !== null) current = r.needle;
    minX = Math.min(minX, r.x); maxX = Math.max(maxX, r.x); minY = Math.min(minY, r.y); maxY = Math.max(maxY, r.y);
    if (r.command === 0 || ((r.command === 2 || r.command === 4) && (r.dx || r.dy))) {
      const identity = job.mapping[current] || String(current); paths.set(identity, (paths.get(identity) || '') + `M${px},${-py}L${r.x},${-r.y}`);
    }
    px = r.x; py = r.y;
  }
  const width = Math.max(1,maxX-minX), height = Math.max(1,maxY-minY), pad = Math.max(width,height)*.14+2;
  return `<svg viewBox="${minX-pad} ${-maxY-pad} ${width+pad*2} ${height+pad*2}" role="img" aria-label="${esc(job.name)} ${t('preview')}"><title>${esc(job.name)} ${t('preview')}</title>${[...paths].map(([id,d]) => `<path d="${d}" fill="none" stroke="${color(id)}" stroke-width="1.6" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}</svg>`;
}
function commandName(r) {
  if (r.needle !== null) return `NEEDLE ${r.needle}`;
  if (!r.dx && !r.dy && (r.command === 2 || r.command === 3)) return 'FAST';
  if (!r.dx && !r.dy && (r.command === 4 || r.command === 5)) return 'SLOW';
  return ({0:'STITCH',1:'JUMP',2:'FAST STITCH',3:'FAST JUMP',4:'SLOW STITCH',5:'SLOW JUMP',6:'TRIM',7:'TRIM',8:'STOP',24:'END'})[r.command] ?? `COMMAND ${r.command}`;
}
function renderJobs() {
  $('#job-count').textContent = `${state.jobs.length} / 8 ${t('jobs')}`;
  $('#jobs').innerHTML = state.jobs.length ? state.jobs.map((job, i) => `<article class="job-card" data-testid="job-card"><header class="job-head"><span class="job-order">${String(i+1).padStart(2,'0')}</span><div class="job-title"><h3>${esc(job.name)}</h3><small>${nf(job.parsed.stitchCount)} ${t('stitches')} · ${job.parsed.stopCount} ${t('stops')} · ${nf(job.bytes.length)} B</small></div><div class="job-actions"><button data-action="up" data-index="${i}" aria-label="${esc(job.name)} ${t('moveUp')}" ${i === 0 ? 'disabled' : ''}>↑</button><button data-action="down" data-index="${i}" aria-label="${esc(job.name)} ${t('moveDown')}" ${i === state.jobs.length-1 ? 'disabled' : ''}>↓</button><button class="danger" data-action="remove-job" data-index="${i}" aria-label="${esc(job.name)} ${t('removeJob')}">×</button></div></header><div class="job-body"><div class="preview" id="preview-${i}">${preview(job)}</div><div><p class="mapping-heading">${t('source')}</p><div class="mappings">${job.parsed.sourceNeedles.map(n => `<div class="mapping"><label for="map-${i}-${n}">N${n}</label><span class="arrow" aria-hidden="true">→</span><input id="map-${i}-${n}" data-job="${i}" data-source="${n}" value="${esc(job.mapping[n] || '')}" maxlength="64" autocomplete="off" spellcheck="false" placeholder="${t('thread')}" title="${t('fields')}" aria-label="${esc(job.name)} ${t('sourceNeedle')} ${n} ${t('mapLabel')}"></div>`).join('')}</div></div></div>${job.parsed.records.length > MAX_PREVIEW ? `<p class="record-note">${t('previewNote')}</p>` : ''}<details class="job-detail"><summary>${t('recordDetails')} · ${nf(job.parsed.records.length)} ${t('records')}</summary><ol class="record-list" start="0">${job.parsed.records.slice(0,MAX_RECORDS).map(r => `<li>${commandName(r)} · Δ(${r.dx}, ${r.dy}) · (${r.x}, ${r.y})</li>`).join('')}</ol>${job.parsed.records.length > MAX_RECORDS ? `<p class="record-note">${t('recordNote')}</p>` : ''}</details></article>`).join('') : `<div class="empty-jobs">${t('emptyJobs')}</div>`;
}
function renderResults() {
  const host = $('#results'); if (!host) return;
  const result = state.result, good = result?.status === 'optimal';
  let content = '';
  if (!result) content = `<div class="results-empty">${mark}<p>${t('emptyResult')}<small>${t('emptyResultSub')}</small></p></div>`;
  else if (!good) content = `<p class="infeasible" role="status">${t('infeasible')}</p>`;
  else content = `<div class="metrics"><div class="metric best"><div class="metric-label">${t('minimum')}</div><div class="metric-value"><span id="minimum-changes" data-testid="minimum-changes">${result.minimumChanges}</span><small>${t('times')}</small></div></div><div class="metric benchmark"><div class="metric-label">${t('greedy')}</div><div class="metric-value"><span id="greedy-changes" data-testid="greedy-changes">${result.greedyChanges ?? '—'}</span><small>${result.greedyChanges === null ? t('cannotGreedy') : t('times')}</small></div></div><div class="metric saving"><div class="metric-label">${t('saved')}</div><div class="metric-value"><span id="saved-changes">${result.greedyChanges === null ? '—' : result.greedyChanges-result.minimumChanges}</span><small>${t('times')}</small></div></div></div><p class="objective-note">${t('objective')}</p><div class="plan-list">${result.steps.map((step,i) => `<article class="plan-step" data-testid="plan-step"><div class="plan-index">${String(i+1).padStart(2,'0')}</div><div class="plan-content"><div class="plan-step-head"><h3>${esc(step.name)}</h3><span class="changes-count">${step.changes.length ? `${step.changes.length} ${t('changes')}` : t('unchanged')}</span></div><div class="plan-loads">${step.loads.map(n => `<span class="load-chip ${step.changes.some(c => c.number === n.number) ? 'changed' : ''}"><span class="needle-id">N${n.number}</span><span>${esc(n.thread || t('emptyThread'))}${n.locked ? ` · ${t('lockedTag')}` : ''}${n.unavailable ? ` · ${t('unavailableTag')}` : ''}</span></span>`).join('')}</div>${step.changes.length ? `<p class="change-note">${t('beforeJob')}: ${step.changes.map(c => `N${c.number} ${esc(c.from || t('emptyThread'))} → ${esc(c.to)}`).join(' / ')}</p>` : ''}<div class="sequence"><span>${t('selection')}</span><span class="sequence-numbers" data-testid="needle-sequence" aria-label="${esc(step.needleSequence.slice(0,MAX_SEQUENCE).join(', '))}">${step.needleSequence.slice(0,MAX_SEQUENCE).map((n,j) => `${j ? '<i aria-hidden="true">→</i>' : ''}<b>${n}</b>`).join('')}</span></div>${step.needleSequence.length > MAX_SEQUENCE ? `<p class="record-note">${t('sequenceNote')}</p>` : ''}</div></article>`).join('')}</div>`;
  host.innerHTML = `<div class="result-heading"><h2 id="results-title"><span class="step-num">03</span>${t('result')}</h2>${good ? `<span class="proof-badge"><i class="dot"></i>${t('exact')}</span>` : ''}</div>${content}<div class="export-area"><div class="export-copy">${t('exportTitle')}<small>${t('exportSub')}</small></div><div class="export-buttons"><button class="primary small" data-action="download-zip" id="download-zip" ${!good || state.busy ? 'disabled' : ''}>${t('zip')}</button><button class="small" data-action="download-json" id="download-json" aria-label="${state.lang === 'ja' ? 'JSON 記録を保存' : 'Download JSON manifest'}" ${!good || state.busy ? 'disabled' : ''}>${t('json')}</button></div></div>${result ? `<p class="solver-stats">${nf(result.stats.states)} ${t('stats')} · ${nf(result.stats.transitions)} ${t('transitions')}</p>` : ''}`;
}
async function loadDemo() {
  const epoch = invalidate('loading'); state.busy = 'demo'; updateButtons();
  try { const demo = await generateDemo(); if (epoch !== state.epoch) return;
    const jobs = demo.jobs.map(j => ({...j, mapping:{...j.mapping}, parsed:parseU01(j.bytes)}));
    state.needles = demo.needles.map(n => ({...n})); state.jobs = jobs; state.demo = true; state.busy = ''; state.status = 'ready'; render(); await runPlan(true);
  } catch (error) { if (epoch === state.epoch) setError(error, 'demoFailed'); }
}
async function importFiles(files) {
  const list = [...files]; if (!list.length) return;
  const epoch = invalidate('importing'); state.busy = 'import'; updateButtons();
  try {
    if (state.jobs.length + list.length > LIMITS.jobsMax) throw Object.assign(new Error(t('tooMany')), {code:'JOB_COUNT'});
    if (list.some(f => !/\.u01$/i.test(f.name))) throw Object.assign(new Error(t('extension')), {code:'FILE_TYPE'});
    if (list.some(f => f.size > LIMITS.fileBytes)) throw Object.assign(new Error(t('fileSize')), {code:'FILE_SIZE'});
    if (state.jobs.reduce((a,j) => a+j.bytes.length,0) + list.reduce((a,f) => a+f.size,0) > LIMITS.totalBytes) throw Object.assign(new Error(t('totalSize')), {code:'TOTAL_SIZE'});
    // Reject native-record amplification before allocating any incoming record arrays.
    const estimatedRecords = state.jobs.reduce((sum,job) => sum + job.parsed.records.length,0) + list.reduce((sum,file) => sum + Math.max(0,(file.size-256)/3),0);
    if (estimatedRecords > LIMITS.recordsTotal) throw Object.assign(new Error('At most 500,000 native records across the batch'), {code:'RECORD_COUNT'});
    const incoming = await Promise.all(list.map(async file => {
      const bytes = new Uint8Array(await file.arrayBuffer()); const parsed = parseU01(bytes);
      const mapping = Object.fromEntries(parsed.sourceNeedles.map(n => [n,''])); return {name:file.name,bytes,parsed,mapping};
    }));
    if (epoch !== state.epoch) return;
    const needleCommands = state.jobs.reduce((sum,job) => sum + job.parsed.needleCount,0) + incoming.reduce((sum,job) => sum + job.parsed.needleCount,0);
    if (needleCommands > LIMITS.needleCommandsTotal) throw Object.assign(new Error('At most 30,000 needle-selection commands across the batch'), {code:'NEEDLE_COMMAND_COUNT'});
    state.jobs.push(...incoming); state.demo = false; state.busy = ''; state.status = 'imported'; render();
  } catch (error) { if (epoch === state.epoch) setError(error,'importFailed'); }
}
async function runPlan(isDemo = false) {
  const epoch = invalidate('optimizing'); state.busy = 'optimize'; updateButtons();
  try {
    const model = prepareModel(inputSnapshot());
    await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve,0)));
    if (epoch !== state.epoch) return;
    const result = await optimize(model);
    if (epoch !== state.epoch) return;
    state.result = result; state.busy = ''; setStatus(result.status === 'optimal' ? isDemo ? 'ready' : 'completed' : 'infeasible'); renderResults(); updateButtons();
  } catch (error) { if (epoch === state.epoch) setError(error,'failed'); }
}
function download(bytes, name, type) {
  const blob = new Blob([bytes], {type}); const url = URL.createObjectURL(blob); const anchor = document.createElement('a');
  anchor.href = url; anchor.download = name; document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url),60000);
}
async function exportPlan(kind) {
  if (state.result?.status !== 'optimal' || state.busy) return;
  const epoch = state.epoch; const result = state.result; state.busy = 'export'; setStatus('exporting'); updateButtons();
  try {
    const bundle = state.bundle || await exportBundle(inputSnapshot(),result);
    if (epoch !== state.epoch || result !== state.result) return;
    state.bundle = bundle;
    if (kind === 'zip') download(bundle.bytes, 'needle-batch.zip', 'application/zip');
    else download(JSON.stringify(bundle.manifest,null,2)+'\n','needle-batch-manifest.json','application/json');
    state.busy = ''; setStatus('exported'); updateButtons();
  } catch (error) { if (epoch === state.epoch) setError(error,'failed'); }
}
root.addEventListener('click', event => {
  const button = event.target.closest('button[data-action]'); if (!button || button.disabled) return;
  const action = button.dataset.action, index = Number(button.dataset.index);
  if (action === 'language') { state.lang = button.dataset.lang; render(); $(`[data-action="language"][data-lang="${state.lang}"]`)?.focus(); return; }
  if (action === 'demo') { loadDemo(); return; }
  if (action === 'clear') { invalidate('cleared'); state.needles = [{number:1,thread:null,locked:false,unavailable:false},{number:2,thread:null,locked:false,unavailable:false}]; state.jobs = []; state.demo = false; render(); return; }
  if (action === 'optimize') { runPlan(); return; }
  if (action.startsWith('download-')) { exportPlan(action === 'download-zip' ? 'zip' : 'json'); return; }
  invalidate(); state.demo = false;
  if (action === 'add-needle') { const number = Array.from({length:15},(_,i) => i+1).find(n => !state.needles.some(v => v.number === n)); if (number) { const unavailable = state.needles.filter(n => !n.unavailable).length >= 6; state.needles.push({number,thread:null,locked:false,unavailable}); if (unavailable) state.status = 'addLimit'; } }
  else if (action === 'remove-needle') state.needles.splice(index,1);
  else if (action === 'remove-job') state.jobs.splice(index,1);
  else if (action === 'up' && index > 0) [state.jobs[index-1],state.jobs[index]] = [state.jobs[index],state.jobs[index-1]];
  else if (action === 'down' && index < state.jobs.length-1) [state.jobs[index+1],state.jobs[index]] = [state.jobs[index],state.jobs[index+1]];
  render();
  if (action === 'add-needle') $(`#needle-thread-${state.needles.length-1}`)?.focus();
  else if (action === 'up' || action === 'down') { const next = action === 'up' ? index-1 : index+1; $(`[data-action="${action}"][data-index="${next}"]:not(:disabled)`)?.focus(); if (!document.activeElement || document.activeElement === document.body) $('#optimize')?.focus(); }
  else if (action === 'remove-job') { $(`[data-action="remove-job"][data-index="${Math.min(index,state.jobs.length-1)}"]`)?.focus(); if (!state.jobs.length) $('#file-input')?.focus(); }
  else if (action === 'remove-needle') $('#add-needle')?.focus();
});
root.addEventListener('input', event => {
  const input = event.target;
  if (input.matches('[data-needle]')) {
    const needle = state.needles[Number(input.dataset.needle)]; const field = input.dataset.field;
    if (!needle) return;
    needle[field] = input.type === 'checkbox' ? input.checked : field === 'number' ? input.value === '' ? null : Number(input.value) : input.value || null;
    invalidate(); state.demo = false; updateRackCount();
    if (field === 'unavailable') input.closest('.needle-row').classList.toggle('unavailable', input.checked);
    if (field === 'number') {
      const row = input.closest('.needle-row'); row.querySelector('[data-field="thread"]').setAttribute('aria-label',`${t('numberOf')} ${input.value} ${t('threadOf')}`);
      row.querySelector('[data-field="locked"]').setAttribute('aria-label',`${t('numberOf')} ${input.value} ${t('lock')}`);
      row.querySelector('[data-field="unavailable"]').setAttribute('aria-label',`${t('numberOf')} ${input.value} ${t('unavailable')}`);
    }
  } else if (input.matches('[data-job][data-source]')) {
    const index = Number(input.dataset.job), job = state.jobs[index]; if (!job) return;
    job.mapping[input.dataset.source] = input.value; invalidate(); state.demo = false;
    const target = $(`#preview-${index}`); if (target) target.innerHTML = preview(job);
  } else return;
  const kicker = $('.section-kicker'); if (kicker) kicker.textContent = t('customTag');
});
root.addEventListener('change', event => { if (event.target.id === 'file-input') { const files = [...event.target.files]; event.target.value = ''; importFiles(files); } });
root.addEventListener('dragover', event => { const zone = event.target.closest('#drop-zone'); if (zone) {event.preventDefault(); zone.classList.add('dragging'); if(event.dataTransfer) event.dataTransfer.dropEffect = 'copy';} });
root.addEventListener('dragleave', event => { const zone = event.target.closest('#drop-zone'); if (zone && !zone.contains(event.relatedTarget)) zone.classList.remove('dragging'); });
root.addEventListener('drop', event => { const zone = event.target.closest('#drop-zone'); if (zone) {event.preventDefault(); zone.classList.remove('dragging'); importFiles(event.dataTransfer?.files || []);} });
// Prevent a dropped file outside the import target from replacing the page.
window.addEventListener('dragover', event => { if ([...(event.dataTransfer?.types || [])].includes('Files')) event.preventDefault(); });
window.addEventListener('drop', event => { if ([...(event.dataTransfer?.types || [])].includes('Files')) event.preventDefault(); });
render();
loadDemo();
