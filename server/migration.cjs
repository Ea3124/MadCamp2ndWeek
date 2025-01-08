// server/migration.js

require('dotenv').config();
const { Pool } = require('pg');

// 1) DB 연결 풀 생성
const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: process.env.POSTGRES_PORT,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB
});

// 2) CREATE TABLE 쿼리
const createUsersTableQuery = `
  CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    nickname VARCHAR(100) NOT NULL,
    score INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    `;
    // nickname VARCHAR(100) NOT NULL,

async function runMigrations() {
  try {
    // 3) 쿼리 실행
    console.log("=== 테이블 생성 시작 ===");
    await pool.query(createUsersTableQuery);
    console.log("users 테이블이 성공적으로 생성되었습니다 (이미 존재하면 생략).");
  } catch (error) {
    console.error("테이블 생성 중 에러:", error);
  } finally {
    // 4) 연결 종료
    await pool.end();
    console.log("=== 마이그레이션 완료, DB 연결 해제 ===");
  }
}

// 스크립트를 직접 실행했을 때만 함수 실행
if (require.main === module) {
  runMigrations();
}
