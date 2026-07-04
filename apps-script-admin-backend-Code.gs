// 여우방 V13 관리자 백엔드
// Apps Script 새 프로젝트에 붙여넣기 → 배포 > 웹 앱 > 모든 사용자
const SPREADSHEET_ID = "1_WsSmEpXcckIV9wbQp2K6YZe4jZ2XlX2Vt6lmXmfiHs";
const SHEET_NAME = "Sheet2";
const NOTICE_SHEET = "공지";
const ADMIN_PASSWORD = "0702";

function doGet(e){
  const p = e.parameter || {};
  const cb = p.callback || "callback";
  const msg = handleAction(p);
  return ContentService
    .createTextOutput(cb + "(" + JSON.stringify(msg) + ")")
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function handleAction(data){
  if (String(data.password) !== ADMIN_PASSWORD) return "비밀번호가 틀렸습니다.";
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME);

  if (data.action === "add") {
    const rows = sheet.getDataRange().getValues();
    let maxNo = 0;
    for (let i=1;i<rows.length;i++) maxNo = Math.max(maxNo, Number(rows[i][0]) || 0);
    const nextNo = maxNo + 1;
    const insta = normInsta(data.insta);
    if (!data.nickname || !insta) return "닉네임과 아이디를 입력해주세요.";
    sheet.appendRow([nextNo, data.nickname, insta]);
    return nextNo + "번 추가 완료";
  }

  if (data.action === "edit") {
    const no = Number(data.no);
    const rows = sheet.getDataRange().getValues();
    for (let i=1;i<rows.length;i++){
      if(Number(rows[i][0]) === no){
        sheet.getRange(i+1,2).setValue(data.nickname || "");
        sheet.getRange(i+1,3).setValue(normInsta(data.insta));
        return no + "번 수정 완료";
      }
    }
    return "번호를 찾지 못했습니다.";
  }

  if (data.action === "delete") {
    const no = Number(data.no);
    const rows = sheet.getDataRange().getValues();
    for (let i=1;i<rows.length;i++){
      if(Number(rows[i][0]) === no){
        sheet.deleteRow(i+1);
        return no + "번 삭제 완료";
      }
    }
    return "번호를 찾지 못했습니다.";
  }

  if (data.action === "notice") {
    let ns = ss.getSheetByName(NOTICE_SHEET) || ss.insertSheet(NOTICE_SHEET);
    ns.getRange("A1").setValue("제목");
    ns.getRange("B1").setValue("내용");
    ns.getRange("A2").setValue(data.title || "");
    ns.getRange("B2").setValue(data.content || "");
    return data.title || data.content ? "공지 저장 완료" : "공지 삭제 완료";
  }

  return "알 수 없는 작업입니다.";
}
function normInsta(v){ v=String(v||"").trim(); return v ? (v.startsWith("@") ? v : "@"+v) : ""; }
