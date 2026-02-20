// backup-storage.js - Supabase Storage 백업 스크립트
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import https from 'https'

// .env.local에서 환경변수 로드
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase credentials not found in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// 파일 다운로드 함수
function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(filepath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    const file = fs.createWriteStream(filepath)
    https.get(url, (response) => {
      response.pipe(file)
      file.on('finish', () => {
        file.close()
        resolve()
      })
    }).on('error', (err) => {
      fs.unlink(filepath, () => {}) // 실패시 파일 삭제
      reject(err)
    })
  })
}

async function backupStorage() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0]
  const backupDir = `./backup_${timestamp}`

  console.log(`\n=== Supabase Storage 백업 시작 ===`)
  console.log(`백업 디렉토리: ${backupDir}\n`)

  try {
    // project-images 버킷 백업
    const bucketName = 'project-images'
    console.log(`📦 Bucket: ${bucketName}`)

    // 버킷의 모든 파일 목록 가져오기
    const { data: files, error: listError } = await supabase.storage
      .from(bucketName)
      .list('', {
        limit: 1000,
        sortBy: { column: 'name', order: 'asc' }
      })

    if (listError) {
      console.error(`❌ 파일 목록 가져오기 실패:`, listError)
      return
    }

    console.log(`📋 총 ${files.length}개 파일 발견\n`)

    let successCount = 0
    let failCount = 0

    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      // 폴더는 건너뛰기
      if (!file.name || file.id === null) continue

      try {
        // Public URL 가져오기
        const { data: urlData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(file.name)

        if (!urlData?.publicUrl) {
          console.log(`⚠️  [${i + 1}/${files.length}] URL 없음: ${file.name}`)
          failCount++
          continue
        }

        // 파일 다운로드
        const filepath = path.join(backupDir, 'storage', bucketName, file.name)
        await downloadFile(urlData.publicUrl, filepath)

        successCount++
        console.log(`✅ [${i + 1}/${files.length}] ${file.name}`)
      } catch (err) {
        failCount++
        console.error(`❌ [${i + 1}/${files.length}] 실패: ${file.name}`, err.message)
      }
    }

    console.log(`\n=== 백업 완료 ===`)
    console.log(`✅ 성공: ${successCount}개`)
    console.log(`❌ 실패: ${failCount}개`)
    console.log(`📁 저장 위치: ${path.resolve(backupDir)}`)

  } catch (error) {
    console.error('백업 중 오류 발생:', error)
  }
}

backupStorage()
