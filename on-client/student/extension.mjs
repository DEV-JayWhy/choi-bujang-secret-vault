// 이 파일은 학생이 같은 프로젝트에서 이어서 구현합니다.
// 제공 UI를 받은 것만으로 단계 완료를 인정하지 않습니다.
export function createStudentView() {
  return {
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
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
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
      text('h3', '보안 사건 AI 설명');
      if (explanation?.mode === 'demo') text('p', '예제 설명(demo) · 실제 AI 실행 결과가 아닙니다.');
      if (explanation?.status === 'ok') {
        if (typeof event?.id !== 'string' || event.id.trim() === '' || safeText(event.id) !== event.id
          || typeof explanation.data?.summary !== 'string' || explanation.data.summary.trim() === '') {
          text('p', '사건 설명 확인 불가: 사건 ID 또는 설명 요약을 확인할 수 없습니다.');
          text('p', '기록은 그대로 유지됩니다.');
          return root;
        }
        root.setAttribute('data-student-explanation-event', event.id);
        text('p', `사건 ID: ${event.id}`);
        text('p', `AI 설명: ${safeText(explanation.data.summary)}`);
        text('p', `설명 확인 시각(checkedAt): ${safeText(checkedAt)}`);
        text('p', 'AI 설명은 참고용입니다. 기존 사건 기록과 함께 확인하세요.');
      } else if (explanation?.status === 'error') {
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
        const known = codes.has(explanation.error?.code);
        text('p', 'AI 사건 설명 실패 또는 확인 불가(error)');
        text('p', `오류 코드(code): ${known ? explanation.error.code : 'AI_REQUEST_UNVERIFIED'}`);
        text('p', `오류 안내(message): ${known ? safeText(explanation.error.message) : 'AI 설명 결과를 확인할 수 없습니다.'}`);
        text('p', '기록은 그대로 유지됩니다.');
      } else if (explanation?.status === 'loading') {
        text('p', 'AI 사건 설명 요청 중(loading) · 아직 결과를 확인하지 않았습니다.');
      } else {
        text('p', 'AI 사건 설명 실행 전(idle) · 연결 점검만으로 사건 설명이 실행되지는 않습니다.');
      }
      return root;
    },
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}

