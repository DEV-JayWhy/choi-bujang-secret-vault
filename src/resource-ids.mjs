// 서버가 구별하는 자원 이름 공간입니다. 자원 ID는 소유권·강사 권한 증명이 아닙니다.
export const RESOURCE_KINDS = Object.freeze({
  note: 'private_note',
  instructorNotice: 'instructor_notice', // 기존 공지 저장소/경로가 확인될 때 연결합니다.
});
export const NOTES_COLLECTION_RESOURCE_ID = 'private_note:collection';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

export function resourceId(kind, id) {
  if (!Object.values(RESOURCE_KINDS).includes(kind)
      || typeof id !== 'string' || !UUID.test(id)) {
    throw new TypeError('INVALID_RESOURCE_ID');
  }
  return `${kind}:${id.toLowerCase()}`;
}
