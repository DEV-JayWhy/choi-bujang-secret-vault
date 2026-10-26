// 최종 checkout의 로컬 GET·모의 DOM 검사. 외부 AI·OSV·조치 POST는 호출하지 않습니다.
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { once } from 'node:events';
import { platform, arch } from 'node:os';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const app = resolve(root, 'on-client');
const args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== '--output') throw Error('Usage: node docs/verify-final.mjs --output <project-outside-file.json>');
const output = resolve(process.cwd(), args[1]);
if (output === root || output.startsWith(root + sep)) throw Error('OUTPUT_MUST_BE_OUTSIDE_PROJECT');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const commit = git('rev-parse', 'HEAD');
const onClientTree = git('rev-parse', 'HEAD:on-client');
const cleanBefore = git('status', '--porcelain') === '';
const meta = JSON.parse(await readFile(resolve(app, 'package.json'), 'utf8'));
assert.deepEqual(meta.scripts, { start: 'node src/server.mjs', demo: 'node src/server.mjs --demo', check: 'node --check student/extension.mjs' });
const report = {
  schema: 'keshev.student-reproduction.v1', repository: 'https://github.com/DEV-JayWhy/choi-bujang-secret-vault',
  branch: 'main', checkout: git('rev-parse', '--abbrev-ref', 'HEAD'), commit, onClientTree, releaseState: 'verification_in_progress',
  startedAt: new Date().toISOString(), environment: { os: platform(), arch: arch(), node: process.version, npm: process.platform === 'win32' ? 'unverified' : execFileSync('npm', ['--version'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(), appVersion: meta.version, nodeCourseTarget: meta.engines.node },
  cleanBefore, evidenceKinds: ['local_process_and_http', 'mock_dom', 'source_review'],
  syntax: null, http: [], stages: [], unverified: ['Windows PowerShell', 'real browser UI', 'live SDP/XDR identity and authorization', 'paid AI explanation', 'live action execution and observation', 'external OSV lookup', 'official ALEPH submission and judgment'],
};
function record(stage, checks, kind = 'mock_dom') { report.stages.push({ stage, checks, kind, checkedAt: new Date().toISOString(), result: 'passed_within_scope' }); }
execFileSync(process.execPath, ['--check', 'student/extension.mjs'], { cwd: app, stdio: 'pipe' });
report.syntax = { command: 'node --check student/extension.mjs', result: 'passed', checkedAt: new Date().toISOString() };
const { createStudentView } = await import(pathToFileURL(resolve(app, 'student/extension.mjs')).href);
class Element {
  constructor(tag) { this.tag = tag; this.children = []; this.attributes = {}; this.value = ''; this.handlers = {}; }
  set textContent(value) { this.text = String(value); this.children = []; }
  get textContent() { return (this.text || '') + this.children.map(node => node.textContent).join('\n'); }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = nodes; this.text = ''; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  addEventListener(name, handler) { this.handlers[name] = handler; }
}
globalThis.document = { createElement: tag => new Element(tag) };
const view = createStudentView();
const has = (node, text) => assert.ok(node.textContent.includes(text), `Missing expected text: ${text}`);
const lacks = (node, text) => assert.ok(!node.textContent.includes(text), `Unexpected prior result: ${text}`);
const all = node => [node, ...node.children.flatMap(all)];
const event = { id: 'fixture-event-a', kind: 'access', at: '2026-10-26T00:00:00Z', appId: 'fixture-app', summary: '연습 사건', evidence: [{ id: 'fixture-e1', text: '연습 근거 문장' }], rules: [{ id: 'fixture-r1', text: '연습 규칙 문장' }], state: { access: 'unknown', session: 'unknown', device: 'unknown' }, supportedActions: [] };
const ok = data => ({ status: 'ok', mode: 'demo', data });
let node = view.renderIdentity({ me: ok({ user: { id: 'fixture-user', label: '연습 사용자' }, device: { id: 'fixture-device', label: '연습 기기', status: 'unknown' }, session: { id: 'fixture-session', status: 'active' } }), devices: ok([]), sessions: ok([]) });
has(node, '연습 사용자'); has(node, 'unknown'); has(node, 'active'); record(13, '본인·기기·세션 표시 및 원래 상태 코드');
node = view.renderDecision({ ...ok({ appId: 'fixture-app', decision: 'unknown', reason: '연습 확인 불가', checkedAt: new Date().toISOString() }), appId: 'fixture-app' });
has(node, 'unknown'); has(node, '접근 허용으로 간주하지 마세요'); record(14, 'unknown은 접근 허용이 아님');
const events = [event, { ...structuredClone(event), id: 'fixture-event-b', at: '2026-10-26T01:00:00Z' }];
const beforeEvents = JSON.stringify(events);
node = view.renderEvents(ok(events));
assert.equal(JSON.stringify(events), beforeEvents);
const eventRows = all(node).filter(n => n.attributes['data-student-event-id']);
assert.equal(eventRows[0].attributes['data-student-event-id'], 'fixture-event-b');
const detailButton = all(eventRows[0]).find(n => n.tag === 'button'); detailButton.handlers.click(); has(node, '연습 근거 문장'); has(node, '연습 규칙 문장');
record(15, '원본 불변·최신순 목록·버튼 상세 근거·규칙');
node = view.renderStatus({ devices: ok([]), sessions: { status: 'loading' }, notifications: [], diagnostics: { status: 'idle' }, mode: 'demo' });
has(node, '등록된 기기가 없습니다'); has(node, '세션 목록 불러오는 중'); has(node, '아직 진단 정보를 조회하지 않았습니다'); record(16, '빈 목록·loading·미조회 진단 구분');
for (const authorization of ['test', 'verified']) {
  node = view.renderAiConnection({ ...ok({ audienceAuthorization: authorization, transportChecked: true, modelCount: 1 }), checkedAt: event.at, explanationAccepted: false });
  has(node, authorization); has(node, '사건 설명은 아직 실행하지 않았습니다');
}
node = view.renderAiConnection({ status: 'idle' }); lacks(node, 'modelCount'); record(17, 'test/verified·설명 미실행·idle 초기화');
const explanation = { ...ok({ summary: '연습 해석', evidenceIds: ['fixture-e1'], proposals: [], requiresHumanConfirmation: true, executed: false }) };
node = view.renderExplanation({ event, explanation, checkedAt: event.at });
assert.equal(node.attributes['data-student-explanation-event'], event.id);
has(node, 'fixture-e1 — 연습 근거 문장'); has(node, 'fixture-r1 — 연습 규칙 문장');
for (const label of ['접속', '세션', '기기']) has(node, `${label}: 확인 불가(unknown)`);
const wrong = structuredClone(explanation); wrong.data.evidenceIds = ['wrong-event-id'];
node = view.renderExplanation({ event, explanation: wrong }); assert.equal(node.attributes['data-student-explanation-event'], undefined); lacks(node, '연습 해석');
node = view.renderExplanation({ event: null, explanation: { status: 'error', error: { code: 'ON_AI_INVALID_INPUT', message: '근거 부족' } } }); has(node, '근거 부족');
record(18, '현재 사건 근거·규칙·unknown·잘못된 ID 거절·event null 오류');
for (const status of ['idle', 'loading', 'prepared', 'executing', 'pending', 'denied', 'failed', 'unknown', 'error', 'expired']) {
  node = view.renderAction({ status, event, actionId: null, target: null, receipt: null, observation: null });
  has(node, status); lacks(node, '효과 확인(succeeded)'); assert.ok(!all(node).some(n => n.tag === 'button'));
}
node = view.renderAction({ status: 'succeeded', event, observation: { effectApplied: false } }); has(node, '결과 불명(unknown)'); lacks(node, '효과 확인(succeeded)');
node = view.renderAction({ status: 'succeeded', event, receipt: { requestId: 'fixture-request', receiptId: 'fixture-receipt', version: 1 }, observation: { effectApplied: true, observedAt: event.at } });
has(node, '효과 확인(succeeded)'); has(node, 'effectApplied: true'); has(node, 'fixture-receipt');
record(19, '11상태·ACK와 효과 구분·효과 true만 확인·학생 실행 버튼 없음');
const pkg = { name: 'fixture-package', version: '1.2.3', status: 'unverifiable', vulnerabilities: [{ id: 'GHSA-aaaa-bbbb-cccc', modified: event.at }], source: 'https://api.osv.dev/v1/querybatch', checkedAt: event.at };
node = view.renderVulnerabilities({ ...ok({ status: 'partial', lockfileVersion: 3, lockfileHash: 'a'.repeat(64), checkedAt: event.at, packages: [pkg] }) });
has(node, '일부 확인·전체 조회 확인 불가'); has(node, 'GHSA-aaaa-bbbb-cccc');
assert.equal(all(node).find(n => n.attributes['data-student-package-name'])?.attributes['data-student-package-version'], '1.2.3');
node = view.renderVulnerabilities({ status: 'loading' }); lacks(node, 'fixture-package'); lacks(node, 'a'.repeat(64));
for (const status of ['complete', 'partial', 'not_checked', 'not_configured', 'unverifiable']) has(view.renderVulnerabilities(ok({ status, packages: [] })), status);
record(20, '정확한 버전·partial ID 보존·전체 상태·loading 초기화');
const runbook = await readFile(resolve(root, 'docs/STUDENT_RUNBOOK.md'), 'utf8');
for (const text of ['npm start', 'npm run demo', 'npm run check', 'flowchart TD', 'ENGINE_NOT_CONNECTED', '미확인']) assert.ok(runbook.includes(text));
record(21, '현재 원문의 설명서·명령·구성도·제한 확인', 'source_review');

const nativeFetch = globalThis.fetch;
async function runServer(label, demo = false) {
  const child = spawn(process.execPath, ['src/server.mjs', ...(demo ? ['--demo'] : [])], { cwd: app, env: { PATH: process.env.PATH, ON_PORT: '5189' }, stdio: ['ignore', 'pipe', 'pipe'] });
  const exited = once(child, 'exit');
  try {
    await new Promise((resolveReady, reject) => {
      const timer = setTimeout(() => reject(Error('SERVER_START_TIMEOUT')), 10000);
      let text = '';
      child.stdout.on('data', chunk => { text += String(chunk); if (text.includes('http://127.0.0.1:5189')) { clearTimeout(timer); resolveReady(); } });
      child.once('exit', () => { clearTimeout(timer); reject(Error('SERVER_EXITED_BEFORE_READY')); });
      child.once('error', () => { clearTimeout(timer); reject(Error('SERVER_START_FAILED')); });
    });
    for (const path of ['/', '/student/extension.mjs', '/api/me', '/api/events', '/api/diagnostics', '/api/vulnerabilities']) {
      const response = await nativeFetch('http://127.0.0.1:5189' + path, { signal: AbortSignal.timeout(5000) });
      const entry = { run: label, method: 'GET', path, http: response.status, checkedAt: new Date().toISOString() };
      if (path.startsWith('/api/')) {
        const json = await response.json();
        entry.mode = json.meta?.mode; entry.ok = json.ok;
        if (json.error?.code) entry.code = json.error.code;
        if (Array.isArray(json.data)) entry.count = json.data.length;
        if (json.data?.status) entry.dataStatus = json.data.status;
        if (path === '/api/me' || path === '/api/events') {
          assert.equal(response.status, demo ? 200 : 503); assert.equal(entry.mode, demo ? 'demo' : 'disconnected');
        } else assert.equal(response.status, 200);
        if (path === '/api/vulnerabilities') assert.equal(entry.dataStatus, 'not_configured');
      } else { assert.equal(response.status, 200); await response.arrayBuffer(); }
      report.http.push(entry);
    }
  } finally {
    if (child.exitCode === null) child.kill('SIGINT');
    await exited;
  }
}
await runServer('default'); await runServer('demo', true); await runServer('default-restart');
report.shutdown = 'verified_process_exit_for_each_run';
report.cleanAfter = git('status', '--porcelain') === '';
report.finishedAt = new Date().toISOString();
report.result = report.cleanBefore && report.cleanAfter ? 'passed_within_scope' : 'candidate_dirty_worktree_only';
report.boundaries = { paidAiCalls: 0, externalOsvCalls: 0, actionPosts: 0, submissions: 0, credentialsCopied: false, browserUiVerified: false, officialPassClaimed: false };
await mkdir(dirname(output), { recursive: true });
await writeFile(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ commit, result: report.result, stageChecks: report.stages.length, httpChecks: report.http.length, cleanBefore, cleanAfter: report.cleanAfter, output: relative(root, output) }));
