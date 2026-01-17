This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Supabase Setup

See [SUPABASE_SETUP.md](SUPABASE_SETUP.md).

## 이미지 파이프라인

`https://tedoori.net/`에서 이미지 수집/정리/업로드 후 DB 반영은 [IMAGE_PIPELINE.md](IMAGE_PIPELINE.md)를 참고하세요.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

### 1. 저장소 연결
1. [Vercel](https://vercel.com)에 로그인
2. "New Project" 클릭
3. GitHub에서 `Tedoori_web_v2` 저장소 선택
4. "Import" 클릭

### 2. 환경 변수 설정
배포 전에 **반드시** 다음 환경 변수를 설정해야 합니다:

**Vercel Dashboard → Settings → Environment Variables** 에서 추가:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

환경 변수 값은 Supabase Dashboard → Settings → API에서 확인할 수 있습니다.

> **중요**: `.env.local.example` 파일을 참고하여 모든 필수 환경 변수를 설정하세요.

### 3. 배포
환경 변수 설정 후 "Deploy" 버튼을 클릭하면 자동으로 배포됩니다.

배포 관련 자세한 내용은 [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying)을 참고하세요.
