// 이 파일은 학생이 같은 프로젝트에서 이어서 구현합니다.
// 제공 UI를 받은 것만으로 단계 완료를 인정하지 않습니다.
export function createStudentView({ api } = {}) {
  const view = {
    renderIdentity({ me, devices, sessions }) {
      const root = document.createElement('div');
      const deviceLabels = {
        compliant: '보안 기준 충족',
        noncompliant: '보안 기준 미충족',
        unknown: '확인 불가',
      };
      const sessionLabels = {
        active: '활성', expired: '만료', revoked: '철회됨', unknown: '확인 불가',
      };
      const value = (input) => input == null || input === '' ? '확인 불가' : String(input);
      const deviceText = (device) =>
        `기기: ${value(device?.label)} · ID: ${value(device?.id)} · 상태: ${Object.hasOwn(deviceLabels, device?.status) ? deviceLabels[device.status] : '확인 불가'}(${value(device?.status)})`;
      const sessionText = (session) =>
        `세션 ID: ${value(session?.id)} · 상태: ${Object.hasOwn(sessionLabels, session?.status) ? sessionLabels[session.status] : '확인 불가'}(${value(session?.status)})`;
      function appendText(parent, tag, text) {
        const node = document.createElement(tag);
        node.textContent = text;
        parent.append(node);
        return node;
      }
      function renderResource(title, resource, renderData) {
        const section = document.createElement('section');
        appendText(section, 'h3', title);
        // 모드 안내는 loading·error에서도 생략하지 않습니다.
        if (resource?.mode === 'demo') appendText(section, 'p', '예제 자료');
        else if (resource?.mode === 'disconnected') appendText(section, 'p', '연결 없음');
        else if (resource?.mode !== 'connected') appendText(section, 'p', '확인 불가');

        if (resource?.status === 'loading') {
          appendText(section, 'p', '불러오는 중');
        } else if (resource?.status === 'error') {
          appendText(section, 'p', `연결 실패: ${value(resource.error?.message)}`);
        } else if (resource?.status === 'ok') {
          renderData(section, resource.data);
        } else {
          appendText(section, 'p', '확인 불가');
        }
        root.append(section);
      }
      renderResource('현재 계정·기기·세션', me, (section, data) => {
        appendText(section, 'p', `사용자: ${value(data?.user?.label)} · ID: ${value(data?.user?.id)}`);
        appendText(section, 'p', deviceText(data?.device));
        appendText(section, 'p', sessionText(data?.session));
      });
      renderResource('기기 목록', devices, (section, data) => {
        if (!Array.isArray(data)) {
          appendText(section, 'p', '확인 불가');
          return;
        }
        if (data.length === 0) {
          appendText(section, 'p', '표시할 기기가 없습니다.');
          return;
        }
        const list = document.createElement('ul');
        for (const device of data) appendText(list, 'li', deviceText(device));
        section.append(list);
      });
      renderResource('세션 목록', sessions, (section, data) => {
        if (!Array.isArray(data)) {
          appendText(section, 'p', '확인 불가');
          return;
        }
        if (data.length === 0) {
          appendText(section, 'p', '표시할 세션이 없습니다.');
          return;
        }
        const list = document.createElement('ul');
        for (const session of data) appendText(list, 'li', sessionText(session));
        section.append(list);
      });
      // 이전 호출의 사용자 정보나 DOM을 보관하지 않습니다.
      return root;
    },
    renderDecision({ status, mode, data, error, appId }) {
      const root = document.createElement('section');
      const value = (input) => typeof input === 'string' && input.trim() !== '' ? input : '확인 불가';
      function appendText(tag, text) {
        const node = document.createElement(tag);
        node.textContent = text;
        root.append(node);
      }
      appendText('h3', '업무 앱 접근 요청 결과');
      if (mode === 'demo') appendText('p', '예제 자료 · 실제 연결 아님');
      else if (mode === 'disconnected') appendText('p', '연결 없음');

      if (status === 'idle') {
        appendText('p', '앱을 골라 접속을 요청하세요.');
        return root;
      }
      appendText('p', `업무 앱 ID: ${value(status === 'ok' ? data?.appId : appId)}`);
      if (status === 'loading') {
        appendText('p', '판정 확인 중');
        return root;
      }
      if (status === 'error') {
        appendText('p', `요청 실패: ${value(error?.message)}`);
        appendText('p', '요청 실패는 접근 거부(deny) 판정이 아닙니다. 접근 허용 여부를 확인할 수 없습니다.');
        return root;
      }
      if (status !== 'ok') {
        appendText('p', '판정 확인 불가(unknown) · 접근 허용으로 간주하지 마세요.');
        return root;
      }

      const labels = {
        allow: '접근 허용',
        deny: '접근 거부',
        challenge: '추가 확인 필요',
        unknown: '판정 확인 불가',
      };
      const decision = typeof data?.decision === 'string' && Object.hasOwn(labels, data.decision)
        ? data.decision : 'unknown';
      appendText('p', `${labels[decision]}(${decision})`);
      if (decision === 'allow') {
        appendText('p', '정책상 접근 허용이며 실제 앱 접속 성공을 보장하지 않습니다.');
      } else if (decision === 'challenge') {
        appendText('p', '추가 인증 또는 확인이 필요합니다. 이 앱은 확인 절차를 대신 수행하지 않습니다.');
      } else if (decision === 'unknown') {
        appendText('p', '접근 판정을 확인할 수 없습니다. 접근 허용으로 간주하지 마세요.');
      }
      appendText('p', `판정 이유: ${value(data?.reason)}`);
      appendText('p', `판정 시각: ${value(data?.checkedAt)}`);
      return root;
    },
    renderEvents({ status, mode, data, error }) {
      // 호출마다 새 DOM과 필터 상태를 만들어 이전 자료·상세 선택을 보관하지 않습니다.
      const root = document.createElement('section');
      function text(parent, tag, content) {
        const node = document.createElement(tag);
        node.textContent = content;
        parent.append(node);
        return node;
      }
      const value = input => typeof input === 'string' && input !== '' ? input : '확인 불가';
      const appText = appId => typeof appId === 'string' && appId !== '' ? appId : '앱 확인 불가';
      const kindLabels = { access: '접속 기록', xdr: 'XDR 경보' };
      const stateLabels = {
        access: { allowed: '접속 허용', denied: '접속 거부', unknown: '확인 불가' },
        session: { active: '활성', expired: '만료', revoked: '철회됨', unknown: '확인 불가' },
        device: { compliant: '보안 기준 충족', noncompliant: '보안 기준 미충족', unknown: '확인 불가' },
      };
      const described = (labels, code) => `${Object.hasOwn(labels, code) ? labels[code] : '확인 불가'}(${value(code)})`;
      text(root, 'h3', '본인 접속 기록·기존 XDR 경보');
      text(root, 'p', '본인의 최근 40건 이내 기록입니다. XDR 경보는 이미 저장된 경보이며 이 화면에서 새로 탐지하지 않습니다.');
      if (mode === 'demo') text(root, 'p', '예제 자료 · 실제 연결 아님');
      else if (mode === 'disconnected') text(root, 'p', '연결 없음');
      if (status === 'loading') {
        text(root, 'p', '기록을 불러오는 중입니다.');
        return root;
      }
      if (status === 'error') {
        const message = error?.code === 'CONTRACT_MISMATCH'
          ? '기록을 불러오지 못했습니다: 응답 형식 확인 불가(CONTRACT_MISMATCH).'
          : '기록을 불러오지 못했습니다:';
        text(root, 'p', `${message} ${value(error?.message)}`);
        return root;
      }
      if (status !== 'ok' || !Array.isArray(data)) {
        text(root, 'p', '기록 확인 불가: 기록 배열을 확인할 수 없습니다.');
        return root;
      }
      if (data.length === 0) {
        text(root, 'p', '표시할 기록이 없습니다');
        return root;
      }

      const records = [...data].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
      const filters = document.createElement('div');
      root.append(filters);
      function selectFilter(name, values, describe) {
        const label = document.createElement('label');
        text(label, 'span', name);
        const select = document.createElement('select');
        select.setAttribute('aria-label', name);
        const all = text(select, 'option', '전체');
        all.value = 'all';
        for (const code of new Set(values)) {
          const option = text(select, 'option', describe(code));
          option.value = code;
        }
        select.value = 'all';
        label.append(select);
        filters.append(label);
        return select;
      }
      const kindFilter = selectFilter('기록 종류', records.map(event => event.kind), code => described(kindLabels, code));
      // appId가 없는 기록에 임의 ID를 부여하지 않습니다. 전체에서 확인할 수 있습니다.
      const appFilter = selectFilter('업무 앱', records.map(event => event.appId).filter(id => typeof id === 'string' && id !== ''), appText);
      const accessFilter = selectFilter('접속 상태', records.map(event => event.state.access), code => described(stateLabels.access, code));
      const count = text(root, 'p', '');
      const list = document.createElement('ul');
      const detail = document.createElement('div');
      root.append(list, detail);
      function showDetail(event) {
        detail.replaceChildren();
        const section = document.createElement('section');
        section.setAttribute('data-student-event-detail', event.id);
        text(section, 'h4', `${event.id} 상세`);
        text(section, 'p', `사건 ID: ${event.id}`);
        text(section, 'p', `업무 앱: ${appText(event.appId)}`);
        for (const [key, title] of [['evidence', '근거'], ['rules', '규칙']]) {
          text(section, 'h5', title);
          if (event[key].length === 0) text(section, 'p', `${title} 정보가 없습니다.`);
          const entries = document.createElement('ul');
          for (const entry of event[key]) text(entries, 'li', `${entry.id}: ${entry.text}`);
          section.append(entries);
        }
        text(section, 'h5', '기록 상태');
        for (const [key, title] of [['access', '접속 상태'], ['session', '세션 상태'], ['device', '기기 상태']]) {
          text(section, 'p', `${title}: ${described(stateLabels[key], event.state[key])}`);
        }
        if (Array.isArray(event.supportedActions) && event.supportedActions.length > 0) {
          text(section, 'p', '조치 실행 연결은 준비 중입니다. 아래 조치는 아직 지원하지 않으며 요청을 보내지 않습니다.');
          for (const action of event.supportedActions) {
            const button = text(section, 'button', `${action} 미지원`);
            button.type = 'button';
            button.disabled = true;
          }
        }
        detail.append(section);
      }
      function renderList() {
        list.replaceChildren();
        detail.replaceChildren();
        const visible = records.filter(event =>
          (kindFilter.value === 'all' || event.kind === kindFilter.value)
          && (appFilter.value === 'all' || event.appId === appFilter.value)
          && (accessFilter.value === 'all' || event.state.access === accessFilter.value));
        count.textContent = `표시 기록 ${visible.length}건 / 받은 기록 ${records.length}건`;
        if (visible.length === 0) text(list, 'li', '필터 조건에 맞는 기록이 없습니다.');
        for (const event of visible) {
          const row = document.createElement('li');
          row.setAttribute('data-student-event-id', event.id);
          text(row, 'p', `사건 ID: ${event.id} · 시각: ${event.at} · 종류: ${described(kindLabels, event.kind)} · 업무 앱: ${appText(event.appId)}`);
          text(row, 'p', `요약: ${event.summary}`);
          const button = text(row, 'button', `${event.id} 상세`);
          button.type = 'button';
          button.addEventListener('click', () => showDetail(event));
          list.append(row);
        }
      }
      for (const select of [kindFilter, appFilter, accessFilter]) select.addEventListener('change', renderList);
      renderList();
      return root;
    },
    renderStatus({ devices, sessions, notifications, diagnostics, mode }) {
      const root = document.createElement('section');
      // 알려진 비밀 형식은 표시하지 않고, 객체 전체를 문자열로 변환하지 않습니다.
      const secret = /Bearer\s+\S+|sk-(?:proj-|ant-|svcacct-)?[A-Za-z0-9_-]{8,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:api[_ -]?key|access[_ -]?token|refresh[_ -]?token|authorization|password|비밀번호|토큰)\s*[:=]\s*\S+/i;
      const safeText = input => {
        if (typeof input !== 'string' || input.trim() === '') return '확인 불가';
        return secret.test(input) ? '[비밀 정보 제외]' : input;
      };
      function text(parent, tag, content) {
        const node = document.createElement(tag);
        node.textContent = content;
        parent.append(node);
        return node;
      }
      function section(title, resource) {
        const node = document.createElement('section');
        text(node, 'h4', title);
        if (resource?.mode === 'demo') text(node, 'p', '예제 자료 · 실제 연결 아님');
        else if (resource?.mode === 'disconnected') text(node, 'p', '연결 없음');
        root.append(node);
        return node;
      }
      function failure(node, title, resource, retry) {
        const timeout = typeof resource.error?.code === 'string' && resource.error.code.includes('TIMEOUT');
        text(node, 'p', `${title}: 불러오지 못했습니다${timeout ? ' · 시간 초과' : ''} · ${safeText(resource.error?.message)}`);
        text(node, 'p', retry);
      }
      const labels = {
        devices: { compliant: '보안 기준 충족', noncompliant: '보안 기준 미충족', unknown: '확인 불가' },
        sessions: { active: '활성', expired: '만료', revoked: '철회됨', unknown: '확인 불가' },
      };
      text(root, 'h3', '케셰브 상태·알림·도움정보');
      if (mode === 'demo') text(root, 'p', '예제 자료 · 실제 연결 아님');
      else if (mode === 'disconnected') text(root, 'p', '연결 없음');
      text(root, 'p', '등록 기기는 본인 명의로 등록되고 회수되지 않은 기기 최대 100개입니다. 세션 조회는 현재 검증된 연결 한 개를 대상으로 합니다.');
      for (const [key, title, resource, empty] of [
        ['devices', '기기 목록', devices, '등록된 기기가 없습니다.'],
        ['sessions', '세션 목록', sessions, '현재 연결이 없습니다.'],
      ]) {
        const node = section(title, resource);
        if (resource?.status === 'loading') text(node, 'p', `${title} 불러오는 중`);
        else if (resource?.status === 'error') failure(node, title, resource, '다시 시도는 위쪽 다시 불러오기 버튼을 직접 누르세요.');
        else if (resource?.status === 'ok' && Array.isArray(resource.data)) {
          if (resource.data.length === 0) text(node, 'p', empty);
          const list = document.createElement('ul');
          for (const row of resource.data) {
            const code = row.status;
            const description = Object.hasOwn(labels[key], code) ? labels[key][code] : '확인 불가';
            text(list, 'li', `${key === 'devices' ? '기기' : '세션 ID'}: ${safeText(key === 'devices' ? row.label : row.id)} · 상태: ${description}(${safeText(code)})`);
          }
          node.append(list);
        } else text(node, 'p', `${title} 확인 불가`);
      }
      const notice = section('알림');
      if (!Array.isArray(notifications)) text(notice, 'p', '알림 확인 불가');
      else if (notifications.length === 0) text(notice, 'p', '주의할 알림이 없습니다');
      else {
        const list = document.createElement('ul');
        for (const item of notifications) text(list, 'li', `자료(resource): ${safeText(item.resource)} · 코드(code): ${safeText(item.code)} · 알림: ${safeText(item.message)}`);
        notice.append(list);
      }
      const diagnostic = section('진단 정보', diagnostics);
      const copy = text(diagnostic, 'button', '도움정보 복사');
      copy.type = 'button';
      copy.disabled = true;
      text(diagnostic, 'p', '도움 요청에 사용할 진단 정보를 복사합니다. 버튼을 직접 누를 때만 복사합니다.');
      if (diagnostics?.status === 'loading') text(diagnostic, 'p', '진단 정보 불러오는 중');
      else if (diagnostics?.status === 'error') failure(diagnostic, '진단 정보', diagnostics, '다시 시도는 제공 화면의 도움정보 불러오기 버튼을 직접 누르세요.');
      else if (diagnostics?.status === 'idle') text(diagnostic, 'p', '아직 진단 정보를 조회하지 않았습니다. 제공 화면의 도움정보 불러오기 버튼을 직접 누르세요.');
      else if (diagnostics?.status === 'ok') {
        const data = diagnostics.data;
        if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).length === 0) {
          text(diagnostic, 'p', '표시할 진단 정보가 없습니다.');
        } else {
          // 허용된 필드만 새 객체에 담습니다. 원본·meta·설정 전체는 복사하지 않습니다.
          const help = {
            requestId: safeText(data.requestId),
            component: safeText(data.component),
            version: safeText(data.version),
            checkedAt: safeText(data.checkedAt),
            engine: { mode: safeText(data.engine?.mode), code: safeText(data.engine?.code) },
          };
          const output = text(diagnostic, 'pre', JSON.stringify(help, null, 2));
          const feedback = text(diagnostic, 'p', '');
          copy.disabled = false;
          copy.addEventListener('click', async () => {
            try {
              await navigator.clipboard.writeText(output.textContent);
              feedback.textContent = '도움정보를 클립보드에 복사했습니다.';
            } catch {
              feedback.textContent = '도움정보를 복사하지 못했습니다. 위에 표시된 진단 정보만 직접 선택해 복사하세요.';
            }
          });
        }
      } else text(diagnostic, 'p', '진단 정보 확인 불가');
      return root;
    },
    renderVulnerabilities({ status, mode, data, error }) {
      // 호출마다 새 DOM을 만듭니다. 이전 표·해시·오류를 현재 결과에 재사용하지 않습니다.
      const root = document.createElement('section');
      function text(parent, tag, content) {
        const node = document.createElement(tag);
        node.textContent = content;
        parent.append(node);
        return node;
      }
      const safeText = input => {
        if (typeof input !== 'string' || input.trim() === '') return '확인 불가';
        const secret = /Bearer\s+\S+|sk-(?:proj-|ant-|svcacct-)?[A-Za-z0-9_-]{8,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:api[_ -]?key|access[_ -]?token|refresh[_ -]?token|authorization|password|비밀번호|토큰)\s*[:=]\s*\S+/i;
        return secret.test(input) ? '[비밀 정보 제외]' : input;
      };
      const hasText = input => typeof input === 'string' && input.trim() !== '' && safeText(input) === input;
      text(root, 'h3', '케셰브 설치 패키지·알려진 취약점 조회');
      if (mode === 'demo') text(root, 'p', '예제 자료(demo) · 실제 설치 패키지 조회 결과가 아닙니다.');
      else if (mode === 'disconnected') text(root, 'p', '연결 없음(disconnected)');
      text(root, 'p', 'OSV는 알려진 취약점 데이터베이스입니다. 조회 결과가 없더라도 해당 패키지나 앱 전체의 안전을 보장하지 않습니다.');
      if (status === 'idle') {
        text(root, 'p', '설치 패키지 조회 전(idle)');
        return root;
      }
      if (status === 'loading') {
        text(root, 'p', '설치 패키지 조회 중(loading) · 아직 현재 결과를 확인하지 않았습니다.');
        return root;
      }
      if (status === 'error') {
        text(root, 'p', `설치 패키지 조회 실패(error): ${safeText(error?.message)}`);
        if (hasText(error?.code) && /^[A-Z][A-Z0-9_]{0,63}$/.test(error.code)) text(root, 'p', `오류 코드(code): ${error.code}`);
        text(root, 'p', '조회 실패는 알려진 취약점이 없다는 뜻이 아닙니다. 이전 결과를 현재 결과로 표시하지 않습니다.');
        text(root, 'p', '다시 조회하려면 제공 화면의 설치 패키지 조회 버튼을 직접 누르세요. 자동으로 다시 조회하지 않습니다.');
        return root;
      }
      if (status !== 'ok' || !data) {
        text(root, 'p', '설치 패키지 조회 상태 확인 불가');
        return root;
      }
      const scanLabels = {
        complete: '모두 조회(complete)',
        partial: '일부 조회 실패(partial)',
        not_checked: '아직 조회 안 함(not_checked)',
        not_configured: '조회 준비 미완료(not_configured)',
        unverifiable: 'lock 파일 확인 불가(unverifiable)',
      };
      if (!Object.hasOwn(scanLabels, data.status)) {
        text(root, 'p', '전체 조회 상태 확인 불가');
        return root;
      }
      text(root, 'p', scanLabels[data.status]);
      if (data.status === 'not_configured') text(root, 'p', '조회 대상 프로젝트 설정이 필요합니다. 대상 경로와 허용 공개 패키지는 담당자가 준비하며 학생이 임의로 변경하지 않습니다.');
      else if (data.status === 'not_checked') text(root, 'p', '승인된 공개 조회 대상이 없는 등의 이유로 아직 조회하지 않았습니다. 알려진 취약점이 없다는 뜻이 아닙니다.');
      else if (data.status === 'unverifiable') text(root, 'p', 'package-lock.json을 확인할 수 없어 설치 목록을 대조하지 못했습니다. 알려진 취약점이 없다는 뜻이 아닙니다.');
      else if (data.status === 'partial') text(root, 'p', '일부 패키지 조회를 확인할 수 없습니다. 이미 받은 취약점 ID는 아래에 유지합니다.');
      if (Number.isSafeInteger(data.lockfileVersion)) text(root, 'p', `lock 파일 형식 버전(lockfileVersion): ${data.lockfileVersion}`);
      if (hasText(data.lockfileHash)) text(root, 'p', `lock 파일 해시(lockfileHash): ${data.lockfileHash}`);
      if (hasText(data.checkedAt)) text(root, 'p', `전체 조회 시각(checkedAt): ${data.checkedAt}`);
      text(root, 'p', '설치 버전의 원천은 서버가 package-lock.json과 설치된 node_modules 메타데이터를 대조한 값입니다. 버전 범위를 설치 버전으로 바꾸어 표시하지 않습니다.');
      if (!Array.isArray(data.packages)) {
        text(root, 'p', '패키지 조회 목록 확인 불가');
        return root;
      }
      if (data.packages.length === 0) {
        text(root, 'p', '표시할 패키지 조회 결과가 없습니다.');
        return root;
      }
      const packageLabels = {
        known_vulnerabilities: '알려진 항목 있음(known_vulnerabilities)',
        none_found: '알려진 항목 없음(none_found)',
        unverifiable: '조회 확인 불가(unverifiable)',
      };
      // 제공 코드도 정확한 SemVer를 검사합니다. 범위 표기는 학생 표시에서도 설치 버전으로 취급하지 않습니다.
      const exactVersion = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
      const table = document.createElement('table');
      text(table, 'caption', '설치 패키지별 OSV 조회 결과');
      const head = document.createElement('thead');
      const heading = document.createElement('tr');
      for (const label of ['패키지', '설치된 정확한 버전', '조회 상태', '출처(source)', '조회 시각(checkedAt)', '취약점 ID·수정 시각']) {
        text(heading, 'th', label).setAttribute('scope', 'col');
      }
      head.append(heading);
      const body = document.createElement('tbody');
      for (const pkg of data.packages) {
        const row = document.createElement('tr');
        if (hasText(pkg?.name)) row.setAttribute('data-student-package-name', pkg.name);
        const versionOk = hasText(pkg?.version) && exactVersion.test(pkg.version);
        if (versionOk) row.setAttribute('data-student-package-version', pkg.version);
        text(row, 'td', safeText(pkg?.name));
        text(row, 'td', versionOk ? pkg.version : '정확한 설치 버전 확인 불가');
        text(row, 'td', Object.hasOwn(packageLabels, pkg?.status) ? packageLabels[pkg.status] : '패키지 조회 상태 확인 불가');
        text(row, 'td', safeText(pkg?.source));
        text(row, 'td', safeText(pkg?.checkedAt));
        const findings = document.createElement('td');
        if (!Array.isArray(pkg?.vulnerabilities)) {
          text(findings, 'p', '취약점 조회 항목 확인 불가');
        } else {
          if (pkg.status === 'unverifiable') text(findings, 'p', pkg.vulnerabilities.length > 0
            ? '일부 확인·전체 조회 확인 불가 · 받은 취약점 ID를 표시합니다.'
            : '조회 확인 불가 · 알려진 취약점이 없다는 뜻이 아닙니다.');
          if (pkg.status === 'none_found') text(findings, 'p', '조회 범위와 조회 시각 기준으로 OSV에 알려진 항목이 없다는 뜻입니다.');
          if (pkg.status === 'known_vulnerabilities' && pkg.vulnerabilities.length === 0) text(findings, 'p', '알려진 항목 있음으로 전달됐지만 취약점 ID는 확인할 수 없습니다.');
          for (const finding of pkg.vulnerabilities) {
            text(findings, 'p', `취약점 ID(id): ${safeText(finding?.id)} · 수정 시각(modified): ${safeText(finding?.modified)}`);
          }
        }
        row.append(findings);
        body.append(row);
      }
      table.append(head, body);
      root.append(table);
      return root;
    },
    renderAiConnection({ status, mode, data, error, checkedAt, explanationAccepted }) {
      // 호출마다 현재 입력으로만 새 DOM을 만듭니다. 이전 오류·점검 결과는 보관하지 않습니다.
      const root = document.createElement('section');
      function text(tag, content) {
        const node = document.createElement(tag);
        node.textContent = content;
        root.append(node);
      }
      const safeText = input => {
        if (typeof input !== 'string' || input.trim() === '') return '확인 불가';
        const secret = /Bearer\s+\S+|sk-(?:proj-|ant-|svcacct-)?[A-Za-z0-9_-]{8,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:api[_ -]?key|access[_ -]?token|refresh[_ -]?token|authorization|password|비밀번호|토큰)\s*[:=]\s*\S+/i;
        return secret.test(input) ? '[비밀 정보 제외]' : input;
      };
      text('h3', '케셰브 AI 연결 점검');
      if (mode === 'demo') text('p', '예제 자료(demo) · 실제 연결 확인이 아닙니다.');
      else if (mode === 'disconnected') text('p', '연결 없음(disconnected)');
      text('p', '연결 점검은 사건 설명 실행과 별개입니다. 사건 설명은 보안 기록에서 따로 요청하고 결과를 확인하세요.');
      text('p', '자동으로 다시 점검하지 않습니다. 다시 점검하려면 제공 화면의 「현재 API 연결 점검」 버튼을 직접 누르세요.');
      if (status === 'idle') {
        text('p', 'AI 연결 점검 전(idle)');
      } else if (status === 'loading') {
        text('p', 'AI 연결 점검 중(loading)');
        text('p', '중단하려면 제공 화면의 「취소」 버튼을 누르세요.');
      } else if (status === 'ok') {
        if (data?.audienceAuthorization === 'test') {
          text('p', '시험 연결 점검(test) · 실제 운영 연결 확인이 아닙니다.');
        } else if (data?.audienceAuthorization === 'verified') {
          text('p', '앱 권한 확인 후 점검(verified) · 해당 점검 시각 기준입니다.');
        } else {
          text('p', 'AI 연결 권한 확인 불가');
        }
        text('p', `연결 응답 점검(transportChecked): ${data?.transportChecked === true ? '확인됨(true)' : '확인 불가'}`);
        text('p', `응답 모델 수(modelCount): ${Number.isSafeInteger(data?.modelCount) && data.modelCount >= 0 ? data.modelCount : '확인 불가'}`);
        text('p', `점검 시각(checkedAt): ${safeText(checkedAt)}`);
        // 공식 연결 점검 입력의 explanationAccepted는 false이며 설명 성공의 증거가 아닙니다.
        text('p', explanationAccepted === false
          ? '사건 설명은 아직 실행하지 않았습니다.'
          : '이 연결 점검 결과로 사건 설명 실행 여부를 확인할 수 없습니다.');
      } else if (status === 'error') {
        const guidance = {
          ON_AI_PROVISIONING_PENDING: '앱 권한 발급·연결 준비 중입니다. 학생 코드 오류로 단정할 수 없습니다. 담당자에게 계정 연결과 앱 권한을 확인해 달라고 요청하세요.',
          AI_REQUEST_UNVERIFIED: 'AI 연결 또는 응답 확인 불가입니다. 담당자에게 계정 연결과 앱 권한 확인을 요청하세요.',
          SUBJECT_SCOPE_UNVERIFIED: '계정·사건·프로젝트 연결 확인 불가입니다. 담당자에게 계정 연결과 앱 권한 확인을 요청하세요.',
          ON_AI_AUTHORIZATION_CHANGED: '점검 중 권한이 변경됐습니다. 담당자에게 현재 계정 연결과 앱 권한 확인을 요청하세요.',
          WB_CLCO_AUTH_REQUIRED: '인증 실패입니다. 계정 연결을 다시 확인하고 담당자에게 확인을 요청하세요.',
          WB_CLCO_ACCESS_BLOCKED: '접근이 제한됐습니다. 계정 연결과 앱 이용 권한을 담당자에게 확인하세요.',
          WB_CLCO_COHORT_BUDGET_EXHAUSTED: '반의 AI 사용량이 소진됐습니다. 담당자에게 확인하세요.',
          WB_CLCO_LIMIT_REACHED: 'AI 이용 한도에 도달했습니다. 담당자에게 확인하세요.',
          WB_CLCO_SESSION_CLOSED: '현재 AI 이용 시간이 아닙니다. 이용 시간을 확인하세요.',
          WB_CLCO_RATE_LIMITED: '요청이 제한됐습니다. 잠시 뒤 직접 다시 점검하세요.',
          WB_CLCO_TIMEOUT: '요청 시간이 초과됐습니다. 잠시 뒤 직접 다시 점검하세요.',
          REQUEST_TIMEOUT: '요청 시간이 초과됐습니다. 잠시 뒤 직접 다시 점검하세요.',
          ENGINE_TIMEOUT: '서버 확인 시간이 초과됐습니다. 잠시 뒤 직접 다시 점검하세요.',
          TIMEOUT: '요청 시간이 초과됐습니다. 잠시 뒤 직접 다시 점검하세요.',
          WB_CLCO_NETWORK_ERROR: '네트워크 연결에 실패했습니다. 잠시 뒤 직접 다시 점검하세요.',
          WB_CLCO_SERVER_UNAVAILABLE: 'AI 서버가 응답하지 않습니다. 잠시 뒤 직접 다시 점검하세요.',
          WB_CLCO_CANCELLED: '점검이 취소됐습니다. 이전 결과는 현재 결과가 아닙니다.',
          CANCELLED: '점검이 취소됐습니다. 이전 결과는 현재 결과가 아닙니다.',
          REQUEST_CANCELLED: '점검이 취소됐습니다. 이전 결과는 현재 결과가 아닙니다.',
          ON_AI_MODEL_LIST_EMPTY: '사용할 수 있는 모델이 없습니다. 담당자에게 모델 허용 설정 확인을 요청하세요.',
          MODEL_NOT_CONFIGURED: '사용할 모델이 설정되지 않았습니다. 담당자에게 모델 허용 설정 확인을 요청하세요.',
        };
        // 제공 화면에서 안전하게 정규화한 code/message만 사용하며 원본 오류·help 전체는 표시하지 않습니다.
        const known = typeof error?.code === 'string' && Object.hasOwn(guidance, error.code);
        text('p', 'AI 연결 점검 실패 또는 확인 불가(error)');
        text('p', `오류 코드(code): ${known ? error.code : 'AI_REQUEST_UNVERIFIED'}`);
        text('p', `오류 안내(message): ${known ? safeText(error.message) : 'AI 연결 또는 응답을 확인할 수 없습니다.'}`);
        text('p', known ? guidance[error.code] : guidance.AI_REQUEST_UNVERIFIED);
      } else {
        text('p', 'AI 연결 점검 상태 확인 불가');
      }
      return root;
    },
    renderExplanation({ event, explanation, checkedAt }) {
      const root = document.createElement('section');
      function text(tag, content) {
        const node = document.createElement(tag);
        node.textContent = content;
        root.append(node);
      }
      const safeText = input => {
        if (typeof input !== 'string' || input.trim() === '') return '확인 불가';
        const secret = /Bearer\s+\S+|sk-(?:proj-|ant-|svcacct-)?[A-Za-z0-9_-]{8,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:api[_ -]?key|access[_ -]?token|refresh[_ -]?token|authorization|password|비밀번호|토큰)\s*[:=]\s*\S+/i;
        return secret.test(input) ? '[비밀 정보 제외]' : input;
      };
      // 현재 입력만으로 새 DOM을 반환합니다. 이전 사건의 설명·성공 속성을 재사용하지 않습니다.
      text('h3', 'AI 설명(참고용)');
      if (explanation?.mode === 'demo') text('p', '예제 설명(demo) · 실제 AI 실행 결과가 아닙니다.');
      const codes = new Set([
        'ON_AI_PROVISIONING_PENDING', 'ON_AI_AUTHORIZATION_CHANGED', 'SUBJECT_SCOPE_UNVERIFIED',
        'WB_CLCO_AUTH_REQUIRED', 'WB_CLCO_ACCESS_BLOCKED', 'WB_CLCO_COHORT_BUDGET_EXHAUSTED',
        'WB_CLCO_LIMIT_REACHED', 'WB_CLCO_SESSION_CLOSED', 'WB_CLCO_RATE_LIMITED',
        'WB_CLCO_TIMEOUT', 'REQUEST_TIMEOUT', 'ENGINE_TIMEOUT', 'TIMEOUT',
        'WB_CLCO_NETWORK_ERROR', 'WB_CLCO_SERVER_UNAVAILABLE',
        'WB_CLCO_CANCELLED', 'REQUEST_CANCELLED', 'CANCELLED',
        'MODEL_NOT_CONFIGURED', 'ON_AI_MODEL_LIST_EMPTY', 'ON_AI_INVALID_INPUT',
        'ON_AI_INVALID_OUTPUT', 'AI_REQUEST_UNVERIFIED',
      ]);
      function failure(reason) {
        text('p', `AI 설명 실패 또는 확인 불가: ${reason}`);
        if (codes.has(explanation?.error?.code)) text('p', `오류 코드(code): ${explanation.error.code}`);
        text('p', '기록은 그대로 유지됩니다.');
        text('p', 'AI 설명의 실패는 과제 실패를 뜻하지 않습니다.');
        return root;
      }
      // 잘못된 입력 때문에 event가 null인 실패도 있으므로 오류를 먼저 표시합니다.
      if (explanation?.status === 'error') {
        const known = codes.has(explanation.error?.code);
        text('p', 'AI 설명 실패(error)');
        text('p', `오류 코드(code): ${known ? explanation.error.code : 'AI_REQUEST_UNVERIFIED'}`);
        text('p', `오류 안내(message): ${known ? safeText(explanation.error.message) : 'AI 설명 결과를 확인할 수 없습니다.'}`);
        const reasons = {
          ON_AI_INVALID_INPUT: '설명에 필요한 사건 근거·규칙이 부족하거나 입력 형식을 확인할 수 없습니다.',
          ON_AI_INVALID_OUTPUT: '근거 ID·제안·미실행 여부 등 설명 응답이 현재 기록의 계약과 맞지 않습니다.',
          SUBJECT_SCOPE_UNVERIFIED: '현재 로그인과 사건·프로젝트의 연결을 확인할 수 없습니다.',
        };
        if (Object.hasOwn(reasons, explanation.error?.code)) text('p', reasons[explanation.error.code]);
        text('p', '기록은 그대로 유지됩니다. AI 설명의 실패는 과제 실패를 뜻하지 않습니다.');
        return root;
      }
      if (!event) {
        text('p', '보안 기록에서 기록을 먼저 고르세요.');
        return root;
      }
      if (explanation?.status === 'loading') {
        text('p', `사건 ID: ${safeText(event.id)}`);
        text('p', 'AI 사건 설명 요청 중(loading) · 아직 결과를 확인하지 않았습니다.');
        return root;
      }
      if (explanation?.status === 'idle' || !explanation) {
        text('p', `사건 ID: ${safeText(event.id)}`);
        text('p', 'AI 사건 설명 실행 전(idle) · 연결 점검만으로 사건 설명이 실행되지는 않습니다.');
        return root;
      }
      if (explanation.status !== 'ok') return failure('설명 요청 상태를 확인할 수 없습니다.');
      const data = explanation.data;
      const validText = input => typeof input === 'string' && input.trim() !== '' && safeText(input) === input;
      if (!validText(event.id) || !validText(data?.summary)) return failure('사건 ID 또는 설명 요약을 확인할 수 없습니다.');
      if (data.executed !== false) return failure('AI가 이미 실행했다고 답했거나 미실행 여부를 확인할 수 없어 이 설명을 사용할 수 없습니다.');
      if (data.requiresHumanConfirmation !== true) return failure('사람의 확인이 필요한 제안인지 확인할 수 없습니다.');
      if (!Array.isArray(event.evidence) || event.evidence.length === 0
        || !Array.isArray(data.evidenceIds) || data.evidenceIds.length === 0) {
        return failure('사건 설명에 필요한 근거가 부족합니다.');
      }
      const evidence = new Map();
      for (const entry of event.evidence) {
        if (!validText(entry?.id) || !validText(entry?.text) || evidence.has(entry.id)) return failure('현재 사건의 근거 ID 또는 근거 문장을 확인할 수 없습니다.');
        evidence.set(entry.id, entry.text);
      }
      const refsMatch = refs => Array.isArray(refs) && refs.length > 0
        && new Set(refs).size === refs.length && refs.every(id => evidence.has(id));
      if (!refsMatch(data.evidenceIds) || data.evidenceIds.length !== evidence.size) {
        return failure('인용한 근거 ID가 현재 사건의 근거와 맞지 않아 이 설명을 사용할 수 없습니다.');
      }
      if (!Array.isArray(event.rules) || event.rules.some(rule => !validText(rule?.id) || !validText(rule?.text))) {
        return failure('현재 사건의 규칙 ID 또는 규칙 문장을 확인할 수 없습니다.');
      }
      if (!event.state || !Array.isArray(event.supportedActions) || !Array.isArray(data.proposals)) {
        return failure('현재 상태 또는 지원 조치·제안 정보를 확인할 수 없습니다.');
      }
      for (const proposal of data.proposals) {
        if (!validText(proposal?.action) || !validText(proposal?.reason)
          || !event.supportedActions.includes(proposal.action) || !refsMatch(proposal.evidenceIds)) {
          return failure('제안의 조치 또는 근거가 현재 사건과 맞지 않아 이 설명을 사용할 수 없습니다.');
        }
      }
      // 모든 대조가 끝난 성공 화면에만 사건 연결 속성을 붙입니다.
      root.setAttribute('data-student-explanation-event', event.id);
      text('p', 'AI 사건 설명 응답 확인(ok)');
      text('p', `사건 ID: ${event.id}`);
      text('p', `AI 요약: ${data.summary}`);
      text('p', `설명 확인 시각(checkedAt): ${safeText(checkedAt)}`);
      text('p', 'AI 설명은 해석입니다. 사실 판단은 근거 글과 연동 시스템이 알려 준 현재 상태를 기준으로 하세요.');
      text('h4', '인용한 근거');
      for (const id of data.evidenceIds) text('p', `${id} — ${evidence.get(id)}`);
      text('h4', '현재 사건의 규칙');
      if (event.rules.length === 0) text('p', '제공된 규칙이 없습니다.');
      for (const rule of event.rules) text('p', `${rule.id} — ${rule.text}`);
      text('h4', '확인 불가 상태');
      let unknownCount = 0;
      for (const [key, label] of [['access', '접속'], ['session', '세션'], ['device', '기기']]) {
        if (event.state[key] === 'unknown') {
          text('p', `${label}: 확인 불가(unknown)`);
          unknownCount += 1;
        }
      }
      if (unknownCount === 0) text('p', '없음');
      text('h4', 'AI 조치 제안');
      if (data.proposals.length === 0) {
        text('p', event.supportedActions.length === 0
          ? '연동 시스템이 지원하는 조치가 없어 제안이 없습니다(정상).'
          : 'AI가 제안한 조치가 없습니다.');
      } else {
        for (const proposal of data.proposals) {
          text('p', `조치(action): ${proposal.action}`);
          text('p', `제안 이유(reason): ${proposal.reason}`);
          for (const id of proposal.evidenceIds) text('p', `제안 근거: ${id} — ${evidence.get(id)}`);
          text('p', '사람 확인이 필요하며 실행되지 않았습니다.');
        }
      }
      text('p', '설명·제안만으로 보안 조치가 실행되지는 않습니다(executed: false).');
      return root;
    },
    renderAction({ status, event, actionId, target, receipt, observation, message, confirmationExpiresAt, error }) {
      // 현재 입력만으로 새 DOM을 반환합니다. 이전 대상·요청·결과나 확인 정보를 보관하지 않습니다.
      const root = document.createElement('section');
      function text(tag, content) {
        const node = document.createElement(tag);
        node.textContent = content;
        root.append(node);
      }
      const safeText = input => {
        if (typeof input !== 'string' || input.trim() === '') return '확인 불가';
        const secret = /Bearer\s+\S+|sk-(?:proj-|ant-|svcacct-)?[A-Za-z0-9_-]{8,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:api[_ -]?key|access[_ -]?token|refresh[_ -]?token|authorization|password|비밀번호|토큰)\s*[:=]\s*\S+/i;
        return secret.test(input) ? '[비밀 정보 제외]' : input;
      };
      const hasText = input => typeof input === 'string' && input.trim() !== '' && safeText(input) === input;
      const labels = {
        idle: '아직 미실행(idle)',
        loading: '조치 준비 또는 결과 조회 중(loading)',
        prepared: '준비됨·미실행(prepared)',
        executing: '서버에 전달 중(executing)',
        pending: '서버 접수·처리 중(pending)',
        succeeded: '효과 확인(succeeded)',
        denied: '거절(denied)',
        failed: '실패(failed)',
        unknown: '결과 불명(unknown)',
        expired: '확인 기한 지남(expired)',
        error: '요청 처리 안 됨(error)',
      };
      const effectConfirmed = status === 'succeeded' && observation?.effectApplied === true;
      const displayStatus = status === 'succeeded' && !effectConfirmed
        ? 'unknown' : Object.hasOwn(labels, status) ? status : 'unknown';
      text('h3', '케셰브 보안 조치 상태');
      text('p', labels[displayStatus]);
      if (displayStatus !== status && hasText(status)) text('p', `전달된 상태(status): ${status}`);
      text('p', 'AI 조치 제안은 실행 결과가 아닙니다. 실제 대상과 조치는 제공 화면에서 사람이 확인해야 하며, 서버 접수와 연동 시스템 효과 확인은 별개입니다.');
      if (hasText(event?.id)) {
        root.setAttribute('data-student-action-event', event.id);
        text('p', `사건 ID(event.id): ${event.id}`);
      }
      if (Array.isArray(event?.evidence)) {
        for (const evidence of event.evidence) {
          if (hasText(evidence?.id)) text('p', `근거 ID: ${evidence.id}`);
        }
      }
      if (hasText(actionId)) text('p', `조치 ID(actionId): ${actionId}`);
      if (hasText(target?.id)) text('p', `실제 대상 ID(target.id): ${target.id}`);
      if (Number.isSafeInteger(target?.generation)) text('p', `대상 세대(target.generation): ${target.generation}`);
      if (hasText(receipt?.requestId)) {
        root.setAttribute('data-student-action-request', receipt.requestId);
        text('p', `요청 ID(requestId): ${receipt.requestId}`);
      }
      if (hasText(receipt?.receiptId)) text('p', `접수증 ID(receiptId): ${receipt.receiptId}`);
      if (Number.isSafeInteger(receipt?.version)) text('p', `결과 버전(version): ${receipt.version}`);
      if (typeof receipt?.replayed === 'boolean') {
        text('p', `기존 요청 결과 재사용(replayed): ${receipt.replayed} · 이 값은 새 조치 실행이나 효과 확인을 뜻하지 않습니다.`);
      }
      if (event && Array.isArray(event.supportedActions) && event.supportedActions.length === 0) {
        text('p', '연동 시스템이 지원하는 조치가 없어 조치 준비 버튼이 나오지 않는 것이 정상입니다.');
      }
      if (displayStatus === 'idle') {
        if (hasText(message)) text('p', message);
      } else if (displayStatus === 'loading') {
        text('p', '조치 준비 또는 결과 조회 응답을 기다리고 있습니다. 현재 처리 결과는 아직 확인되지 않았습니다.');
      } else if (displayStatus === 'prepared') {
        text('p', `사람 확인 기한(confirmationExpiresAt): ${safeText(confirmationExpiresAt)}`);
        text('p', '아직 실행되지 않았습니다. 제공 화면에서 실제 대상·세대·조치를 확인한 뒤 「대상과 조치를 확인했으며 집행합니다」 버튼을 사용하세요.');
      } else if (displayStatus === 'executing') {
        text('p', '조치 요청을 서버에 전송하고 있습니다. 처리 결과와 실제 효과는 아직 확인되지 않았습니다.');
      } else if (displayStatus === 'pending') {
        text('p', '서버가 요청을 접수했습니다(ACK). 처리 결과와 실제 효과는 아직 확인되지 않았습니다.');
      } else if (effectConfirmed) {
        text('p', `관측 시각(observation.observedAt): ${safeText(observation.observedAt)}`);
        text('p', 'effectApplied: true');
        if (!hasText(receipt?.receiptId)) text('p', '접수증 ID(receiptId): 확인 불가');
      } else if (displayStatus === 'denied' || displayStatus === 'failed') {
        text('p', `처리 안내(message): ${safeText(message)}`);
      } else if (displayStatus === 'unknown') {
        text('p', '성공이나 효과 없음으로 판단하지 마세요. 조치를 다시 집행하지 말고 제공 화면의 「연동 시스템 결과만 재조회」 버튼으로 현재 요청 결과만 확인하세요.');
      } else if (displayStatus === 'expired') {
        if (hasText(confirmationExpiresAt)) text('p', `사람 확인 기한(confirmationExpiresAt): ${confirmationExpiresAt}`);
        text('p', '이 준비의 확인 기한이 지났습니다. 현재 사건에서 조치를 다시 준비하고 대상과 조치를 확인하세요.');
      }
      const codes = new Set([
        'ACTION_UNSUPPORTED', 'ACTION_DENIED', 'ACTION_CONFIRMATION_EXPIRED', 'ACTION_CONFIRMATION_INVALID',
        'ACTION_SCOPE_CHANGED', 'ACTION_SCOPE_UNVERIFIED', 'SUBJECT_SCOPE_UNVERIFIED', 'ACTION_SNAPSHOT_CHANGED',
        'ACTION_EVENT_UNAVAILABLE', 'ACTION_TIMEOUT', 'ACTION_STORE_FAILED', 'ACTION_RESULT_UNVERIFIED',
      ]);
      if (error || displayStatus === 'error') {
        const known = codes.has(error?.code);
        text('p', `오류 코드(code): ${known ? error.code : 'ACTION_RESULT_UNVERIFIED'}`);
        text('p', `오류 안내(message): ${known ? safeText(error.message) : '조치 요청 또는 결과를 확인할 수 없습니다.'}`);
      }
      text('p', '학생 화면은 요청을 보내거나 자동 재집행하지 않습니다. 조작은 제공 화면의 버튼을 사용하세요.');
      text('p', '「조치 화면 취소」는 이미 서버에 전달된 조치의 효과를 되돌리는 기능이 아닙니다.');
      return root;
    },
  };
  installStudentDashboard(view, api);
  return view;
}

