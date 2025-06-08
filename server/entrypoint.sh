#!/bin/bash
# entrypoint.sh

echo "⏳ PostgreSQL 준비 대기 중..."

# DB가 열릴 때까지 대기 (최대 30초)
for i in {1..5}; do
  if pg_isready -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" > /dev/null 2>&1; then
    echo "✅ PostgreSQL 연결 가능"
    break
  fi
  echo "⌛ PostgreSQL 연결 재시도... ($i/5)"
  sleep 1
done

# 마이그레이션 실행
echo "🚀 마이그레이션 실행..."
npm run migrate

# 원래 서버 실행
echo "🚀 서버 실행..."
exec npm run start  # 또는 node server.js 등
