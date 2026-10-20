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
    renderEvents() { return '학생 구현 대기: 본인 접속·XDR 기록을 연결하세요.'; },
    renderStatus() { return '학생 구현 대기: 기기·세션·알림과 연결 점검 상태를 구분하세요.'; },
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
    renderAiConnection() { return '학생 구현 대기: 모델 응답 점검과 실제 사건 설명을 구분하고 AI 오류·취소·수동 복구를 안내하세요.'; },
    renderExplanation() { return '학생 구현 대기: 선택한 사건의 근거·규칙·현재 상태와 AI 설명을 연결하세요. 제안은 자동 실행하지 않습니다.'; },
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}