// 제공 슬롯 안의 DOM만 꾸밉니다. 제공 화면·전역 상태·인증·조치 경로는 변경하지 않습니다.
function installStudentDashboard(view, api) {
  const text = (parent, tag, content) => {
    const node = document.createElement(tag);
    node.textContent = content;
    parent.append(node);
    return node;
  };
  const record = x => x !== null && typeof x === 'object' && !Array.isArray(x);
  const id = x => typeof x === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/.test(x);
  const line = x => typeof x === 'string' && x.length <= 2000;
  const time = x => typeof x === 'string' && Number.isFinite(Date.parse(x));
  const device = x => ['compliant', 'noncompliant', 'unknown'].includes(x);
  const session = x => ['active', 'expired', 'revoked', 'unknown'].includes(x);
  const rows = x => Array.isArray(x) && x.every(r => record(r) && id(r.id) && line(r.text));
  const validators = {
    me: d => record(d) && [d.user, d.device, d.session].every(r => record(r) && id(r.id))
      && line(d.user.label) && line(d.device.label) && device(d.device.status) && session(d.session.status),
    devices: d => Array.isArray(d) && d.every(r => record(r) && id(r.id) && line(r.label) && device(r.status)),
    sessions: d => Array.isArray(d) && d.every(r => record(r) && id(r.id) && session(r.status)),
    events: d => Array.isArray(d) && new Set(d.map(r => r?.id)).size === d.length && d.every(r => record(r) && id(r.id)
      && ['access', 'xdr'].includes(r.kind) && time(r.at) && line(r.summary) && (r.appId == null || id(r.appId))
      && rows(r.evidence) && rows(r.rules) && record(r.state) && ['allowed', 'denied', 'unknown'].includes(r.state.access)
      && session(r.state.session) && device(r.state.device) && Array.isArray(r.supportedActions) && r.supportedActions.every(id)),
    vulnerabilities: d => {
      if (!record(d) || !time(d.checkedAt) || !Array.isArray(d.packages) || d.packages.length > 256) return false;
      if (['not_configured', 'unverifiable'].includes(d.status)) return d.packages.length === 0
        && d.code === (d.status === 'not_configured' ? 'PROJECT_NOT_CONFIGURED' : 'LOCKFILE_UNVERIFIABLE');
      if (!['complete', 'partial', 'not_checked'].includes(d.status)
        || ![1, 2, 3].includes(d.lockfileVersion) || !/^[a-f0-9]{64}$/.test(d.lockfileHash)
        || !record(d.excluded) || !Number.isSafeInteger(d.excluded.count) || d.excluded.count < 0) return false;
      if (d.status === 'not_checked') return d.code === 'NO_APPROVED_PACKAGES' && d.packages.length === 0;
      const semver = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
      const seen = new Set();
      if (!d.packages.every(p => {
        if (!record(p) || typeof p.name !== 'string' || !/^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/.test(p.name)
          || typeof p.version !== 'string' || !semver.test(p.version) || seen.has(`${p.name}@${p.version}`)
          || !['known_vulnerabilities', 'none_found', 'unverifiable'].includes(p.status)
          || p.source !== 'https://api.osv.dev/v1/querybatch' || !time(p.checkedAt) || !Array.isArray(p.vulnerabilities)) return false;
        seen.add(`${p.name}@${p.version}`);
        return p.vulnerabilities.every(v => record(v) && typeof v.id === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(v.id) && time(v.modified))
          && (p.status !== 'none_found' || p.vulnerabilities.length === 0)
          && (p.status !== 'known_vulnerabilities' || p.vulnerabilities.length > 0);
      })) return false;
      return d.status === 'partial' ? d.packages.some(p => p.status === 'unverifiable') : d.packages.every(p => p.status !== 'unverifiable');
    },
  };
  // GET 응답의 선택 coverage도 제공 화면과 같은 범위·시각 조건으로 확인합니다.
  function coverageValid(kind, c, data, start, end) {
    const rule = { devices: ['own-registered-devices', 100], sessions: ['current-verified-connection', 1], events: ['own-recorded-events', 40] }[kind];
    const keys = ['schema', 'kind', 'scope', 'limit', 'total', 'returned', 'truncated', 'observedAtMs'];
    if (!rule || !record(c) || Object.keys(c).length !== keys.length || !keys.every(k => Object.hasOwn(c, k))) return false;
    return c.schema === 'alekov.sdp.coverage.v1' && c.kind === kind && c.scope === rule[0] && c.limit === rule[1]
      && Array.isArray(data) && Number.isSafeInteger(c.total) && Number.isSafeInteger(c.returned)
      && c.returned >= 0 && c.returned <= c.limit && c.returned === data.length && c.total >= c.returned
      && typeof c.truncated === 'boolean' && c.truncated === (c.total > c.returned)
      && (kind !== 'sessions' || (c.total === 1 && c.returned === 1 && !c.truncated))
      && Number.isSafeInteger(c.observedAtMs) && c.observedAtMs > 0 && Number.isFinite(new Date(c.observedAtMs).getTime())
      && c.observedAtMs >= start - 5000 && c.observedAtMs <= end + 5000 && end - c.observedAtMs <= 20000;
  }
  const failure = (code, message, mode) => ({ status: 'error', mode, error: { code, message } });
  async function read(kind) {
    const start = Date.now();
    try {
      const result = await api.get(`/api/${kind}`);
      const end = Date.now();
      const mode = ['connected', 'demo', 'disconnected'].includes(result?.meta?.mode) ? result.meta.mode : null;
      if (result?.ok !== true) {
        // 원문 예외·알 수 없는 서버 오류 대신 안전한 고정 안내를 표시합니다.
        const code = result?.error?.code;
        if (code === 'ENGINE_NOT_CONNECTED') return failure(code, 'SDP 미연결입니다. 제공 화면에서 계정 연결을 확인하세요.', mode);
        if (['TIMEOUT', 'REQUEST_TIMEOUT', 'ENGINE_TIMEOUT'].includes(code)) return failure('TIMEOUT', '조회 시간이 초과됐습니다. 잠시 후 직접 다시 조회하세요.', mode);
        return failure('LOOKUP_UNVERIFIED', '이 항목을 조회하지 못했습니다. 제공 화면의 도움정보를 확인하고 직접 다시 조회하세요.', mode);
      }
      if (!mode || !validators[kind](result.data)
        || (Object.hasOwn(result, 'coverage') && ['devices', 'sessions', 'events'].includes(kind)
          && !coverageValid(kind, result.coverage, result.data, start, end))) {
        return failure('CONTRACT_MISMATCH', '응답 형식이나 조회 범위를 확인할 수 없습니다. 제공 화면의 도움정보를 확인하세요.', mode);
      }
      return { status: 'ok', mode, data: result.data, checkedAt: time(result.meta?.checkedAt) ? result.meta.checkedAt : null };
    } catch {
      return failure('LOOKUP_UNVERIFIED', '조회 응답을 확인할 수 없습니다. 로컬 앱 실행 상태를 확인하고 직접 다시 조회하세요.', null);
    }
  }
  const statusText = r => r?.status === 'loading' ? '조회 중' : r?.status === 'error' ? '조회 실패 · 확인 불가'
    : r?.status === 'ok' ? '응답 확인' : '조회 전 · 확인 불가';
  const origin = r => r?.mode === 'demo' ? '예시 · 실제 조회 결과 아님' : r?.mode === 'disconnected' ? 'SDP 미연결(disconnected)'
    : r?.mode === 'connected' ? '연동 시스템 응답 · 로컬 PC 실측 아님' : '출처 확인 불가';
  function identityCards(parent, input) {
    const grid = document.createElement('div');
    grid.setAttribute('style', 'display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,210px),1fr));gap:12px;margin:12px 0');
    const me = input.me;
    const data = me?.status === 'ok' ? me.data : null;
    const deviceLabels = { compliant: '보안 기준 충족', noncompliant: '보안 기준 미충족', unknown: '확인 불가' };
    const sessionLabels = { active: '활성', expired: '만료', revoked: '철회됨', unknown: '확인 불가' };
    for (const [title, value] of [
      ['사용자', data?.user?.label],
      ['기기', data?.device ? `${data.device.label} · ${deviceLabels[data.device.status] || '확인 불가'}(${data.device.status})` : null],
      ['세션', data?.session ? `${sessionLabels[data.session.status] || '확인 불가'}(${data.session.status})` : null],
      ['자료 출처', origin(me)],
    ]) {
      const card = document.createElement('section');
      card.setAttribute('style', 'border:1px solid currentColor;border-radius:12px;padding:14px;overflow-wrap:anywhere');
      text(card, 'h4', title);
      text(card, 'p', value || statusText(me));
      grid.append(card);
    }
    parent.append(grid);
    text(parent, 'p', '사용자·기기·세션 정보입니다. CPU·메모리·디스크 실측 카드는 제공 데이터 준비 후 연결합니다.');
  }
  for (const [name, title, kinds] of [
    ['renderIdentity', '1. 계정·기기·세션 확인', ['me', 'devices', 'sessions']],
    ['renderEvents', '2. 보안 기록 확인', ['events']],
    ['renderVulnerabilities', '3. 설치 패키지 조회', ['vulnerabilities']],
  ]) {
    const original = view[name];
    let cell;
    view[name] = input => {
      const key = JSON.stringify(input);
      if (!cell || key !== cell.key) {
        if (cell) { cell.sequence++; clearTimeout(cell.timer); }
        cell = { key, input, sequence: 0, busy: false, current: null, times: [], root: document.createElement('section') };
      }
      const current = cell;
      function paint() {
        const focused = typeof document !== 'undefined' && document.activeElement === current.button;
        current.root.replaceChildren();
        current.root.setAttribute('aria-busy', String(current.busy));
        text(current.root, 'h3', title);
        const button = text(current.root, 'button', '다시 조회');
        current.button = button;
        button.type = 'button';
        // aria-disabled로 포커스를 유지하고 click에서도 중복 요청을 차단합니다.
        button.setAttribute('aria-disabled', String(current.busy || typeof api?.get !== 'function'));
        button.setAttribute('aria-label', `${title} 다시 조회`);
        const progress = text(current.root, 'p', current.busy ? '조회 중 · 응답을 기다리고 있습니다.'
          : typeof api?.get !== 'function' ? '학생 조회 연결을 사용할 수 없습니다. 제공 화면의 다시 불러오기를 사용하세요.' : '버튼을 누를 때만 다시 조회합니다. 제공 공통 화면과 별도로 이 학생 영역만 갱신합니다.');
        progress.setAttribute('role', 'status');
        progress.setAttribute('aria-live', 'polite');
        const effective = current.current || current.input;
        const resources = name === 'renderIdentity' ? kinds.map(k => [k, effective[k]]) : [[kinds[0], effective]];
        for (const [kind, resource] of resources) {
          text(current.root, 'p', `${kind}: ${statusText(resource)} · ${origin(resource)}`);
          text(current.root, 'p', `${kind} 원천 확인 시각: ${resource?.checkedAt || '확인 불가 · 제공 입력에 시각 없음'}`);
          if (resource?.status === 'error') {
            const code = ['ENGINE_NOT_CONNECTED', 'TIMEOUT', 'CONTRACT_MISMATCH', 'LOOKUP_UNVERIFIED'].includes(resource.error?.code) ? resource.error.code : 'LOOKUP_UNVERIFIED';
            text(current.root, 'p', `${kind} 조회 실패(${code}): 예시로 대체하지 않습니다. 계정 연결·앱 실행 상태를 확인한 뒤 직접 다시 조회하세요. 권한 문제가 계속되면 담당자에게 문의하세요.`);
          }
        }
        if (name === 'renderIdentity') identityCards(current.root, effective);
        text(current.root, 'h4', '상세 결과');
        current.root.append(original(effective));
        if (current.times.length) {
          text(current.root, 'h4', '최근 학생 영역 조회 기록');
          const list = document.createElement('ul');
          for (const item of current.times) text(list, 'li', item);
          current.root.append(list);
          text(current.root, 'p', '이 시각은 요청 종료 시각이며 PC 측정 시각이 아닙니다. 이 화면의 최근 5회만 보관하고 입력 변경·새로고침 시 지웁니다.');
        }
        button.addEventListener('click', () => {
          if (current !== cell || current.busy || typeof api?.get !== 'function') return;
          current.busy = true;
          const sequence = ++current.sequence;
          const loading = k => ({ status: 'loading', mode: (name === 'renderIdentity' ? current.input[k] : current.input)?.mode });
          current.current = name === 'renderIdentity' ? Object.fromEntries(kinds.map(k => [k, loading(k)])) : loading(kinds[0]);
          paint();
          const finish = results => {
            if (current !== cell || current.sequence !== sequence) return;
            clearTimeout(current.timer);
            current.busy = false;
            current.current = name === 'renderIdentity' ? Object.fromEntries(kinds.map((k, i) => [k, results[i]])) : results[0];
            current.times.unshift(`${new Date().toISOString()} · ${kinds.map((k, i) => `${k}: ${statusText(results[i])} · ${origin(results[i])}`).join(' / ')}`);
            current.times = current.times.slice(0, 5);
            current.sequence++;
            paint();
          };
          current.timer = setTimeout(() => finish(kinds.map(() => failure('TIMEOUT', '조회 시간이 초과됐습니다. 직접 다시 조회하세요.', null))), 15000);
          Promise.all(kinds.map(read)).then(finish);
        });
        if (focused && typeof button.focus === 'function') button.focus();
      }
      paint();
      return current.root;
    };
  }
}

