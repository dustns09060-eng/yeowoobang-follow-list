// Apps Script 관리자 백엔드 예시
// 배포: 웹앱 / 액세스: 모든 사용자
const SPREADSHEET_ID = "1_WsSmEpXcckIV9wbQp2K6YZe4jZ2XlX2Vt6lmXmfiHs";
const SHEET_NAME = "Sheet2";
const NOTICE_SHEET = "공지";
const ADMIN_PASSWORD = "0702";

function doPost(e){
  const data = JSON.parse(e.postData.contents || "{}");
  if (String(data.password) !== ADMIN_PASSWORD) return ContentService.createTextOutput("비밀번호가 틀렸습니다.");
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME);

  if (data.action === "add") {
    const last = sheet.getLastRow();
    const nextNo = last >= 2 ? Number(sheet.getRange(last,1).getValue()) + 1 : 1;
    const insta = String(data.insta || "").trim().replace(/^@?/, "@");
    sheet.appendRow([nextNo, data.nickname, insta]);
    return out(nextNo + "번 추가 완료");
  }

  if (data.action === "edit") {
    const no = Number(data.no);
    const rows = sheet.getDataRange().getValues();
    for (let i=1;i<rows.length;i++){
      if(Number(rows[i][0])===no){
        sheet.getRange(i+1,2).setValue(data.nickname);
        sheet.getRange(i+1,3).setValue(String(data.insta||"").trim().replace(/^@?/, "@"));
        return out(no + "번 수정 완료");
      }
    }
    return out("번호를 찾지 못했습니다.");
  }

  if (data.action === "delete") {
    const no = Number(data.no);
    const rows = sheet.getDataRange().getValues();
    for (let i=1;i<rows.length;i++){
      if(Number(rows[i][0])===no){
        sheet.deleteRow(i+1);
        return out(no + "번 삭제 완료");
      }
    }
    return out("번호를 찾지 못했습니다.");
  }

  if (data.action === "notice") {
    let ns = ss.getSheetByName(NOTICE_SHEET) || ss.insertSheet(NOTICE_SHEET);
    ns.getRange("A1").setValue("제목");
    ns.getRange("B1").setValue("내용");
    ns.getRange("A2").setValue(data.title || "");
    ns.getRange("B2").setValue(data.content || "");
    return out("공지 저장 완료");
  }

  return out("알 수 없는 작업입니다.");
}
function out(msg){ return ContentService.createTextOutput(msg); }
