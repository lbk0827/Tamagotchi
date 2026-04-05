# 설치 기록 문서

작성일: 2026-04-05
프로젝트 경로: `/Users/bk/Desktop/LBK/7. 바이브코딩/1. 고치`

## 1) 사전 설치 프로그램 (사용자 보유)
아래 항목은 사용자께서 이미 설치했다고 확인됨.

- Node.js (LTS)
  - 역할: JavaScript/TypeScript 런타임 및 패키지 실행 기반
- npm
  - 역할: 프로젝트 패키지 설치/관리 도구
- Git
  - 역할: 소스 버전 관리
- Visual Studio Code (또는 다른 코드 에디터)
  - 역할: 코드 작성/수정

## 2) 이번 작업에서 새로 설치된 패키지
모두 프로젝트 로컬(`node_modules`)에 설치됨.

### 2.1 개발 의존성 (devDependencies)
- `electron`
  - 역할: 데스크톱 앱 실행 엔진 (윈도우/트레이/항상 위 창)
- `typescript`
  - 역할: TypeScript 컴파일러
- `ts-node`
  - 역할: TypeScript 실행/개발 보조
- `@types/node`
  - 역할: Node.js 타입 선언 파일
- `concurrently`
  - 역할: 여러 개발 명령 동시 실행 (`tsc --watch` + Electron 실행)
- `wait-on`
  - 역할: 빌드 산출물 준비 대기 후 앱 실행
- `nodemon`
  - 역할: 빌드 결과 변경 감지 시 Electron 자동 재시작
- `chokidar-cli`
  - 역할: HTML/CSS 파일 변경 감지 후 자동 복사 트리거

### 2.2 런타임 의존성 (dependencies)
- `dotenv`
  - 역할: `.env` 환경변수 로드 (API 키 관리 등)
- `electron-store`
  - 역할: 로컬 상태 저장/복구 용도

## 3) 나중에 제거하는 방법

### 3.1 특정 패키지만 제거
```bash
npm uninstall electron
npm uninstall typescript ts-node @types/node concurrently wait-on
npm uninstall nodemon chokidar-cli
npm uninstall dotenv electron-store
```

### 3.2 프로젝트 패키지 전체 제거
```bash
rm -rf node_modules package-lock.json
```

### 3.3 다시 설치하고 싶을 때
```bash
npm install
```

## 4) 참고
- 현재 `Xcode Command Line Tools`는 설치하지 않음.
- macOS 패키징/일부 네이티브 모듈 설치 시 필요할 수 있음.
- 설치 명령: `xcode-select --install`
