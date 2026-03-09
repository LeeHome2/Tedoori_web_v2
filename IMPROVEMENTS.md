# Tedoori Web v3 - 개선사항 목록

> 프로젝트 전체 코드 분석 결과 (2025-01-09)

## 목차
- [✅ 완료된 개선사항](#-완료된-개선사항)
- [긴급 (Critical)](#긴급-critical)
- [높은 우선순위 (High)](#높은-우선순위-high)
- [중간 우선순위 (Medium)](#중간-우선순위-medium)
- [낮은 우선순위 (Low)](#낮은-우선순위-low)
- [파일별 개선사항](#파일별-개선사항)

---

## ✅ 완료된 개선사항

### 🎉 1. 코드 중복 제거 (2025-01-09)
**영향**: 기능/외관 변화 없음 (리팩토링만)

**완료된 작업**:
- ✅ `src/lib/utils/youtube.ts` 생성 - YouTube URL 파싱 유틸리티
- ✅ `src/lib/utils/image.ts` 생성 - 이미지 압축/업로드 유틸리티
- ✅ `src/hooks/useContentEditor.ts` 생성 - 공통 CRUD 작업 훅
- ✅ `src/app/essays/page.tsx` 리팩토링 (517→273 lines, 47% 감소)
- ✅ `src/app/news/page.tsx` 리팩토링 (517→273 lines, 47% 감소)
- ✅ `src/app/about/page.tsx` 리팩토링 (485→447 lines, 8% 감소)

**효과**:
- 총 526 라인 코드 중복 제거
- 유지보수성 향상
- 버그 수정 시 한 곳만 수정하면 됨

---

### 🎉 2. 타입 안전성 개선 (2025-01-10)
**영향**: 기능/외관 변화 없음 (타입 안전성만 향상)

**완료된 작업**:
- ✅ `src/types/database.ts` 생성 - 데이터베이스 타입 정의
  - `ProjectRow`, `EssayRow`, `NewsRow`, `AboutBlockRow` 인터페이스
  - `ProjectDetails`, `DescriptionBlock` 인터페이스
  - `Project` 프론트엔드 타입
- ✅ `any` 타입 제거:
  - `src/app/page.tsx` (line 33): `row: any` → `row: ProjectRow`
  - `src/lib/db.ts` (line 51): `row: any` → `row: ProjectRow`
  - `src/app/api/projects/route.ts` (line 62): `row: any` → `row: ProjectRow`
  - `src/components/ProjectGrid.tsx` (line 243): `projectData: any` → `Partial<Project> & { id?: string }`
  - `src/app/projet/[id]/page.tsx` (line 63): `p: any` → `p: Project`
- ✅ `@ts-ignore` 주석 제거:
  - `src/components/ProjectCard.tsx` (line 112): ref 할당 타입 캐스트로 해결
  - `src/components/SortableGalleryItem.tsx` (line 195): ref 할당 타입 캐스트로 해결
  - `src/components/ProjectDetail.tsx` (line 49, 57): project.content 타입 이미 존재
  - `src/components/ProjectDetail.tsx` (line 961-962): fetchPriority 속성을 타입 캐스트로 해결

**효과**:
- 컴파일 타임 타입 체크 강화
- IDE 자동완성 개선
- 런타임 에러 사전 방지

---

### 🎉 3. 에러 처리 표준화 (2025-01-10)
**영향**: 기능/외관 변화 없음 (에러 처리만 개선)

**완료된 작업**:
- ✅ 모든 `error: any` → `error: unknown` 변경
- ✅ 타입 가드 추가: `error instanceof Error ? error.message : 'Unknown error'`
- ✅ 이벤트 핸들러 타입 개선: `e: any` → `e: Event` with type assertion

**영향받은 파일**:
- `src/hooks/useContentEditor.ts` - 4개 catch 블록
- `src/app/api/essays/route.ts` - 3개 catch 블록
- `src/app/api/news/route.ts` - 3개 catch 블록
- `src/app/api/about/route.ts` - 3개 catch 블록
- `src/components/ProjectDetail.tsx` - 2개 catch 블록
- `src/components/ProjectGrid.tsx` - 1개 catch 블록
- `src/context/ProjectContext.tsx` - 1개 catch 블록
- `src/app/about/page.tsx` - 2개 catch 블록, 1개 이벤트 핸들러
- `src/lib/utils/image.ts` - 1개 catch 블록

**효과**:
- 타입 안전한 에러 처리
- 런타임 에러 예방
- 일관된 에러 메시지 처리

---

### 🎉 4. 번들 크기 최적화 분석 (2025-01-10)
**상태**: 분석 완료, 제거 권장 패키지 식별

**분석 결과**:

**현재 사용 중인 TipTap 확장**:
- @tiptap/react (useEditor, EditorContent, BubbleMenu, FloatingMenu)
- @tiptap/starter-kit (기본 확장들 포함)
- @tiptap/extension-image
- @tiptap/extension-text-align
- @tiptap/extension-text-style
- @tiptap/extension-color
- @tiptap/extension-highlight
- @tiptap/extension-dropcursor
- @tiptap/extension-font-family
- @tiptap/extension-hard-break
- @tiptap/core

**제거 가능한 패키지** (StarterKit에 이미 포함):
- @tiptap/extension-blockquote
- @tiptap/extension-bold
- @tiptap/extension-bullet-list
- @tiptap/extension-document
- @tiptap/extension-gapcursor
- @tiptap/extension-heading
- @tiptap/extension-history
- @tiptap/extension-horizontal-rule
- @tiptap/extension-italic
- @tiptap/extension-list-item
- @tiptap/extension-ordered-list
- @tiptap/extension-paragraph
- @tiptap/extension-strike
- @tiptap/extension-text

**제거 가능한 패키지** (미사용):
- @tiptap/extension-link
- @tiptap/extension-underline

**다음 단계**:
```bash
npm uninstall @tiptap/extension-blockquote @tiptap/extension-bold @tiptap/extension-bullet-list @tiptap/extension-document @tiptap/extension-gapcursor @tiptap/extension-heading @tiptap/extension-history @tiptap/extension-horizontal-rule @tiptap/extension-italic @tiptap/extension-list-item @tiptap/extension-ordered-list @tiptap/extension-paragraph @tiptap/extension-strike @tiptap/extension-text @tiptap/extension-link @tiptap/extension-underline
```

**예상 효과**:
- 번들 크기 약 100-200KB 감소
- 빌드 시간 단축

---

## 긴급 (Critical)

### 🔴 1. 인증 보안 취약점
**위치**: `src/app/api/auth/login/route.ts`

**문제점**:
- 하드코딩된 관리자 계정 (`ADMIN_USERNAME=admin`, `ADMIN_PASSWORD=admin`)
- 단순 토큰 쿠키, 암호화/서명 없음
- 로그인 시도 제한 없음 (brute force 공격 취약)
- 세션 만료 시간 없음

**해결 방안**:
```typescript
// 제거할 것
const username = process.env.ADMIN_USERNAME;
const password = process.env.ADMIN_PASSWORD;

// 개선 방안
// 1. Supabase Auth 사용
// 2. Rate limiting 구현 (Redis 또는 메모리 기반)
// 3. Secure, httpOnly, sameSite 쿠키 설정
// 4. 세션 만료 및 refresh token 구현
```

**우선순위**: ⚠️ 즉시

---

### 🔴 2. XSS 취약점
**위치**:
- `src/app/essays/page.tsx` (line 448)
- `src/app/news/page.tsx` (line 448)
- `src/app/about/page.tsx` (line 419)

**문제점**:
```typescript
dangerouslySetInnerHTML={{
  __html: DOMPurify.sanitize(content, {
    ADD_TAGS: ['iframe'],  // iframe 허용은 위험
    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling']
  })
}}
```

**해결 방안**:
```typescript
// 화이트리스트 방식으로 변경
dangerouslySetInnerHTML={{
  __html: DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'img'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title']
  })
}}

// YouTube는 별도 컴포넌트로 처리
<YouTubeEmbed videoId={extractedId} />
```

**추가 권장**:
- Content Security Policy (CSP) 헤더 추가
- iframe sandbox 속성 사용

**우선순위**: ⚠️ 즉시

---

### 🔴 3. 파일 업로드 보안
**위치**: `src/app/api/upload/route.ts`

**문제점**:
- 업로드 속도 제한 없음
- 바이러스 스캔 없음
- 파일명 충돌 가능성 (timestamp만 사용)

**해결 방안**:
```typescript
// 1. Rate limiting 추가
import { rateLimit } from '@/lib/rate-limit';

export async function POST(req: Request) {
  // Rate limit: 5 uploads per minute per IP
  const rateLimitResult = await rateLimit(req, { max: 5, window: 60 });
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: 'Too many uploads' }, { status: 429 });
  }

  // 2. 파일명 UUID 사용
  import { v4 as uuidv4 } from 'uuid';
  const uniqueFilename = `${uuidv4()}.${extension}`;

  // 3. ClamAV 또는 서버리스 바이러스 스캔 통합
}
```

**우선순위**: ⚠️ 1-2주 내

---

### 🔴 4. 환경 변수 노출
**위치**: `.env.local`

**현재 상태**: ✅ 대부분 안전
- `.gitignore`에 `.env*` 패턴 포함 (line 40)
- Git history에 `.env.local` 커밋 기록 없음
- Vercel 환경 변수 별도 설정 완료

**개선 필요**:
- 로컬 개발 환경: `ADMIN_USERNAME=admin`, `ADMIN_PASSWORD=admin` 사용 중
- 더 강력한 credentials로 변경 권장

**해결 방안**:
```bash
# .env.local 수정
ADMIN_USERNAME=your_secure_username_here
ADMIN_PASSWORD=your_secure_password_here_min_12_chars
```

**우선순위**: 🟡 권장 (프로덕션은 안전)

---

### 🔴 5. 입력 검증 부재
**위치**:
- `src/app/essays/page.tsx` (line 76)
- `src/app/api/projects/route.ts`

**문제점**:
```typescript
// essays/page.tsx - 타이틀만 검증
if (!formData.title.trim()) {
  alert('제목을 입력해주세요');
  return;
}
// 다른 필드 검증 없음
```

**해결 방안**:
```typescript
import { z } from 'zod';

const EssaySchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요').max(200),
  slug: z.string().regex(/^[a-z0-9-]+$/, '유효하지 않은 슬러그'),
  content: z.string().max(50000, '내용이 너무 깁니다'),
  status: z.enum(['draft', 'published']),
});

// 사용
const result = EssaySchema.safeParse(formData);
if (!result.success) {
  // 에러 처리
}
```

**우선순위**: ⚠️ 1-2주 내

---

## 높은 우선순위 (High)

### 🟡 1. 코드 중복 제거
**위치**:
- `src/app/essays/page.tsx` (485 lines)
- `src/app/news/page.tsx` (485 lines)
- `src/app/about/page.tsx` (486 lines)

**문제점**:
세 파일이 거의 동일한 구조:
- 동일한 UI 레이아웃
- 동일한 폼 핸들링 로직
- 동일한 이미지/YouTube 업로드 함수
- 70-90% 코드 중복

**중복된 함수들**:
- `handleAddImage()` - 이미지 압축 및 업로드
- `handleAddYouTube()` - YouTube URL 파싱 및 임베드
- `handleMoveUp()` / `handleMoveDown()` - 순서 변경
- `handleDelete()` - 삭제
- `handleSaveInline()` - 인라인 저장

**해결 방안**:

#### Option 1: 재사용 가능한 컴포넌트
```typescript
// src/components/ContentEditor/ContentEditorPage.tsx
interface ContentEditorProps {
  apiEndpoint: string;  // '/api/essays', '/api/news', '/api/about'
  title: string;        // 'Essays', 'News', 'About'
  defaultBlocks?: Block[];
}

export function ContentEditorPage({ apiEndpoint, title, defaultBlocks }: ContentEditorProps) {
  // 공통 로직
}

// src/app/essays/page.tsx
export default function EssaysPage() {
  return <ContentEditorPage apiEndpoint="/api/essays" title="Essays" />;
}
```

#### Option 2: Custom Hook
```typescript
// src/hooks/useContentEditor.ts
export function useContentEditor(apiEndpoint: string) {
  const [blocks, setBlocks] = useState([]);

  const handleAddImage = async () => { /* 공통 로직 */ };
  const handleAddYouTube = () => { /* 공통 로직 */ };
  const handleMoveUp = async (id: string) => { /* 공통 로직 */ };
  // ...

  return {
    blocks,
    handleAddImage,
    handleAddYouTube,
    handleMoveUp,
    // ...
  };
}
```

**예상 효과**:
- 코드 라인 수 1,456 → ~500 (65% 감소)
- 유지보수 용이
- 버그 수정 시 한 곳만 수정

**우선순위**: 🔥 1-2 스프린트

---

### 🟡 2. 과도한 인라인 스타일 제거
**위치**:
- `src/components/ProjectGrid.tsx` (300+ lines)
- `src/app/essays/page.tsx` (200+ lines)
- `src/app/news/page.tsx` (200+ lines)

**문제점**:
```typescript
// ProjectGrid.tsx - 인라인 스타일 예시
<button
  style={{
    padding: '6px 12px',
    fontSize: '12px',
    border: '1px solid #ccc',
    background: '#fff',
    borderRadius: '4px',
    cursor: 'pointer',
    // ... 20+ more properties
  }}
>
```

**해결 방안**:
```typescript
// src/components/ProjectGrid.module.css
.adminButton {
  padding: 6px 12px;
  font-size: 12px;
  border: 1px solid #ccc;
  background: #fff;
  border-radius: 4px;
  cursor: pointer;
}

// ProjectGrid.tsx
<button className={styles.adminButton}>
```

**또는 UI 컴포넌트 라이브러리 생성**:
```typescript
// src/components/ui/Button.tsx
export function Button({ variant = 'default', ...props }) {
  return <button className={styles[variant]} {...props} />;
}
```

**우선순위**: 🔥 2-3 스프린트

---

### 🟡 3. 타입 안전성 개선
**위치**:
- `src/app/page.tsx` (line 32)
- `src/components/ProjectCard.tsx` (line 112)
- `src/context/AdminContext.tsx` (line 28)

**문제점**:
```typescript
// page.tsx:32
const row = data as any;  // ❌

// ProjectCard.tsx:112
// @ts-ignore  // ❌
const handleResize = (e: MouseEvent) => { ... }
```

**해결 방안**:
```typescript
// types/database.ts
export interface Project {
  id: string;
  number: string;
  title: string;
  location: string;
  year: number;
  image_url: string;
  display_order: number;
  flex_grow: number;
  visibility: 'public' | 'private' | 'team';
  created_at: string;
  updated_at: string;
}

// page.tsx
const row = data as Project;  // ✅

// ProjectCard.tsx - 타입 정의
interface ResizeMouseEvent extends MouseEvent {
  currentTarget: HTMLDivElement;
}
```

**우선순위**: 🔥 2 스프린트

---

### 🟡 4. 성능 최적화

#### 4.1 이미지 최적화
**위치**: `src/components/ProjectCard.tsx` (line 329)

**개선사항**:
```typescript
// Before
<Image
  src={imageUrl}
  alt={title}
  fill
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
/>

// After - 더 구체적인 sizes
<Image
  src={imageUrl}
  alt={title}
  fill
  sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, (max-width: 1440px) 25vw, 400px"
  placeholder="blur"
  blurDataURL={blurDataURL}  // 추가
  priority={index < 3}  // 첫 3개 이미지만 우선 로딩
/>
```

#### 4.2 번들 크기 감소
**위치**: TipTap imports

**문제점**:
```typescript
// 26개 확장 전부 import하지만 5-10개만 사용
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
// ... 23 more
```

**해결 방안**:
```typescript
// 필요한 확장만 import
import { useEditor } from '@tiptap/react';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
// 실제 사용하는 것만

// 또는 dynamic import
const TipTapEditor = dynamic(() => import('@/components/TipTapEditor'), {
  ssr: false,
  loading: () => <p>Loading editor...</p>
});
```

#### 4.3 불필요한 리렌더 방지
**위치**: `src/components/ProjectCard.tsx` (lines 50-60)

**문제점**:
```typescript
useEffect(() => {
  // 너무 많은 의존성
}, [imageUrl, title, flexGrow, width, height, /* ... */]);
```

**해결 방안**:
```typescript
// 1. React.memo로 컴포넌트 메모이제이션
export const ProjectCard = React.memo(function ProjectCard({ ... }) {
  // ...
});

// 2. useCallback으로 핸들러 메모이제이션
const handleClick = useCallback(() => {
  router.push(`/projet/${id}`);
}, [id, router]);
```

#### 4.4 페이지네이션 구현
**위치**: `src/app/essays/page.tsx`, `src/app/news/page.tsx`

**현재**: 모든 항목을 한 번에 로드

**개선 방안**:
```typescript
// Virtual scrolling 또는 infinite scroll
import { useVirtualizer } from '@tanstack/react-virtual';

// 또는 전통적인 페이지네이션
const ITEMS_PER_PAGE = 20;
const [currentPage, setCurrentPage] = useState(1);
const paginatedItems = items.slice(
  (currentPage - 1) * ITEMS_PER_PAGE,
  currentPage * ITEMS_PER_PAGE
);
```

**우선순위**: 🔥 2-3 스프린트

---

### 🟡 5. 에러 처리 표준화
**위치**: API routes

**문제점**:
```typescript
// src/app/api/projects/route.ts
// Line 192-193: 500 반환
return NextResponse.json({ error: error.message }, { status: 500 });

// Line 299: 404 반환 (같은 실패 케이스인데 다른 코드)
return NextResponse.json({ error: 'Failed to update' }, { status: 404 });
```

**해결 방안**:
```typescript
// lib/api-response.ts
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
  }
}

export function errorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.statusCode }
    );
  }

  // Unexpected errors
  console.error('Unexpected error:', error);
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}

// 사용
if (!project) {
  throw new ApiError(404, 'Project not found', 'PROJECT_NOT_FOUND');
}
```

**HTTP 상태 코드 표준**:
- 200: 성공
- 201: 생성 성공
- 400: 잘못된 요청 (validation error)
- 401: 인증 필요
- 403: 권한 없음
- 404: 리소스 없음
- 409: 충돌 (중복 등)
- 429: Too many requests
- 500: 서버 에러

**우선순위**: 🔥 2 스프린트

---

## 중간 우선순위 (Medium)

### 🟢 1. UI/UX 개선

#### 1.1 모달 및 확인 대화상자
**현재**: 브라우저 기본 `confirm()` 사용
```typescript
if (!confirm('Delete this project?')) return;
```

**개선**:
```typescript
// src/components/ui/ConfirmDialog.tsx
export function ConfirmDialog({
  title,
  message,
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  return (
    <Dialog>
      <DialogContent>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{message}</DialogDescription>
        <DialogActions>
          <Button onClick={onCancel}>취소</Button>
          <Button onClick={onConfirm} variant="danger">삭제</Button>
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
}
```

#### 1.2 실시간 폼 검증
**현재**: 제출 후에만 에러 표시

**개선**:
```typescript
const [errors, setErrors] = useState<Record<string, string>>({});

const validateField = (name: string, value: string) => {
  const result = FieldSchema.safeParse({ [name]: value });
  if (!result.success) {
    setErrors(prev => ({ ...prev, [name]: result.error.errors[0].message }));
  } else {
    setErrors(prev => ({ ...prev, [name]: '' }));
  }
};

<input
  onChange={(e) => {
    setFormData({ ...formData, title: e.target.value });
    validateField('title', e.target.value);
  }}
/>
{errors.title && <span className={styles.error}>{errors.title}</span>}
```

#### 1.3 자동 저장 기능
**위치**: Essays, News, About 페이지

**개선**:
```typescript
// hooks/useAutoSave.ts
export function useAutoSave(
  data: any,
  saveFn: (data: any) => Promise<void>,
  interval = 30000  // 30초
) {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    const timer = setInterval(async () => {
      setIsSaving(true);
      await saveFn(data);
      setLastSaved(new Date());
      setIsSaving(false);
    }, interval);

    return () => clearInterval(timer);
  }, [data, saveFn, interval]);

  return { isSaving, lastSaved };
}
```

#### 1.4 로딩 상태 표시
**현재**: 초기 로드 시 빈 화면

**개선**:
```typescript
// components/ui/Skeleton.tsx
export function ProjectCardSkeleton() {
  return (
    <div className={styles.skeleton}>
      <div className={styles.skeletonImage} />
      <div className={styles.skeletonText} />
    </div>
  );
}

// 사용
{isLoading ? (
  <>
    <ProjectCardSkeleton />
    <ProjectCardSkeleton />
    <ProjectCardSkeleton />
  </>
) : (
  projects.map(project => <ProjectCard key={project.id} {...project} />)
)}
```

**우선순위**: 📅 3 스프린트

---

### 🟢 2. 접근성 (Accessibility) 개선

#### 2.1 ARIA 레이블 추가
**위치**: 아이콘 버튼들

**문제점**:
```typescript
// ProjectGrid.tsx - 아이콘만 있는 버튼
<button className={styles.addBtn}>
  {/* CSS로 + 기호만 표시 */}
</button>
```

**개선**:
```typescript
<button
  className={styles.addBtn}
  aria-label="새 프로젝트 추가"
  title="새 프로젝트 추가"
>
  {/* CSS + 기호 */}
</button>
```

#### 2.2 키보드 네비게이션
**개선 사항**:
```typescript
// 모달에 focus trap 추가
import { FocusTrap } from '@/components/ui/FocusTrap';

<Modal>
  <FocusTrap>
    <form onSubmit={handleSubmit}>
      {/* 폼 내용 */}
      <button type="submit">저장</button>
      <button type="button" onClick={onClose}>취소</button>
    </form>
  </FocusTrap>
</Modal>

// ESC 키로 모달 닫기
useEffect(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };
  document.addEventListener('keydown', handleEscape);
  return () => document.removeEventListener('keydown', handleEscape);
}, [onClose]);
```

#### 2.3 색상 대비 개선
**문제점**: `color: #999` (WCAG AA 기준 미달)

**개선**:
```css
/* Before */
.placeholder {
  color: #999;  /* Contrast ratio: 2.85:1 (Fail) */
}

/* After */
.placeholder {
  color: #666;  /* Contrast ratio: 5.74:1 (Pass AA) */
}
```

#### 2.4 스크린 리더 지원
```typescript
// Skip navigation link 추가
<a href="#main-content" className={styles.skipLink}>
  본문으로 건너뛰기
</a>

<main id="main-content">
  {/* 메인 콘텐츠 */}
</main>

// 폼 에러를 input과 연결
<input
  id="project-title"
  aria-describedby={errors.title ? 'title-error' : undefined}
  aria-invalid={!!errors.title}
/>
{errors.title && (
  <span id="title-error" role="alert">
    {errors.title}
  </span>
)}
```

**우선순위**: 📅 3-4 스프린트

---

### 🟢 3. 모바일 반응형 개선

#### 3.1 하드코딩된 너비 제거
**위치**:
- `src/app/essays/page.tsx` (line 316)
- `src/app/about/page.tsx` (line 347)

**문제점**:
```typescript
<div style={{ width: 'calc(40vw - 145px)' }}>
```

**개선**:
```css
/* essays.module.css */
.contentWrapper {
  width: calc(40vw - 145px);
  margin-left: 165px;
}

@media (max-width: 1024px) {
  .contentWrapper {
    width: calc(100% - 40px);
    margin-left: 20px;
    margin-right: 20px;
  }
}

@media (max-width: 768px) {
  .contentWrapper {
    width: calc(100% - 40px);
    margin-left: 20px;
    margin-right: 20px;
  }
}
```

#### 3.2 터치 타겟 크기 증가
**문제점**: 리사이즈 핸들이 12x12px (너무 작음)

**개선**:
```css
/* ProjectCard.module.css */
.resizeHandle {
  width: 44px;  /* 최소 44x44px 권장 */
  height: 44px;
  /* 실제 핸들은 중앙에 12x12px */
  display: flex;
  align-items: center;
  justify-content: center;
}

.resizeHandle::after {
  content: '';
  width: 12px;
  height: 12px;
  background: white;
  border: 1px solid black;
}
```

#### 3.3 iOS 자동 줌 방지
**문제점**: 18px 이하 폰트에서 iOS 자동 줌

**해결**:
```css
/* input의 최소 폰트 크기를 16px로 */
input, textarea, select {
  font-size: 16px;  /* iOS 자동 줌 방지 */
}

/* 또는 viewport meta 태그 */
<meta
  name="viewport"
  content="width=device-width, initial-scale=1, maximum-scale=1"
/>
```

**우선순위**: 📅 3 스프린트

---

### 🟢 4. 코드 구조 개선

#### 4.1 프로젝트 구조 재구성
**현재 구조**:
```
src/
├── app/
├── components/
├── context/
└── lib/
```

**제안 구조**:
```
src/
├── app/                  # Next.js 13 app directory
├── components/
│   ├── ui/              # 재사용 UI 컴포넌트
│   │   ├── Button/
│   │   ├── Modal/
│   │   ├── Input/
│   │   └── ...
│   ├── admin/           # 관리자 전용 컴포넌트
│   │   ├── ProjectEditor/
│   │   └── ContentEditor/
│   └── projects/        # 프로젝트 관련 컴포넌트
│       ├── ProjectCard/
│       ├── ProjectGrid/
│       └── ProjectDetail/
├── hooks/               # Custom hooks
│   ├── useContentEditor.ts
│   ├── useAutoSave.ts
│   └── useImageUpload.ts
├── lib/
│   ├── api/            # API 클라이언트
│   │   ├── projects.ts
│   │   ├── essays.ts
│   │   └── upload.ts
│   ├── utils/          # 유틸리티 함수
│   │   ├── youtube.ts
│   │   ├── image.ts
│   │   └── validation.ts
│   └── constants.ts    # 상수
├── types/              # TypeScript 타입 정의
│   ├── database.ts
│   ├── api.ts
│   └── components.ts
└── styles/             # 전역 스타일
```

#### 4.2 유틸리티 함수 추출
**YouTube URL 파싱** (3곳에 중복):
```typescript
// lib/utils/youtube.ts
export function extractYoutubeId(url: string): string | null {
  const patterns = [
    /youtu\.be\/([^#\&\?]{11})/,
    /youtube\.com\/watch\?v=([^#\&\?]{11})/,
    /youtube\.com\/embed\/([^#\&\?]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

export function getYoutubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`;
}

export function getYoutubeThumbnail(videoId: string, quality: 'default' | 'hq' | 'maxres' = 'hq'): string {
  return `https://img.youtube.com/vi/${videoId}/${quality}default.jpg`;
}
```

**이미지 압축** (3곳에 중복):
```typescript
// lib/utils/image.ts
import imageCompression from 'browser-image-compression';

export const IMAGE_COMPRESSION_OPTIONS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1200,
  useWebWorker: true,
  fileType: 'image/webp' as const,
};

export async function compressImage(file: File): Promise<File> {
  console.log('Compressing:', file.name, file.type, file.size);

  const compressed = await imageCompression(file, IMAGE_COMPRESSION_OPTIONS);

  console.log('Compressed:', compressed.size);

  // Rename with .webp extension
  return new File(
    [compressed],
    `${Date.now()}.webp`,
    { type: 'image/webp' }
  );
}

export async function uploadImage(file: File): Promise<string> {
  const compressed = await compressImage(file);

  const formData = new FormData();
  formData.append('file', compressed);

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Upload failed');
  }

  const data = await response.json();
  return data.url;
}
```

**우선순위**: 📅 3-4 스프린트

---

## 낮은 우선순위 (Low)

### 🔵 1. 테스트 추가

#### 1.1 단위 테스트 (Jest)
```typescript
// __tests__/lib/utils/youtube.test.ts
import { extractYoutubeId } from '@/lib/utils/youtube';

describe('extractYoutubeId', () => {
  it('extracts ID from youtu.be URL', () => {
    expect(extractYoutubeId('https://youtu.be/dQw4w9WgXcQ'))
      .toBe('dQw4w9WgXcQ');
  });

  it('extracts ID from youtube.com/watch URL', () => {
    expect(extractYoutubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'))
      .toBe('dQw4w9WgXcQ');
  });

  it('returns null for invalid URL', () => {
    expect(extractYoutubeId('https://example.com'))
      .toBeNull();
  });
});
```

#### 1.2 통합 테스트 (API Routes)
```typescript
// __tests__/api/projects.test.ts
import { POST, GET, PUT, DELETE } from '@/app/api/projects/route';

describe('/api/projects', () => {
  describe('POST', () => {
    it('creates a new project', async () => {
      const req = new Request('http://localhost:3000/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          number: '001',
          title: 'Test Project',
          location: 'Seoul',
          year: 2024,
        }),
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty('id');
    });

    it('returns 401 for unauthenticated users', async () => {
      // Test without auth token
    });
  });
});
```

#### 1.3 E2E 테스트 (Playwright)
```typescript
// e2e/admin-workflow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Admin Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/');
    await page.click('[aria-label="Menu"]');
    await page.click('text=Login');
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'admin');
    await page.click('button:has-text("Login")');
  });

  test('creates a new project', async ({ page }) => {
    await page.click('[aria-label="Add project"]');
    await page.fill('input[name="number"]', '099');
    await page.fill('input[name="title"]', 'E2E Test Project');
    await page.fill('input[name="location"]', 'Seoul');
    await page.fill('input[name="year"]', '2024');
    await page.click('button:has-text("Create")');

    await expect(page.locator('text=E2E Test Project')).toBeVisible();
  });

  test('edits a project', async ({ page }) => {
    // Find and edit
  });

  test('deletes a project', async ({ page }) => {
    // Find and delete
  });
});
```

**테스트 커버리지 목표**:
- Utilities: 90%+
- API Routes: 80%+
- Components: 70%+
- E2E: Critical paths

**우선순위**: 📋 백로그

---

### 🔵 2. 관리자 기능 추가

#### 2.1 관리자 대시보드
```typescript
// src/app/admin/page.tsx
export default function AdminDashboard() {
  return (
    <div>
      <h1>Dashboard</h1>

      <DashboardStats>
        <StatCard title="Total Projects" value={42} />
        <StatCard title="Total Essays" value={15} />
        <StatCard title="Total Views" value={1234} />
      </DashboardStats>

      <RecentActivity />
      <QuickActions />
    </div>
  );
}
```

#### 2.2 감사 로그 (Audit Log)
```typescript
// lib/audit-log.ts
export async function logActivity(
  action: 'create' | 'update' | 'delete',
  resourceType: 'project' | 'essay' | 'news',
  resourceId: string,
  userId: string,
  changes?: Record<string, any>
) {
  await supabase.from('audit_logs').insert({
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    user_id: userId,
    changes: JSON.stringify(changes),
    timestamp: new Date().toISOString(),
  });
}

