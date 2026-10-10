let state;
let currentView = 'dashboard';
const $ = id => document.getElementById(id);
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clock = value => new Intl.DateTimeFormat('ko-KR',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Asia/Seoul'}).format(new Date(value));
const day = value => new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',weekday:'short',timeZone:'Asia/Seoul'}).format(new Date(value));
const duration = minutes => minutes == null ? '아직 기록 없음' : `${Math.floor(minutes / 60)}시간 ${Math.round(minutes % 60)}분`;
function notice(message, error=false) { $('notice').textContent=message; $('notice').hidden=false; $('notice').className=error?'error':''; }
async function request(path, data) {
  const options = data === undefined ? {} : {method:'POST',headers:{'Content-Type':'application/json','X-SleepWell-Token':state.csrf_token},body:JSON.stringify(data)};
  const response=await fetch(path,options); const result=await response.json();
  if(!response.ok) throw new Error(result.error || '요청을 완료하지 못했습니다.'); return result;
}
function setView(view) {
  if(!state?.profile && !['settings','research'].includes(view)) view='settings';
  currentView=view;
  document.querySelectorAll('.view').forEach(e=>e.hidden=true);
  $(view==='settings'?'onboarding':view).hidden=false;
  document.querySelectorAll('.nav').forEach(e=>e.classList.toggle('active',e.dataset.view===view));
  if(view==='dashboard') requestAnimationFrame(drawChart);
}
function profileForm() {
  const p=state.profile; if(!p) return;
  const form=$('profile-form');
  for(const [key,value] of Object.entries(p)) { const input=form.elements.namedItem(key); if(!input)continue; if(input.type==='checkbox')input.checked=value;else input.value=value; }
  form.querySelector('[type=submit]').textContent='시작 정보 수정하고 추천 갱신 →';
}
function render() {
  const s=state, p=s.profile, r=s.recommendation;
  const model=s.model_status;
  $('model-status').innerHTML=model?`<p><strong>${model.available?'연결 가능한 모델 있음':'현재 행동 예측 사용 불가'}</strong></p><p>${escapeHTML(model.reason)}</p>${model.model_version?`<p class="muted small">모델 버전: ${escapeHTML(model.model_version)}</p>`:''}`:'모델 연결 상태를 확인할 수 없습니다.';
  const mesa=s.data_readiness;
  if(mesa?.available) {
    const q=mesa.quality, modalities=mesa.modalities;
    const pct=v=>v==null?'검사값 없음':`${(v*100).toFixed(1)}%`;
    $('mesa-evidence').innerHTML=`<p><strong>${Number(mesa.file_count).toLocaleString()}개 파일 · ${(mesa.total_bytes/1e9).toFixed(2)} GB</strong></p><p>${escapeHTML(mesa.reason)} 점검 시각: ${escapeHTML(mesa.generated_at)}</p><dl><dt>활동계 CSV</dt><dd>${Number(modalities.actigraphy).toLocaleString()}개</dd><dt>PSG 원시 기록 / 단계 주석</dt><dd>${modalities.psg_edf} / ${modalities.psg_annotation}개</dd><dt>심박 / 걸음 파일</dt><dd>${modalities.heart_rate} / ${modalities.steps}개</dd><dt>내용 검사 범위</dt><dd>안정된 표본 ${q.sampled_files}개 · ${Number(q.rows).toLocaleString()}행</dd><dt>표본 비착용 플래그 비율</dt><dd>${pct(q.offwrist_fraction)}</dd><dt>표본 30초 간격 비율</dt><dd>${pct(q.thirty_second_cadence_fraction)}</dd></dl><p>활동·빛·수면 패턴 연구의 입력 후보입니다. ACT 수면·각성 표시는 장치에서 파생된 값이며 PSG 수면단계 정답과 다릅니다.</p><p class="muted small">표본 검사 비율을 전체 데이터의 품질로 일반화하지 않습니다. 이 집계는 실시간 다운로드 진행률이 아니며, 추가 업로드 후 점검 파일을 갱신하고 서버를 재시작해야 합니다.</p>`;
  } else {
    $('mesa-evidence').textContent=mesa?.reason || '아직 MESA 데이터 점검 결과가 연결되지 않았습니다.';
  }
  $('archive-intro').textContent=s.research.available ? `연결 가능한 본인 자료: ${s.research.sleep_nights}일 수면 · 활동 ${s.research.step_days}일. ${s.research.first_date} ~ ${s.research.last_date}. 학생 집단 평균은 아닙니다.` : '기존 자료 연결 없이도 입력한 생활 평균으로 시작할 수 있습니다.';
  $('use-archive').disabled=!s.research.available;
  if(p) {
    $('greeting').textContent=`${p.name}님의 하루에 맞는, 수면 리듬.`;
    $('subtitle').textContent='매일의 추천과 작은 기록이 쌓여 나를 더 잘 이해하게 됩니다.';
  }
  if(r) {
    $('bed-time').textContent=clock(r.bed); $('wake-time').textContent=clock(r.wake);
    $('bed-date').textContent=day(r.bed); $('wake-date').textContent=day(r.wake);
    $('plan-date').textContent=`${day(r.generated_at)} 생성`;
    $('sleep-opportunity').textContent=`수면 기회 ${duration(r.sleep_opportunity_min)}`;
    $('wind-down').textContent=`${clock(r.wind_down)}부터 잠들 준비`;
    const q=s.personalization;
    $('valid-days').textContent=q.valid_days;
    $('ring-fill').style.strokeDashoffset=String(314.16*(1-Math.min(14,q.valid_days)/14));
    $('personalization-title').textContent=q.mode==='personalized'?'나의 기록으로 개인화 중':'나를 알아가는 중';
    $('growth-description').textContent=q.mode==='personalized'?'최근 28일의 기록과 초기 평균을 함께 반영합니다.':`시작 후 ${q.elapsed_days}일 · 유효 관측 ${q.valid_days}일. 시작 14일 경과와 14일 관측을 모두 채우면 전환됩니다.`;
    $('target-duration').textContent=duration(r.target_sleep_min);
    $('observed-duration').textContent=duration(r.observed_sleep_min);
    $('activity-baseline').textContent=`${Math.round(q.average_steps).toLocaleString()}보`;
    $('activity-origin').textContent=q.origins.activity;
    $('prediction-count').textContent=`${s.prediction_count}회`;
    $('reasons').innerHTML=r.reasons.map(x=>`<li>${escapeHTML(x)}</li>`).join('');
    const warnings=[...r.warnings];
    if(r.plan_date!==s.today) warnings.unshift('이 일정은 이전 날짜에 만든 추천입니다. 현재 기록으로 다시 계산해주세요.');
    $('warnings').innerHTML=warnings.map(x=>`<p>· ${escapeHTML(x)}</p>`).join('');
    $('parameter-details').innerHTML=`<dl><dt>개인화 모드</dt><dd>${q.mode==='initial'?'초기 평균':'관측 기반 개인화'}</dd><dt>일주기 위상</dt><dd>${Math.floor(q.phase_min/60)}시 ${Math.round(q.phase_min%60)}분 · ${escapeHTML(q.origins.phase)}</dd><dt>운동 기준</dt><dd>${q.exercise_min.toFixed(1)}분/일 · ${escapeHTML(q.origins.exercise)}</dd><dt>각성·수면 시간상수</dt><dd>${q.tau_wake_h}시간 / ${q.tau_sleep_h}시간 · 고정</dd><dt>수면 목표 근거</dt><dd>${escapeHTML(q.origins.sleep_target)}</dd></dl><p>${escapeHTML(q.note)}</p>`;
    const b=r.behavioral_forecast;
    $('forecast-details').innerHTML=b?.available?`<p><strong>기존 연구 모델 연결:</strong> 예상 행동 ${clock(b.bed)} 취침 / ${clock(b.wake)} 기상<br>${escapeHTML(b.role)}<br>${escapeHTML(b.warning)}</p>`:`<p>기존 행동 예측 모델: ${escapeHTML(b?.reason || '미연결')}</p>`;
    drawChart();
  }
  const diary=s.records.filter(x=>x.source!=='archive');
  $('history-summary').textContent=`새로 기록한 수면 ${diary.length}일 · 연결된 과거 수면 ${s.records.length-diary.length}일 · 저장된 추천 ${s.prediction_count}개`;
  const feedback=new Map(s.feedback.map(x=>[x.date,x]));
  $('history-rows').innerHTML=[...s.records].reverse().map(x=>{
    const f=feedback.get(x.date), delta=f?.bed_difference_min;
    return `<tr><td>${escapeHTML(x.date)}</td><td>${duration(x.sleep_min)}</td><td>${x.rested??'—'}</td><td>${x.fatigue??'—'}</td><td>${delta==null?'사전 추천 없음':`${delta>=0?'+':''}${Math.round(delta)}분`}</td><td>${x.source==='archive'?'과거 Watch':x.source==='healthkit'?'Apple Health':'직접 기록'}</td></tr>`;
  }).join('') || '<tr><td colspan="6">첫 수면 기록을 남겨주세요.</td></tr>';
  const m=s.model_metrics;
  $('model-evidence').innerHTML=m?`<p>기존 행동 예측 실험: 총 ${m.n_total}일, 테스트 ${m.wake.test_n}일. 취침 MAE ${m.bedtime.test_mae_minutes.toFixed(1)}분 · 기상 MAE ${m.wake.test_mae_minutes.toFixed(1)}분.</p><p>이 수치는 과거 행동을 맞힌 오차입니다. 현재 권장 일정의 수면 개선 효과를 평가한 결과는 아직 없습니다. 목표는 개운함·피로도·수면 규칙성의 장기 변화로 검증합니다.</p>`:'기존 연구 모델 평가 파일을 찾지 못했습니다.';
  $('save-status').textContent='기록은 브라우저가 아닌 로컬 DB에 저장됩니다';
  setView(currentView);
}
function drawChart() {
  const canvas=$('rhythm-chart'), points=state?.recommendation?.chart;
  if(!canvas||!points||canvas.clientWidth===0)return;
  const ratio=window.devicePixelRatio||1, w=canvas.clientWidth,h=210;
  canvas.width=w*ratio;canvas.height=h*ratio;
  const c=canvas.getContext('2d');c.scale(ratio,ratio);c.clearRect(0,0,w,h);
  const left=34,right=12,top=16,bottom=30;
  const x=i=>left+i/(points.length-1)*(w-left-right);
  const y=value=>top+(1.05-value)/1.25*(h-top-bottom);
  c.font='10px -apple-system, sans-serif';
  for(const v of [0,.25,.5,.75,1]) {c.strokeStyle='#efedf4';c.beginPath();c.moveTo(left,y(v));c.lineTo(w-right,y(v));c.stroke();c.fillStyle='#b1aaba';c.fillText(String(v),5,y(v)+3);}
  for(const [key,color] of [['s','#8e79c5'],['c','#a8b9c9']]){c.strokeStyle=color;c.lineWidth=2;c.beginPath();points.forEach((p,i)=>i?c.lineTo(x(i),y(p[key])):c.moveTo(x(i),y(p[key])));c.stroke();}
  c.fillStyle='#a49bad';for(let i=0;i<points.length;i+=36){c.fillText(clock(points[i].time),Math.min(w-35,Math.max(left-10,x(i)-14)),h-6);}
}
async function save(path,data,message) {
  const buttons=[...document.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);
  try {state=await request(path,data);currentView='dashboard';render();notice(message);window.scrollTo({top:0,behavior:'smooth'});}
  catch(e){notice(e.message,true);}
  finally{buttons.forEach(b=>b.disabled=false);$('use-archive').disabled=!state.research.available;}
}
document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>{if(button.dataset.view==='settings')profileForm();setView(button.dataset.view);}));
$('profile-form').addEventListener('submit',event=>{event.preventDefault();const data=Object.fromEntries(new FormData(event.target));data.link_history=event.target.elements.link_history.checked;save('/api/profile',data,'시작 정보를 저장하고 수면 일정을 만들었습니다.');});
$('record-form').addEventListener('submit',event=>{event.preventDefault();const data=Object.fromEntries(new FormData(event.target));save('/api/record',data,'수면 기록과 피드백을 저장했습니다. 오늘의 추천도 갱신했습니다.');});
$('regenerate').addEventListener('click',()=>save('/api/recommend',{},'새 추천을 기록했습니다. 기존 추천 이력도 보존됩니다.'));
$('use-archive').addEventListener('click',()=>{const average=state.research.average_steps;if(average!=null){$('profile-form').elements.average_steps.value=Math.round(average);$('profile-form').elements.link_history.checked=true;notice('본인의 과거 걸음 평균을 채웠습니다. 다른 생활 정보는 현재 기준으로 입력해주세요.');}});
window.addEventListener('resize',drawChart);
request('/api/state').then(result=>{state=result;render();profileForm();const today=state.today;const yesterday=new Date(`${today}T12:00:00+09:00`);yesterday.setDate(yesterday.getDate()-1);const prior=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(yesterday);$('record-form').elements.bed.value=`${prior}T23:30`;$('record-form').elements.wake.value=`${today}T07:00`;}).catch(e=>notice(e.message,true));
