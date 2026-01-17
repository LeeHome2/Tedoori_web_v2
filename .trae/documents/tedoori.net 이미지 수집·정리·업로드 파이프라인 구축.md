## 목표
- `https://tedoori.net/`의 프로젝트별 이미지를 수집해 로컬에 체계적으로 저장하고, 최적화(3사이즈+WebP) 후 내 사이트(Supabase DB + 이미지 호스팅)로 일괄 반영합니다.

## 현상/전제(현재 코드베이스)
- 프로젝트 데이터는 Supabase `projects` 테이블에 저장되며, 썸네일은 `image_url`, 갤러리는 `gallery_images(jsonb)`로 관리됩니다. [supabase-schema.sql](file:///c:/Users/user/Desktop/Trae/Tedoori_web_v3/supabase-schema.sql)
- 업로드 API는 현재 `public/uploads`에 저장하는 로컬 방식이며(리사이즈/메타 추출 없음), Supabase Storage를 직접 사용하진 않습니다. [upload route](file:///c:/Users/user/Desktop/Trae/Tedoori_web_v3/src/app/api/upload/route.ts)
- 상세/그리드는 DB에 저장된 `imageUrl`/`galleryImages[]`를 그대로 렌더링합니다. [ProjectDetail](file:///c:/Users/user/Desktop/Trae/Tedoori_web_v3/src/components/ProjectDetail.tsx), [projects route](file:///c:/Users/user/Desktop/Trae/Tedoori_web_v3/src/app/api/projects/route.ts)
- `next/image`는 현재 `placehold.co`만 허용되어 있어, Supabase Storage/외부 도메인 이미지를 표시하려면 `next.config.ts`의 `remotePatterns` 확장이 필요합니다. [next.config.ts](file:///c:/Users/user/Desktop/Trae/Tedoori_web_v3/next.config.ts)

## 1) 문제 진단/수집 전략(robots/권리 포함)
- `https://tedoori.net/robots.txt`를 먼저 요청하여 크롤링 허용 범위를 확인하고, Disallow 규칙이 걸린 경로는 스킵합니다(기본 동작).
- 이미지 사용 권한/출처 표기 정책을 확인할 수 있도록, 프로젝트별 `project_info.json`에 `source`(원본 URL, 접근일자, 크레딧 텍스트)를 기록합니다.
- 사이트가 서버 렌더링이면 HTML 파싱(cheerio)로, JS 렌더링이면 헤드리스(Playwright)로 자동 전환하는 2단계 설계를 합니다.

## 2) 이미지 URL 식별(고해상도 우선)
- 크롤러가 프로젝트 목록 페이지(카테고리/인덱스)에서 프로젝트 링크들을 수집합니다.
- 각 프로젝트 페이지에서 다음을 수집합니다.
  - `<img src>`, `<img srcset>`, `<picture><source srcset>`의 최대 폭 후보
  - CSS `background-image: url(...)` 후보
- 해상도 우선순위: `srcset` 중 최대 width를 우선 선택하고, 없으면 `src`를 사용합니다.
- 최소 권장(1920x1080) 미만 파일은 "저해상도"로 플래그만 달고 저장은 하되, 리포트에서 확인 가능하게 합니다.

## 3) 로컬 저장/분류 구조 생성
- 저장 루트(예: `assets/projects/`) 아래에 프로젝트별 폴더를 생성합니다.
  - `assets/projects/<slug>/images/original/`
  - `assets/projects/<slug>/images/optimized/{lg,md,sm}/`
  - `assets/projects/<slug>/project_info.json`
- 파일명 규칙: `<프로젝트명slug>_<YYYYMMDD>_<순번>.<ext>`로 통일합니다.
- 중복 방지: URL 해시 기반으로 동일 이미지 중복 다운로드를 차단합니다.

## 4) 이미지 최적화(3사이즈 + WebP)
- `sharp`를 사용해 WebP 변환 및 리사이징을 수행합니다.
  - lg: 1920px 기준
  - md: 1280px 기준
  - sm: 640px 기준
- EXIF 회전/색공간 이슈를 안전하게 처리하고(orientation), 과도한 메모리 사용을 피하기 위해 스트리밍/작업 큐(p-limit)로 병렬 제한을 둡니다.

## 5) 업로드(FTP/SFTP 자동 전송 + 대안)
- 기본 요구사항(FTP/SFTP):
  - `ssh2-sftp-client` 기반 업로드 스크립트를 작성해 `assets/projects/**`를 원격 서버의 지정 경로로 동기화합니다.
  - 전송 실패 시 재시도/부분 재개(가능 범위) 및 체크섬 비교를 지원합니다.
- 권장 대안(프로젝트 구조상 더 자연스러움): Supabase Storage(`project-images` 버킷)에 업로드하고 public URL을 DB에 기록합니다. [SUPABASE_SETUP.md](file:///c:/Users/user/Desktop/Trae/Tedoori_web_v3/SUPABASE_SETUP.md)
- 두 방식 모두 “업로드 후 최종 URL 목록”을 만들어 DB 반영 단계에서 사용합니다.

## 6) 내 사이트 반영(데이터베이스 업서트)
- 수집된 프로젝트/이미지 메타를 `projects` 테이블에 upsert합니다.
  - `image_url`: 프로젝트 대표(썸네일)로 `optimized/md` 또는 `lg` 중 하나 선택
  - `gallery_images`: `GalleryItem` 배열로 생성(이미지마다 id/src/width/height/alt/visibility)
  - `link`: `/projet/<slug>`
  - `details`: 가능하면 원본 페이지의 연도/위치/설명 등을 추출해 채우고, 없으면 빈값
- 기존 프로젝트 영향 방지:
  - 기본은 `--dry-run`(변경 미적용) 모드로 리포트만 출력
  - `--upsert` 플래그일 때만 DB 반영
  - 기존 프로젝트에 이미 갤러리가 있는 경우 `--merge`/`--overwrite` 정책을 선택 가능하게 구현

## 7) UI/표시 검증(반응형/브라우저)
- `next.config.ts`에 이미지 도메인 허용 패턴을 추가(예: Supabase Storage 도메인, 또는 업로드 대상 도메인).
- 자동 테스트 스크립트:
  - N개 프로젝트 랜덤 샘플링 → 상세 페이지 접근(HTTP 200) → 대표 이미지/갤러리 URL 200 확인
  - 모든 `project_info.json` 스키마 검증(필수 필드 존재)
- 수동 검증 체크리스트:
  - 모바일/태블릿/데스크톱에서 썸네일 그리드/상세 갤러리 표시
  - 라이트박스/스크롤/로딩 성능 확인

## 8) 품질 검증(무결성/일관성/성능)
- 다운로드 무결성: 파일 크기/콘텐츠 타입 확인, 손상 파일 재다운로드
- 메타데이터 일관성: 프로젝트 폴더/파일명/DB slug 매칭 검사
- 성능: 작업 로그에 처리량(이미지/초), 실패율, 평균 파일 크기 기록

## 9) 문서화 및 재발 방지(모니터링)
- 새 문서 `IMAGE_PIPELINE.md` 작성:
  - 권리/robots 준수 원칙
  - 크롤→최적화→업로드→DB반영 명령어/옵션
  - 실패 시 재시도/롤백 절차
- 모니터링:
  - `npm run validate:assets` 같은 검증 스크립트를 추가해 배포 전/정기적으로 실행 가능하게 구성
  - (선택) 관리자 전용 "Assets Health" 화면 또는 API로 누락/깨진 링크를 리포팅

## 산출물(구현 후 제공될 것)
- 크롤러 스크립트(프로젝트 링크 수집 + 이미지 URL 추출)
- 로컬 저장/메타데이터 생성 파이프라인
- 이미지 최적화(WebP+3사이즈)
- SFTP 업로더(요구사항) + Supabase Storage 업로더(권장 대안)
- DB 업서트/머지 스크립트 + 드라이런 리포트
- 검증/모니터링 스크립트 + 문서

이 계획으로 진행해도 될까요? 승인해주시면, 코드/스크립트 추가와 설정 변경까지 포함해 바로 구현하고 실제 샘플 프로젝트 몇 개로 end-to-end 테스트까지 완료하겠습니다.