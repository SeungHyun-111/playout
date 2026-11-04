const memoItems = [
  "메일 보내기",
  "우선순위",
  "우리 규격을 먼저 만들고 거기에 맞춰 외부 프로세스를 정하자.",
  "공익방송 셋팅",
  "운행시간표관리 메뉴 파일 생성(채널1,2 두벌)",
  "기획PGM 관리메뉴 생성",
  "https://docs.google.com/spreadsheets/d/1rkoxPQkJssM-ZH5dkQConbb2tbx6ctZPhZGzq9k6UVU/edit?gid=2034959207#gid=2034959207",
  "편성팀 운행표 생성",
  "주조정실 화면기반 코치마크 생성",
];


export const initialMemos = memoItems.map(content => ({title:content.length > 80 ? content.slice(0,77) + '…' : content,content,category:'일반',status:'할 일',priority:'보통',answer:'',broadcastDate:'',materialId:''}));
