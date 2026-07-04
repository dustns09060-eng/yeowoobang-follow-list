# 여우방 팔로우리스트 V13 FINAL

- 카드 칸 더 작게 수정
- 새로고침 옆 관리자모드 버튼 추가
- 하단 관리자 버튼 추가
- 조별복사만 유지
- 관리자 비밀번호: 0702
- 관리자 기능: 추가, 수정, 삭제, 공지 저장/삭제

## 관리자 기능 실제 연결
1. `apps-script-admin-backend-Code.gs` 내용을 Apps Script 새 프로젝트에 붙여넣기
2. 웹 앱으로 배포, 접근 권한은 `모든 사용자`
3. 배포 URL `/exec` 주소를 복사
4. `script.js`의 `BACKEND_URL = ""` 안에 붙여넣기
5. GitHub에 다시 업로드/Commit
