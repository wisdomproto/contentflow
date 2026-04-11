# Cloudflare R2 Storage Integration

## Overview
ContentFlow에 Cloudflare R2 스토리지를 연동하여 이미지, 동영상, 참조파일, BGM, 마케팅 콘텐츠 JSON을 클라우드에 저장한다.

### 현재 문제
- AI 생성 이미지가 base64로 IndexedDB에 저장 — 용량 한계
- 참조파일/BGM 바이너리가 새로고침 시 유실
- 클라우드 스토리지 없음

### 해결
- R2 퍼블릭 버킷으로 모든 파일 저장
- Presigned URL로 클라이언트 직접 업로드 (서버 부하 최소)
- 퍼블릭 URL로 읽기 (CDN 캐싱, `<img src>` 직접 사용)

## Architecture

```
[Client]
   │
   ├─ POST /api/storage/presign ──► [Next.js API] ──► S3Client.presign(PUT)
   │                                                      │
   │◄─── { presignedUrl, publicUrl } ◄────────────────────┘
   │
   ├─ PUT presignedUrl ──────────────────────────────► [R2 Bucket]
   │
   └─ <img src={publicUrl}> ◄────── Public Read ◄──── [R2 Bucket]
```

## Bucket Structure

```
{projectId}/
  images/       ← AI 생성 이미지 (블로그/카드뉴스/스레드/유튜브)
  references/   ← 참조파일 (PDF, DOCX, 이미지 등)
  bgm/          ← BGM (MP3, WAV 등)
  videos/       ← 동영상
  content/      ← 마케팅 콘텐츠 JSON (기본글/블로그/카드뉴스/스레드/유튜브)
```

### Key Naming Convention
```
{projectId}/{category}/{contentId}-{timestamp}-{hash}.{ext}
```
- `projectId`: 프로젝트 ID
- `category`: images | references | bgm | videos | content
- `contentId`: 콘텐츠/카드 ID (해당되는 경우)
- `timestamp`: 업로드 시점 (충돌 방지)
- `hash`: 짧은 랜덤 해시 (유니크 보장)

## Environment Variables

```env
R2_ACCOUNT_ID=         # Cloudflare Account ID
R2_ACCESS_KEY_ID=      # R2 API Token Access Key
R2_SECRET_ACCESS_KEY=  # R2 API Token Secret Key
R2_BUCKET_NAME=        # 버킷 이름
R2_PUBLIC_URL=         # 퍼블릭 도메인 (https://r2.example.com 또는 *.r2.dev)
```

## Implementation

### 1. R2 Client — `src/lib/r2-client.ts`

S3-compatible 클라이언트 설정. 서버 전용 (API Routes에서만 사용).

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

### 2. API Routes

#### `POST /api/storage/presign`

**Request:**
```typescript
{
  projectId: string;
  category: 'images' | 'references' | 'bgm' | 'videos' | 'content';
  fileName: string;       // 원본 파일명 (확장자 추출용)
  contentType: string;    // MIME type
  contentId?: string;     // 연관 콘텐츠 ID (optional)
}
```

**Response:**
```typescript
{
  presignedUrl: string;   // PUT용 서명된 URL (5분 만료)
  publicUrl: string;      // 업로드 후 접근할 퍼블릭 URL
  key: string;            // R2 오브젝트 키
}
```

**Logic:**
1. 요청 파라미터 검증
   - `projectId` 형식 검증 (uuid 패턴)
   - `contentType`을 카테고리별 허용 목록과 대조 (아래 참조)
   - `PutObjectCommand`에 `ContentLength` 조건 추가 (카테고리별 최대 크기)
2. 오브젝트 키 생성: `{projectId}/{category}/{contentId}-{timestamp}-{hash}.{ext}`
3. `getSignedUrl(r2Client, PutObjectCommand, { expiresIn: 300 })`
4. 퍼블릭 URL 조합: `${R2_PUBLIC_URL}/${key}`

