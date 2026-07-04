const SPREADSHEET_ID = '1_WsSmEpXcckIV9wbQp2K6YZe4jZ2XlX2Vt6lmXmfiHs';
const LIST_SHEET = 'Sheet2';
const NOTICE_SHEET = '공지';
const ADMIN_PASSWORD = '0702';

function doPost(e){
  const body = JSON.parse(e.postData.contents || '{}');
  if(String(body.password || '') !== ADMIN_PASSWORD) return json({ok:false, message:'비밀번호 오류'});
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(LIST_SHEET);
  if(body.action === 'add'){
    const last = sheet.getLastRow();
    const data = last > 1 ? sheet.getRange(2,1,last-1,1).getValues().flat().map(Number).filter(Boolean) : [];
    const nextNo = data.length ? Math.max(...data)+1 : 1;
    sheet.appendRow([nextNo, body.nickname, normalizeInsta_(body.insta)]);
    return json({ok:true});
  }
  if(body.action === 'update'){
    const values = sheet.getDataRange().getValues();
    for(let i=1;i<values.length;i++){
      if(Number(values[i][0]) === Number(body.no)){
        sheet.getRange(i+1,2).setValue(body.nickname);
        sheet.getRange(i+1,3).setValue(normalizeInsta_(body.insta));
        return json({ok:true});
      }
    }
    return json({ok:false, message:'번호 없음'});
  }
  if(body.action === 'delete'){
    const values = sheet.getDataRange().getValues();
    for(let i=1;i<values.length;i++){
      if(Number(values[i][0]) === Number(body.no)){
        sheet.deleteRow(i+1);
        return json({ok:true});
      }
    }
    return json({ok:false, message:'번호 없음'});
  }
  if(body.action === 'saveNotice'){
    let notice = ss.getSheetByName(NOTICE_SHEET);
    if(!notice){ notice = ss.insertSheet(NOTICE_SHEET); notice.appendRow(['공지']); }
    notice.getRange('A2').setValue(body.notice || '');
    return json({ok:true});
  }
  return json({ok:false, message:'알 수 없는 작업'});
}
function normalizeInsta_(v){ v = String(v || '').trim(); return v && !v.startsWith('@') ? '@'+v : v; }
function json(o){ return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
