# SleepWell 최신 연구 모델 인계 (2026-10-25)

이 문서는 Android 사용자 앱과 Windows/웹 연구자용 소프트웨어 개발자가 현재 연구 모델을 같은 버전으로 사용할 수 있도록 경로와 검증 상태를 정리한다.

## 기준 구현

- Android 실행 엔진: `android-app/app/src/main/java/app/sleepwell/user/`
- Android 동결 모델: `android-app/app/src/main/assets/models/`
- 연구자용 실행 엔진: `web-app/`
- 연구자용 동결 모델·집계 검증: `web-app/models/`
- 재학습·재검증 코드: `tools/model/`
- Windows 연구자용 런처·동기화 소스: `desktop/`
- 연구 설계와 집계 결과: `docs/`

## 현재 탑재 모델

- `robust_cmi_v2.json`: CMI 기반 다음날 수면 시각 데이터/융합 모델
- `robust_mesa_v2.json`: MESA 기반 다음날 수면 시각 데이터/융합 모델
- `population_prior.json`: 신규 사용자 집단 초기값
- Android는 위 세 파일을 앱 assets에서 직접 읽는다.
- 연구자용 소프트웨어는 `web-app/models/`의 동일 모델과 개인화·타당도 집계 파일을 읽는다.

## 개인화

- Android: `AdaptiveResidualPersonalization.kt`, `UserModelEngine.kt`
- 연구자용: `adaptive_personalization.py`, `personalization.py`
- 첫 해결된 기록부터 매일 갱신하며 최근 기록과 기록 공백을 감쇠 가중치로 반영한다.
- 웨어러블 기록은 보조 지표이며, 개인화의 주 결과는 시간 순서가 확인된 사용자 결과를 사용한다.

## 검증 상태

- 모델 연구 테스트: 104개 통과
- 웹·개인화·전향 검증 테스트: 205개 통과, 1개 건너뜀
- 실제 Android Kotlin 엔진 JVM 검증: 전체 통과
- 전체 Android Gradle 테스트는 로컬 Android SDK 부재로 실행하지 못했다. Java 17 이상과 Android SDK를 설정한 뒤 `android-app/gradlew.bat testDebugUnitTest`로 재확인한다.

## 데이터 및 보안 경계

- 개인 삼성헬스 원자료, MESA 원자료, 참여자 DB와 휴대폰 백업은 Git에 포함하지 않는다.
- 모델 파일에는 학습된 계수·트리, 집단 통계, provenance hash와 집계 성능만 포함한다.
- APK/EXE, 컴파일 클래스, 인증서, 키, 로컬 DB는 Git에 포함하지 않는다.
- 모델은 연구 비교용이며 전향적 사용자 효과가 확인되기 전에는 치료 효과나 수면 개선이 입증되었다고 표현하지 않는다.
