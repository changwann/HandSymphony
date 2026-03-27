# 🖐️ Hand Symphony (하이퍼팝 미디어 아트)

실시간 손 인식을 통해 화려한 시각 효과와 사운드를 생성하는 인터랙티브 미디어 아트 프로젝트입니다. 
MediaPipe를 활용한 정교한 핸드 트래킹과 커스텀 물리 엔진이 결합되어 있습니다.

## ✨ 주요 기능
- **Real-time Hand Tracking**: MediaPipe Hands를 이용한 21개 관절 실시간 추적
- **Dynamic Visuals**: 손의 움직임과 속도에 반응하는 네온 스켈레톤 및 아우라 효과
- **Physics Engine**: 손가락 끝에서 쏟아지는 다이아몬드 파티클과 바닥 충돌 물리 구현
- **Interactive Audio**: 특정 제스처(따봉 👍) 인식 시 하이퍼팝 사운드 재생 (이스터 에그)
- **Visual Modes**: ASCII, Edge, Thermal, Glitch 등 다양한 렌더링 모드 지원

## 🛠️ 기술 스택
- **Frontend**: HTML5, CSS3, JavaScript (ES6+ Modules)
- **ML Library**: [MediaPipe Hands](https://google.github.io/mediapipe/solutions/hands)
- **Rendering**: HTML5 Canvas API
- **Tool**: VS Code, Live Server

## 🚀 시작하기
1. 이 레포지토리를 클론합니다.
2. `Live Server`를 통해 `index.html`을 실행합니다.
3. 카메라 권한을 허용하고 손을 움직여 심포니를 만들어보세요!

## 📂 폴더 구조
- `index.html`: 메인 구조 및 캔버스 설정
- `style.css`: 네온 스타일링 및 레이아웃
- `js/`: 
  - `main.js`: 전체 로직 제어 및 핸드 트래킹 연결
  - `physics.js`: 파티클 물리 및 시각 효과 색상 계산
  - `visuals.js`: 다양한 필터 및 스켈레톤 렌더링
  - `audio.js`: 오디오 분석 및 이스터 에그 사운드 관리