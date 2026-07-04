// Apps Script 관리자 백엔드 예시
// 배포: 웹앱 / 액세스: 모든 사용자
const SPREADSHEET_ID = '1_WsSmEpXcckIV9wbQp2K6YZe4jZ2XlX2Vt6lmXmfiHs';
const SHEET_NAME = 'Sheet2';
const NOTICE_SHEET = '공지';
const ADMIN_PASSWORD = '0702';

function doPost(e){
  try{
    const body = JSON.parse(e.postData.contents || '{}');
    if(String(body.pw)!==ADMIN_PASSWORD) return json({ok:false,msg:'비밀번호가 틀렸습니다.'});
    if(body.action==='saveNotice') return saveNotice_(body.content||'');
    if(body.action==='deleteNotice') return saveNotice_('');
    if(body.action==='addMember') return addMember_(body.nickname, body.insta);
    if(body.action==='updateMember') return updateMember_(body.no, body.nickname, body.insta);
    if(body.action==='deleteMember') return deleteMember_(body.no);
    return json({ok:false,msg:'알 수 없는 작업입니다.'});
  }catch(err){return json({ok:false,msg:String(err)})}
}
function json(o){return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON)}
function ss(){return SpreadsheetApp.openById(SPREADSHEET_ID)}
function sheet(){return ss().getSheetByName(SHEET_NAME)}
function norm(v){v=String(v||'').trim();return v&& !v.startsWith('@')?'@'+v:v}
function getRows(){const s=sheet();const v=s.getDataRange().getValues();v.shift();return v.filter(r=>r[0]&&r[1]&&r[2])}
function saveNotice_(content){let s=ss().getSheetByName(NOTICE_SHEET)||ss().insertSheet(NOTICE_SHEET);s.getRange('A1').setValue('공지');s.getRange('A2').setValue(content);return json({ok:true,msg:content?'공지 저장 완료':'공지 삭제 완료'})}
function addMember_(nickname, insta){nickname=String(nickname||'').trim();insta=norm(insta);if(!nickname||!insta)return json({ok:false,msg:'닉네임과 아이디를 입력해주세요.'});const rows=getRows();const next=rows.length?Math.max(...rows.map(r=>Number(r[0])||0))+1:1;sheet().appendRow([next,nickname,insta]);return json({ok:true,msg:next+'번 추가 완료'})}
function updateMember_(no,nickname,insta){no=Number(no);nickname=String(nickname||'').trim();insta=norm(insta);if(!no||!nickname||!insta)return json({ok:false,msg:'번호, 닉네임, 아이디를 입력해주세요.'});const s=sheet();const v=s.getDataRange().getValues();for(let i=1;i<v.length;i++){if(Number(v[i][0])===no){s.getRange(i+1,2).setValue(nickname);s.getRange(i+1,3).setValue(insta);return json({ok:true,msg:no+'번 수정 완료'})}}return json({ok:false,msg:'해당 번호를 찾지 못했습니다.'})}
function deleteMember_(no){no=Number(no);if(!no)return json({ok:false,msg:'삭제할 번호를 입력해주세요.'});const s=sheet();const v=s.getDataRange().getValues();for(let i=1;i<v.length;i++){if(Number(v[i][0])===no){s.deleteRow(i+1);return json({ok:true,msg:no+'번 삭제 완료'})}}return json({ok:false,msg:'해당 번호를 찾지 못했습니다.'})}
