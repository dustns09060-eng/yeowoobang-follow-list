# 여우방 팔로우리스트 V11

## 변경사항
- 카드칸 더 축소
- 조별 복사만 유지
- 관리자 모드 추가
- 관리자 비밀번호: 0702
- 공지 작성 UI 추가
- 명단 추가/수정/삭제 UI 추가

## 중요한 점
GitHub Pages는 정적 사이트라서 구글시트를 직접 수정할 수 없습니다.
관리자 모드의 추가/수정/삭제/공지 저장을 실제로 작동시키려면 `apps-script-admin-backend-Code.gs`를 Apps Script에 배포한 뒤, `script.js`의 `APPS_SCRIPT_API_URL`에 배포 URL을 넣어야 합니다.

## GitHub에 올릴 파일
- index.html
- style.css
- script.js
- manifest.json
- sw.js
- icon-192.png
- icon-512.png

`apps-script-admin-backend-Code.gs`와 README.md는 참고용입니다.