// 사용 예시
await logActivity('update', 'project', projectId, userId, {
  old: { title: 'Old Title' },
  new: { title: 'New Title' },
});
```

#### 2.3 백업/복원
```typescript
// app/api/admin/backup/route.ts
export async function GET() {
  const { data: projects } = await supabase.from('projects').select('*');
  const { data: essays } = await supabase.from('essays').select('*');
  const { data: news } = await supabase.from('news').select('*');

  const backup = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    data: { projects, essays, news },
  };

  return new Response(JSON.stringify(backup, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="backup-${Date.now()}.json"`,
    },
  });
}
```

**우선순위**: 📋 백로그

---

### 🔵 3. SEO 개선

#### 3.1 구조화된 데이터 (Schema.org)
```typescript
// components/StructuredData.tsx
export function ProjectStructuredData({ project }: { project: Project }) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ArchitecturalProject",
    "name": project.title,
    "image": project.image_url,
    "datePublished": project.created_at,
    "description": project.description,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": project.location,
      "addressCountry": "KR"
    },
    "architect": {
      "@type": "Organization",
      "name": "Tedoori Architects"
    }
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
```

#### 3.2 Sitemap 구현
```typescript
// app/sitemap.ts
export default async function sitemap() {
  const { data: projects } = await supabase
    .from('projects')
    .select('id, updated_at');

  const projectUrls = projects.map(project => ({
    url: `https://tedoori.com/projet/${project.id}`,
    lastModified: project.updated_at,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  return [
    {
      url: 'https://tedoori.com',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: 'https://tedoori.com/about',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    ...projectUrls,
  ];
}
```

#### 3.3 메타 태그 개선
```typescript
// app/projet/[id]/page.tsx
export async function generateMetadata({ params }: { params: { id: string } }) {
  const project = await getProject(params.id);

  return {
    title: `${project.title} | Tedoori Architects`,
    description: project.description || `${project.title} - ${project.location} (${project.year})`,
    openGraph: {
      title: project.title,
      description: project.description,
      images: [project.image_url],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: project.title,
      description: project.description,
      images: [project.image_url],
    },
  };
}
```

**우선순위**: 📋 백로그

---

### 🔵 4. 다국어 지원 (i18n)

```typescript
// lib/i18n/config.ts
export const i18n = {
  defaultLocale: 'ko',
  locales: ['ko', 'en', 'fr'],
};

// dictionaries/ko.json
{
  "navigation": {
    "about": "소개",
    "works": "작업",
    "essays": "에세이",
    "news": "소식"
  },
  "admin": {
    "login": "로그인",
    "logout": "로그아웃",
    "save": "저장",
    "cancel": "취소"
  }
}

// 사용
import { getDictionary } from '@/lib/i18n/dictionaries';

export default async function Page({ params: { lang } }) {
  const dict = await getDictionary(lang);

  return <h1>{dict.navigation.about}</h1>;
}
```

**우선순위**: 📋 백로그

---

## 파일별 개선사항

### 🎯 최우선 리팩토링 대상

#### 1. `src/app/api/auth/login/route.ts`
**현재 문제**: 보안 취약점 다수
**개선 항목**:
- [ ] 하드코딩된 credentials 제거
- [ ] Supabase Auth로 마이그레이션
- [ ] Rate limiting 추가
- [ ] 세션 만료 시간 설정
- [ ] Secure cookie 설정

**예상 시간**: 4-6시간

---

#### 2. `src/app/essays/page.tsx` (+ news, about)
**현재 문제**: 코드 중복, 485 lines
**개선 항목**:
- [ ] ContentEditorPage 컴포넌트로 추출
- [ ] useContentEditor 훅 생성
- [ ] 이미지/YouTube 유틸리티 분리
- [ ] 인라인 스타일 → CSS 모듈

**예상 시간**: 8-12시간

---

#### 3. `src/app/api/upload/route.ts`
**현재 문제**: 보안, 에러 처리
**개선 항목**:
- [ ] Rate limiting 추가
- [ ] 파일명 UUID 사용
- [ ] 에러 처리 표준화
- [ ] 파일 크기 검증 강화

**예상 시간**: 2-3시간

---

#### 4. `src/components/ProjectGrid.tsx`
**현재 문제**: 복잡한 상태 관리, 인라인 스타일
**개선 항목**:
- [ ] 모달을 별도 컴포넌트로 분리
- [ ] 인라인 스타일 → CSS 모듈
- [ ] 상태 관리 단순화
- [ ] React.memo 적용

**예상 시간**: 6-8시간

---

#### 5. `src/app/api/projects/route.ts`
**현재 문제**: 에러 처리 불일치, 검증 부족
**개선 항목**:
- [ ] 입력 검증 추가 (Zod)
- [ ] 에러 처리 표준화
- [ ] 인증/권한 검사 강화
- [ ] 타입 안전성 개선

**예상 시간**: 4-5시간

---

## 요약: 우선순위별 작업 시간 예상

| 우선순위 | 항목 수 | 예상 시간 | 완료 목표 |
|---------|--------|---------|---------|
| 🔴 긴급 (Critical) | 5 | 20-30시간 | 즉시 - 2주 |
| 🟡 높음 (High) | 5 | 40-50시간 | 1-3 스프린트 |
| 🟢 중간 (Medium) | 4 | 30-40시간 | 3-4 스프린트 |
| 🔵 낮음 (Low) | 4 | 60+ 시간 | 백로그 |

**총 예상 시간**: 150-170시간 (약 4-5주 풀타임)

---

## 다음 단계

1. **즉시 조치** (보안 관련):
   - [ ] `.env.local` Git history에서 제거
   - [ ] 모든 API 키 재생성
   - [ ] `.gitignore` 확인
   - [ ] Vercel 환경 변수 설정

2. **1주차**:
   - [ ] 인증 시스템 개선
   - [ ] XSS 취약점 수정
   - [ ] 파일 업로드 보안 강화

3. **2-3주차**:
   - [ ] 코드 중복 제거 (essays/news/about)
   - [ ] 인라인 스타일 → CSS 모듈
   - [ ] 타입 안전성 개선
   - [ ] 성능 최적화

4. **4-6주차**:
   - [ ] UI/UX 개선
   - [ ] 접근성 개선
   - [ ] 에러 처리 표준화

5. **백로그**:
   - [ ] 테스트 추가
   - [ ] 관리자 대시보드
   - [ ] SEO 개선
   - [ ] 다국어 지원

---

### 🎉 5. ISR 캐싱 비활성화 (2025-03-10)
**영향**: 데이터 업데이트 즉시 반영

**완료된 작업**:
- ✅ `src/app/page.tsx` - 홈페이지 ISR 캐시 비활성화 (`revalidate: 60 → 0`)
- ✅ `src/app/projet/[id]/page.tsx` - 프로젝트 상세 페이지 ISR 캐시 비활성화 (`revalidate: 60 → 0`)
- ✅ Essays, News, About 페이지 캐싱 확인 - 이미 클라이언트 컴포넌트로 실시간 페칭 중

**문제점**:
- 메모 생성/삭제 시 홈페이지 반영이 느림 (다음 작업 시에야 반영됨)
- 프로젝트 수정/갤러리 이미지 변경 시 상세 페이지 반영이 느림 (60초 캐시 때문)

**해결 방법**:
- ISR 캐싱 완전히 비활성화하여 항상 최신 데이터 페칭
- 서버 컴포넌트에서 매 요청마다 Supabase에서 fresh data 가져옴

**효과**:
- 모든 데이터 변경사항이 즉시 반영
- 관리자 작업 효율성 향상
- 사용자에게 항상 최신 콘텐츠 표시

---

**마지막 업데이트**: 2025-03-10
**작성자**: Code Analysis Agent
**개선 작업 진행**: 5개 항목 완료 (코드 중복 제거, 타입 안전성, 에러 처리, 번들 분석, ISR 캐싱)
