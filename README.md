# SleepWell integrated

Galaxy Watch 수집 UI, Two-Process 수면압력 모델, 누수 통제 Ridge 잔차 모델을 한 저장소에서 검증하는 통합본입니다.

## 어떤 원본을 합쳤나

- `android-app/`: `soin7563-ops/---SleepWell`의 실행 가능한 Compose 수집·그래프·export 앱을 기준으로 통합
- `src-epoch-1min/`: `iuniion3287-web/SleepWell`의 1분 물리모델 기준 구현
- `tools/model/`: 한 달 뒤 설문+Watch 일별 CSV로 Ridge를 학습하고 Kotlin용 JSON을 내보내는 코드

소빈 레포의 `HealthDataSource`는 실제로 UI 연결 인터페이스가 맞습니다. 현재 원본은 `FakeDataSource`까지만 연결되어 있고 `SamsungHealthSource`는 TODO입니다. 이 통합본은 조회된 `HealthSnapshot`을 `SnapshotAnalysisPipeline`으로 넘겨 추천 카드까지 계산합니다.

## 앱 계산 흐름

1. `HealthDataSource`가 Watch 심박·걸음·수면 세션을 `HealthSnapshot`으로 반환합니다.
2. 수집/export는 원래 규격인 30초 epoch를 유지합니다.
3. 추천 모델은 같은 snapshot을 별도로 1분 타임라인으로 바꿔 Two-Process S/C를 계산합니다.
4. `ridge_residual.json`이 없거나 `status != trained`이면 화면에 물리모델 fallback임을 표시합니다.
5. 학습 완료 JSON이 있으면 Python에서 저장한 median/mean/scale과 Ridge 계수를 Kotlin이 직접 계산합니다.

30초 수집 규격과 1분 추천 규격은 목적이 다르므로 하나를 다른 값으로 덮어쓰지 않습니다.

## 한 달 뒤 필요한 CSV

설문 CSV만으로는 Ridge 정답을 만들 수 없습니다. 날짜·참여자 기준으로 다음을 결합해야 합니다.

- 설문: 카페인, 낮잠, 운동, 피로도, 목표 기상
- Watch: 결정 시각 이전 심박·걸음, 직전 7일 수면 특징
- 물리모델: 그날의 기준 취침·기상 시각
- 다음날 확인되는 정답: 실제 취침·기상 시각

열 규격은 `examples/daily_training_template.csv`입니다. 실제 취침·기상 열은 feature에서 강제로 제외되고, 날짜 단위 70/15/15 시간순 분할 뒤 마지막 15%는 최종 테스트에만 사용됩니다.

```bash
python tools/model/train_ridge_residual.py \
  --input daily_training.csv \
  --output android-app/app/src/main/assets/ridge_residual.json
```

## 검증

- Kotlin: JSON 파싱, 전처리 직접 계산, 물리+잔차 추천, 전체 분석 파이프라인 회귀 테스트
- Python: 자정 순환 잔차, 시간순 분할, JSON 수식 재현, 정답열 누수 차단 테스트
- Android: `android-app/gradlew assembleDebug`

현재 example JSON은 `status: untrained`이며 앱이 자동으로 읽는 파일명이 아닙니다. 학습 전 0 계수를 실제 모델로 오인하지 않기 위한 장치입니다.
