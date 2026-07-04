# 여우방 팔로우리스트 V15

- 로고 깨짐 수정: `icon-192.png`를 상단 로고로 직접 사용합니다.
- 관리자 비밀번호 입력 힌트에서 `0702` 노출 제거.
- 기본 공지/샘플 공지 없음.
- 카드 compact UI.
- 관리자 모드 비밀번호: `0702`.

## GitHub 업로드 파일
압축을 풀고 아래 파일을 저장소 루트에 업로드하세요.

- index.html
- style.css
- script.js
- manifest.json
- sw.js
- icon-192.png
- icon-512.png

## 관리자 실제 저장 연결
GitHub Pages는 정적 사이트라 직접 Google Sheet를 수정할 수 없습니다.
`apps-script-admin-backend-Code.gs`를 Apps Script 새 프로젝트에 붙여넣고 웹앱으로 배포한 뒤, 생성된 `/exec` 주소를 `script.js`의 `BACKEND_URL`에 넣으세요.
