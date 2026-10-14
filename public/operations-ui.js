const $ = id => document.getElementById(id);
let snapshot = null;
const labels = { passed: '실측 일치', failed: '실측 불일치', not_run: '미실행', unavailable: '확인 실패' };
function showReport(report) {
  if (report?.schema !== 'aleph.operations.v1' || !Array.isArray(report.checks)
      || !report.counts || report.officialSuite?.total !== 41) throw Error('서버 결과 형식이 맞지 않습니다.');
  snapshot = report;
  $('identity').textContent = `검사 대상: ${report.target} · 커밋: ${report.commit ?? '미확인'} · 확인 시각: ${report.checkedAt}`;
  const counts = [['전체 항목','total'],['실측 일치','passed'],['실측 불일치','failed'],['미실행','notRun'],['확인 실패','unavailable'],['정상 요청 허용','allowed'],['금지 요청 거부','denied']];
  $('counts').replaceChildren(...counts.flatMap(([title,key]) => {
    const dt=document.createElement('dt'), dd=document.createElement('dd');dt.textContent=title;dd.textContent=Number.isInteger(report.counts[key])?String(report.counts[key]):'미확인';return [dt,dd];
  }));
  $('rules').textContent = Array.isArray(report.rules) ? report.rules.join(', ') : '미확인';
  $('detection').textContent = `탐지 사건: ${report.backend?.detector?.reason ?? '미확인'}`;
  $('revocation').textContent = `회수 상태: ${report.backend?.revocation?.reason ?? '미확인'}`;
  const recovery=report.backend?.recovery;
  $('recovery').textContent = recovery?.status==='observed'
    ? `실제 DB에서 읽은 복원 기록 ${recovery.auditRowsRead}건 (${recovery.window}). 검증 사본 버전: ${recovery.backupVersion ?? '없음/미확인'}. ${recovery.reason}`
    : recovery?.reason ?? '미조회';
  const suite=report.officialSuite;
  $('suite').textContent = `공식 41종: 실행 ${suite.executed} · 통과 ${suite.passed} · 미실행 ${suite.notRun}. ${suite.reason}`;
  $('record').textContent = `가린 서버 기록: ${report.serverRecord?.status === 'stored' ? 'DB 저장 확인' : '저장 확인 실패'} · 실행 ID ${report.runId}. 표시 수치와 JSON은 같은 응답에서 가져옵니다.`;
  $('checks').replaceChildren(...report.checks.map(check => {
    const row=document.createElement('tr');
    const cells=[`${check.stage}단계 · ${check.id}`,`${check.kind==='normal'?'정상':'금지'} · ${check.method??'-'} ${check.path??''}`,check.expected,check.actual,labels[check.outcome]??'미확인',`${check.requestId??'-'} (${check.requestIdSource??'미실행'})`,check.checkedAt??'미실행'];
    for(const value of cells){const td=document.createElement('td');td.textContent=value;row.append(td)}return row;
  }));
  $('download').disabled=false;
}
$('refresh').addEventListener('click',async()=>{
  $('refresh').disabled=true; $('download').disabled=true; snapshot=null;
  $('message').textContent='실제 읽기 요청을 보내는 중입니다. 완료 전에는 결과를 추정하지 않습니다.';
  try {
    const response=await fetch('/api/checks',{cache:'no-store',credentials:'same-origin'});
    if(!response.ok)throw Error(`작전실 API HTTP ${response.status}; 새 결과는 미확인입니다.`);
    showReport(await response.json());$('message').textContent='서버가 반환한 결과를 표시했습니다. 심판 통과는 공식 판정에서 확인합니다.';
  } catch(error){$('message').textContent=error.message;}
  finally{$('refresh').disabled=false;}
});
$('download').addEventListener('click',()=>{
  if(!snapshot)return;const url=URL.createObjectURL(new Blob([JSON.stringify(snapshot,null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download=`operations-${snapshot.runId}.json`;a.click();URL.revokeObjectURL(url);
});
