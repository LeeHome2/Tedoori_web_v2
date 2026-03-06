# 프로젝트 카드 크기 조절 저장 문제 수정

## 문제
- Admin 모드에서 카드 크기 조절 후 save
- 새로고침하면 변경사항이 적용되지 않음
- 원인: page.tsx의 aggressive caching 설정

## 해결 방법

### 1. page.tsx 캐싱 설정 최적화
```typescript
// Before
export const revalidate = 300; // 5분 캐싱
export const dynamic = 'force-static';
export const fetchCache = 'force-cache';

// After
export const revalidate = 60; // 1분으로 단축
// force-static, fetchCache 제거 → 더 유연한 캐싱
```

### 2. HomeClient - Admin 모드 활성화 시 자동 새로고침
```typescript
useEffect(() => {
  if (adminMode) {
    refreshProjects(); // Admin 모드 켜면 즉시 최신 데이터
  }
}, [adminMode]);
```

### 3. ProjectCard - 크기 변경 저장 후 즉시 반영
```typescript
const handleResizeSave = async () => {
  await updateProject({ ...project, cardWidth, cardHeight });
  router.refresh(); // ← 서버에서 최신 데이터 가져옴
};
```

## 변경사항 요약
1. **page.tsx**: 캐싱 시간 단축 (300초 → 60초), force-static 제거
2. **HomeClient.tsx**: Admin 모드 전환 시 자동 새로고침
3. **ProjectCard.tsx**: 크기 저장 후 router.refresh() 호출

## 결과
- ✅ 크기 변경 후 save → 즉시 반영
- ✅ 새로고침해도 변경사항 유지
- ✅ Admin 모드 전환 시 자동으로 최신 데이터
- ✅ 일반 사용자는 60초 캐싱으로 성능 유지
