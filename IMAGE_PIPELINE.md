# 이미지 수집·정리·업로드 파이프라인

이 문서는 `https://tedoori.net/`의 프로젝트 이미지를 수집해 로컬에 정리하고(프로젝트별 폴더/메타데이터), WebP+리사이즈 후 내 사이트(Supabase DB + 이미지 호스팅)로 반영하는 절차를 설명합니다.

## 준수 사항(필수)

- `robots.txt` 및 서비스 이용 정책을 먼저 확인하세요.
- 저작권/사용권이 불명확하면 수집·재배포를 진행하지 마세요.
- 가능하면 프로젝트 페이지에 출처/크레딧을 메타데이터로 보관하세요.
- 대량 다운로드 시 서버 부하를 피하기 위해 동시성/딜레이 값을 보수적으로 설정하세요.

## 폴더 구조

- `assets/_scrape/`: 크롤/업로드/업서트 리포트
- `assets/projects/<slug>/images/original/`: 원본 다운로드
- `assets/projects/<slug>/images/optimized/{lg,md,sm}/`: WebP 최적화 결과
- `assets/projects/<slug>/project_info.json`: 프로젝트 메타데이터 및 파일 인덱스

`assets/`는 `.gitignore`에 포함되어 커밋되지 않습니다.

## 실행 순서

### 1) 프로젝트 URL 및 이미지 URL 추출

```bash
npm run tedoori:scrape -- --maxPages 80 --maxDepth 3 --delayMs 250 --withImages true
```

출력: `assets/_scrape/projects.json`

### 2) 원본 이미지 다운로드

```bash
npm run tedoori:download -- --maxProjects 10 --maxImages 50
```

### 3) 최적화(WebP + 3사이즈)

```bash
npm run tedoori:optimize -- --concurrency 2 --overwrite false
```

### 4) 업로드(택1)

#### A. Supabase Storage 업로드(권장)

```bash
npm run tedoori:upload:supabase -- --dryRun false
```

출력: `assets/_scrape/upload-supabase.json`

#### B. SFTP 업로드

```bash
npm run tedoori:upload:sftp -- --dryRun false
```

출력: `assets/_scrape/upload-sftp.json`

### 5) DB 반영(Supabase projects 업서트)

```bash
npm run tedoori:upsert -- --mapping assets/_scrape/upload-supabase.json
```

기본은 드라이런이며, 실제 반영은 `--apply true`로 수행합니다.

### 6) 무결성 검증

```bash
npm run validate:assets -- --outDir assets
```

### 7) UI 확인(개발 서버)

```bash
npm run dev
node scripts/test-project-pages.mjs
```

## 환경변수

### Supabase(필수)

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### SFTP(선택)

- `SFTP_HOST`
- `SFTP_PORT` (기본 22)
- `SFTP_USERNAME`
- `SFTP_PASSWORD` 또는 `SFTP_PRIVATE_KEY_PATH`
- `SFTP_REMOTE_BASE` (예: `/projects`)
- `SFTP_PUBLIC_BASE_URL` (예: `https://cdn.example.com/projects`)

### 파이프라인 튜닝(선택)

- `TEDOORI_OUT_DIR` (기본 `assets`)
- `TEDOORI_MAX_PAGES`, `TEDOORI_MAX_DEPTH`, `TEDOORI_DELAY_MS`
- `TEDOORI_DOWNLOAD_CONCURRENCY`, `TEDOORI_OPTIMIZE_CONCURRENCY`, `TEDOORI_UPLOAD_CONCURRENCY`
- `TEDOORI_WEBP_QUALITY`

