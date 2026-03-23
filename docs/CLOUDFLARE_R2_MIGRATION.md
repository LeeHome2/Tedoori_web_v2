# Cloudflare R2 마이그레이션 가이드

## 왜 R2로 마이그레이션하는가?

- Supabase Storage: Cached egress 5.5GB 한도 (Free), 250GB (Pro $25/월)
- Cloudflare R2: **Egress 완전 무료**, 저장소만 비용 발생 (10GB 무료)

## 1단계: Cloudflare R2 버킷 생성

### 1.1 Cloudflare 계정 설정
1. [Cloudflare Dashboard](https://dash.cloudflare.com/) 접속
2. R2 Object Storage 메뉴 선택
3. "Create bucket" 클릭
4. 버킷 이름: `tedoori-images` (예시)
5. 위치: APAC (아시아-태평양) 선택

### 1.2 Public Access 설정
1. 버킷 선택 → Settings → Public access
2. "Allow Access" 활성화
3. Custom domain 또는 R2.dev subdomain 선택
   - Custom domain 추천: `images.tedoori.com`
   - 또는 R2.dev: `pub-xxxxx.r2.dev`

### 1.3 API 토큰 생성
1. R2 Overview → Manage R2 API Tokens
2. "Create API token" 클릭
3. Permissions: Object Read & Write
4. 특정 버킷만 선택: `tedoori-images`
5. 토큰 저장:
   - Access Key ID
   - Secret Access Key
   - Endpoint URL

## 2단계: 환경변수 설정

`.env.local` 파일에 추가:

```env
# Cloudflare R2
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=tedoori-images
R2_PUBLIC_URL=https://images.tedoori.com  # 또는 R2.dev URL
```

## 3단계: AWS S3 SDK 설치

```bash
npm install @aws-sdk/client-s3
```

## 4단계: R2 클라이언트 생성

`src/lib/r2/client.ts` 파일 생성:

```typescript
import { S3Client } from '@aws-sdk/client-s3';

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export const R2_BUCKET = process.env.R2_BUCKET_NAME!;
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL!;
```

## 5단계: 업로드 API 수정

`src/app/api/upload/route.ts` 수정:

```typescript
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET, R2_PUBLIC_URL } from '@/lib/r2/client';

// 기존 Supabase 업로드 코드 대체
async function uploadToR2(file: Buffer, fileName: string, contentType: string) {
  const key = `project-images/${Date.now()}-${fileName}`;

  await r2Client.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: file,
    ContentType: contentType,
  }));

  return `${R2_PUBLIC_URL}/${key}`;
}

// POST handler에서 사용
export async function POST(request: Request) {
  // ... 기존 validation 코드 유지 ...

  const buffer = Buffer.from(await file.arrayBuffer());
  const publicUrl = await uploadToR2(buffer, fileName, file.type);

  return NextResponse.json({ url: publicUrl });
}
```

## 6단계: 기존 이미지 마이그레이션

### 6.1 마이그레이션 스크립트 생성

`scripts/migrate-to-r2.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fetch from 'node-fetch';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

async function migrateImages() {
  // 1. 모든 프로젝트 가져오기
  const { data: projects } = await supabase
    .from('projects')
    .select('id, image_url, gallery_images');

  for (const project of projects || []) {
    // 2. 메인 이미지 마이그레이션
    if (project.image_url?.includes('supabase')) {
      const newUrl = await migrateImage(project.image_url);
      await supabase
        .from('projects')
        .update({ image_url: newUrl })
        .eq('id', project.id);
    }

    // 3. 갤러리 이미지 마이그레이션
    if (project.gallery_images?.length) {
      const newGallery = await Promise.all(
        project.gallery_images.map(async (item: any) => ({
          ...item,
          src: item.src?.includes('supabase')
            ? await migrateImage(item.src)
            : item.src,
        }))
      );
      await supabase
        .from('projects')
        .update({ gallery_images: newGallery })
        .eq('id', project.id);
    }

    console.log(`Migrated project: ${project.id}`);
  }
}

async function migrateImage(supabaseUrl: string): Promise<string> {
  // 이미지 다운로드
  const response = await fetch(supabaseUrl);
  const buffer = Buffer.from(await response.arrayBuffer());

  // 파일명 추출
  const fileName = supabaseUrl.split('/').pop() || `${Date.now()}.jpg`;
  const key = `project-images/${fileName}`;

  // R2에 업로드
  await r2.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    Body: buffer,
    ContentType: response.headers.get('content-type') || 'image/jpeg',
  }));

  return `${process.env.R2_PUBLIC_URL}/${key}`;
}

migrateImages().then(() => console.log('Migration complete!'));
```

### 6.2 마이그레이션 실행

```bash
npx tsx scripts/migrate-to-r2.ts
```

## 7단계: next.config.ts 이미지 도메인 추가

```typescript
images: {
  remotePatterns: [
    // 기존 Supabase (마이그레이션 완료 후 제거 가능)
    {
      protocol: 'https',
      hostname: '*.supabase.co',
    },
    // Cloudflare R2 추가
    {
      protocol: 'https',
      hostname: 'images.tedoori.com', // 또는 R2.dev 도메인
    },
    {
      protocol: 'https',
      hostname: '*.r2.dev',
    },
  ],
}
```

## 8단계: Supabase Storage 정리 (선택)

마이그레이션 완료 후 확인이 끝나면:

1. Supabase Dashboard → Storage
2. `project-images` 버킷 내 파일 삭제
3. 또는 버킷 자체 삭제

## 체크리스트

- [ ] Cloudflare 계정 생성
- [ ] R2 버킷 생성 및 Public access 설정
- [ ] API 토큰 생성
- [ ] 환경변수 설정
- [ ] @aws-sdk/client-s3 설치
- [ ] R2 클라이언트 코드 작성
- [ ] 업로드 API 수정
- [ ] 마이그레이션 스크립트 실행
- [ ] next.config.ts 도메인 추가
- [ ] 사이트 테스트
- [ ] Supabase Free 플랜으로 다운그레이드

## 비용 비교

| 항목 | Supabase Free | Supabase Pro | Cloudflare R2 |
|------|---------------|--------------|---------------|
| 저장소 | 1GB | 100GB | 10GB 무료 |
| Egress | 5.5GB | 250GB | **무료** |
| 월 비용 | $0 | $25 | $0 (10GB 이하) |

## 문제 해결

### CORS 오류 발생 시
R2 버킷 Settings → CORS policy 추가:
```json
[
  {
    "AllowedOrigins": ["https://tedoori.com", "http://localhost:3000"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedHeaders": ["*"]
  }
]
```

### 이미지가 안 보일 때
1. R2 Public access 활성화 확인
2. next.config.ts remotePatterns 확인
3. URL 형식 확인: `https://your-domain/project-images/filename.jpg`
