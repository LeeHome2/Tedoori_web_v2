// backup-database.js - Supabase Database 백업 (JSON 형식)
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// .env.local에서 환경변수 로드
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase credentials not found in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function backupDatabase() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0]
  const backupDir = `./backup_${timestamp}`

  console.log(`\n=== Supabase Database 백업 시작 ===`)
  console.log(`백업 디렉토리: ${backupDir}\n`)

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true })
  }

  const tables = ['projects', 'about_blocks', 'essays', 'news'] // 필요한 테이블 추가

  for (const table of tables) {
    try {
      console.log(`📋 Table: ${table}`)

      // 테이블 데이터 가져오기
      const { data, error } = await supabase
        .from(table)
        .select('*')

      if (error) {
        console.error(`❌ ${table} 백업 실패:`, error)
        continue
      }

      // JSON 파일로 저장
      const filepath = path.join(backupDir, `${table}.json`)
      fs.writeFileSync(filepath, JSON.stringify(data, null, 2))

      console.log(`✅ ${table}: ${data.length}개 레코드 저장`)

    } catch (err) {
      console.error(`❌ ${table} 처리 중 오류:`, err.message)
    }
  }

  console.log(`\n=== 데이터베이스 백업 완료 ===`)
  console.log(`📁 저장 위치: ${path.resolve(backupDir)}`)
}

backupDatabase()