**Content-Type Allowlist (카테고리별):**
| Category | Allowed MIME Types | Max Size |
|----------|-------------------|----------|
| images | image/png, image/jpeg, image/webp, image/gif | 20MB |
| references | image/*, application/pdf, application/msword, application/vnd.openxmlformats-*, text/plain, text/markdown | 50MB |
| bgm | audio/mpeg, audio/wav, audio/ogg, audio/mp4, audio/aac, audio/flac | 100MB |
| videos | video/mp4, video/webm | 500MB |
| content | application/json | 10MB |

#### `DELETE /api/storage/delete`

**Request:**
```typescript
{
  keys: string[];  // 삭제할 오브젝트 키 배열 (최대 100개)
}
```

**Logic:**
1. 키 배열 검증 (최대 100개 제한, 각 키가 `{projectId}/` 형식인지 검증)
2. 1000개 단위로 청크 분할 후 `DeleteObjectsCommand`로 배치 삭제

#### `DELETE /api/storage/delete-prefix`

**Request:**
```typescript
{
  prefix: string;  // e.g. "{projectId}/" — 프로젝트 전체 삭제용
}
```

**Logic:**
1. prefix 검증: 빈 문자열 거부, `{projectId}/` 패턴 필수 (버킷 전체 삭제 방지)
2. `ListObjectsV2Command`로 prefix 하위 키 조회 (1000개 단위 pagination, `ContinuationToken` 루프)
3. 1000개 단위로 `DeleteObjectsCommand` 배치 삭제

### 3. Client Hook — `src/hooks/use-r2-upload.ts`

```typescript
interface UseR2UploadReturn {
  upload: (file: File | Blob, options: UploadOptions) => Promise<UploadResult>;
  uploadBase64: (base64: string, options: UploadOptions) => Promise<UploadResult>;
  uploading: boolean;
  error: string | null;
}

interface UploadOptions {
  projectId: string;
  category: 'images' | 'references' | 'bgm' | 'videos' | 'content';
  fileName: string;
  contentType: string;
  contentId?: string;
}

interface UploadResult {
  publicUrl: string;
  key: string;
}
```

**Flow:**
1. `/api/storage/presign` 호출 → presignedUrl, publicUrl 수신
2. `fetch(presignedUrl, { method: 'PUT', body: file, headers: { 'Content-Type': contentType } })`
3. 성공 시 `{ publicUrl, key }` 반환

**`uploadBase64`**: AI 생성 이미지용. base64 → Blob 변환 후 upload 호출.

### 4. Existing Code Modifications

#### AI Image Generation (`use-image-generation.ts`, `use-card-image-generation.ts`)
- **Before**: API 응답 base64 → 스토어에 `data:image/...;base64,...` 저장
- **After**: API 응답 base64 → `uploadBase64()` → R2 퍼블릭 URL을 스토어에 저장
- 이미지가 생성될 때마다 자동으로 R2 업로드

#### Reference Files (`reference-files-section.tsx`)
- **Before**: 메타데이터만 저장, 바이너리 유실
- **After**: 파일 선택 → `upload()` → URL을 `ReferenceFile`에 추가
- `ReferenceFile` 타입에 `url: string` 필드 추가

#### BGM Files (`bgm-section.tsx`)
- **Before**: `URL.createObjectURL()` 임시 URL, 새로고침 시 유실
- **After**: 파일 선택 → `upload()` → URL을 `BgmFile`에 추가
- `BgmFile` 타입에 `url: string` 필드 추가
- 오디오 재생도 R2 URL 사용

#### Content JSON 저장
- 콘텐츠 저장/자동저장 시 JSON을 R2 `content/` 카테고리로 업로드
- 스토어의 기존 IndexedDB 저장은 유지 (오프라인 캐시 역할)
- R2는 백업/공유/서버 동기화용

#### Type Updates (`database.ts`)
- `ReferenceFile`에 `url: string`, `r2_key: string` 추가
- `BgmFile`에 `url: string`, `r2_key: string` 추가
- 이미지 URL 필드들은 타입 변경 없음 (string 그대로, 값만 base64 → URL로)
- R2 키 복원: 퍼블릭 URL에서 `R2_PUBLIC_URL` prefix를 strip하여 키 도출 가능하므로 이미지 카드에는 별도 `r2_key` 필드 불필요

### 5. Cascade Delete

프로젝트 삭제 시:
1. 스토어에서 프로젝트 데이터 삭제 (기존 로직)
2. `/api/storage/delete-prefix` 호출 → `{projectId}/` 하위 전체 삭제

콘텐츠 삭제 시:
1. 스토어에서 콘텐츠 데이터 삭제 (기존 로직)
2. 해당 콘텐츠의 이미지 키들을 모아서 `/api/storage/delete` 호출

### 6. Package Dependencies

```
@aws-sdk/client-s3
@aws-sdk/s3-request-presigner
```

## CORS Configuration

R2 버킷에 CORS 설정 필요 (클라이언트 → R2 직접 PUT 허용):

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://your-domain.com"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["Content-Type"],
    "MaxAgeSeconds": 3600
  }
]
```

Cloudflare 대시보드 > R2 > 버킷 설정 > CORS에서 설정.

## Content JSON Sync Strategy

- **Source of Truth**: IndexedDB (로컬 우선)
- **R2**: 백업/공유용. 자동저장 시 디바운스 5초 후 R2에도 업로드
- **충돌 해결**: Last Write Wins (현재 단일 사용자이므로 충돌 없음)
- **로드 순서**: IndexedDB 먼저 → 없으면 R2에서 fetch (향후 멀티디바이스 대비)

## Out of Scope
- 기존 데이터 마이그레이션 (데이터 없음)
- 버킷 생성 자동화 (이미 생성됨)
- 이미지 리사이징/최적화 (향후 Cloudflare Image Transformations로 확장 가능)

## Error Handling
- Presign 실패: 사용자에게 토스트 알림, 재시도 유도
- 업로드 실패: 재시도 1회, 실패 시 에러 메시지
- 삭제 실패: 로그만 남기고 진행 (orphan 파일은 나중에 정리)
- 환경변수 미설정: API Route에서 500 응답 + 명확한 에러 메시지
- base64 → Blob 변환 실패: malformed base64 검증 후 에러 throw
