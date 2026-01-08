# 배포 자동화 스크립트 (Deploy Automation Script v1)
본 문서는 Tank 자동 이메일 시스템을 **고객사 온프레미스 환경 또는 내부 서버에 자동 배포하기 위한 스크립트 및 절차**를 정의한 문서입니다.

Linux 및 Windows 환경 모두 지원하며, Node.js 기반 Backend/Worker, React Frontend(Nginx), 설정 파일(.env) 등을 자동으로 배포/갱신할 수 있는 구조로 설계되어 있습니다.

---
# 1. 배포 자동화 개요
Tank 시스템은 다음 3개의 컴포넌트를 동시에 배포해야 합니다.
```
1) frontend  (React → Nginx)
2) backend   (NestJS API)
3) worker    (Scheduler + 발송 엔진)
```
본 문서의 스크립트는 다음 목적을 가집니다.
- 기존 실행 중인 서비스 안전 종료
- 빌드(필요 시) + 파일 갱신
- 환경변수 유지 검사
- 재시작 및 헬스체크 검사

---
# 2. Linux 자동 배포 스크립트 (deploy.sh)
아래 스크립트는 Linux 서버 기준 **One-Command** 자동 배포용입니다.

```
#!/bin/bash

set -e

APP_DIR="/opt/tank-mail-app"
BACKUP_DIR="/opt/tank-mail-app-backup-$(date +%Y%m%d%H%M)"
PACKAGE_FILE="tank-mail-update.tar.gz"

# 1. 기존 실행 중인 서비스 종료
echo "[1/7] Stopping running services..."
pm2 stop all || true

# 2. 백업 생성
echo "[2/7] Creating backup..."
cp -r $APP_DIR $BACKUP_DIR

# 3. 패키지 해제
echo "[3/7] Extracting new package..."
tar -xvzf $PACKAGE_FILE -C $APP_DIR --strip-components=1

# 4. Backend 설치
echo "[4/7] Installing backend dependencies..."
cd $APP_DIR/backend
npm install --production
npm run build

# 5. Worker 설치
echo "[5/7] Installing worker dependencies..."
cd $APP_DIR/worker
npm install --production
npm run build

# 6. Frontend(Nginx) 배포
echo "[6/7] Deploying frontend..."
cp -r $APP_DIR/frontend/build/* /usr/share/nginx/html/
systemctl restart nginx

# 7. 서비스 재시작
echo "[7/7] Starting services..."
pm2 start $APP_DIR/backend/dist/main.js --name backend
pm2 start $APP_DIR/worker/dist/worker.js --name worker

# 헬스체크
echo "Checking backend health..."
curl http://localhost:3000/api/health

echo "Deployment completed successfully!"
```

## ✔ 사용법
```
chmod +x deploy.sh
./deploy.sh
```

---
# 3. Windows 자동 배포 스크립트 (deploy.bat)
Windows Server용 자동 배포.

```
@echo off
set APP_DIR=C:\tank-mail-app
set PACKAGE_FILE=tank-mail-update.zip
set BACKUP_DIR=C:\tank-mail-app-backup-%date:~10,4%%date:~4,2%%date:~7,2%%time:~0,2%%time:~3,2%

REM 1. 백엔드/워커 종료
echo [1/6] Stopping Node processes...
taskkill /F /IM node.exe

echo [2/6] Creating backup...
xcopy %APP_DIR% %BACKUP_DIR% /E /I /H

echo [3/6] Extracting package...
powershell Expand-Archive -Path %PACKAGE_FILE% -DestinationPath %APP_DIR% -Force

echo [4/6] Installing backend dependencies...
cd %APP_DIR%\backend
npm install --production
npm run build

echo [5/6] Installing worker dependencies...
cd %APP_DIR%\worker
npm install --production
npm run build

echo [6/6] Deploying frontend and restarting nginx...
xcopy %APP_DIR%\frontend\build C:\nginx\html /E /I /H /Y
nginx -s reload

REM Backend & Worker 재시작
cd %APP_DIR%\backend
start node dist/main.js
cd %APP_DIR%\worker
start node dist/worker.js

echo Deployment completed!
```

---
# 4. 고객사 환경에 맞춘 배포 옵션
## ✔ 옵션 1. 무중단 배포 (Nginx + Symlink)
```
/current → 최신 버전
/releases/20250101/
/releases/20250201/
```
배포 시:
```
ln -sfn /releases/20250201 /current
systemctl reload nginx
```

## ✔ 옵션 2. Docker 기반 배포
docker-compose.yml만 교체 후:
```
docker-compose pull
docker-compose up -d
```
Docker 허용 시 가장 단순한 방식.

---
# 5. CI/CD 자동화 예시 (GitLab CI)
```
deploy_prod:
  stage: deploy
  script:
    - scp tank-mail-update.tar.gz root@server:/opt/deploy/
    - ssh root@server "cd /opt/deploy && ./deploy.sh"
```

---
# 6. 배포 체크리스트
| 항목 | 확인 |
|------|--------|
| .env 유지 여부 | ✔ |
| Backend/Worker 정상 기동 | ✔ |
| Frontend 정상 노출 | ✔ |
| Oracle 연결 테스트 | ✔ |
| 첨부파일 매칭 정상 | ✔ |
| SES 테스트 메일 수신 | ✔ |

---
# 7. 롤백 절차 (문제 발생 시)
```
1) pm2 stop all
2) rm -rf /opt/tank-mail-app
3) mv /opt/tank-mail-app-backup-YYYYMMDDHHMM /opt/tank-mail-app
4) pm2 start backend
5) pm2 start worker
6) nginx -s reload
```

---
# 8. 다음 문서
- 운영 환경 모니터링 문서 (옵션)
- AWS SES 운영/튜닝 가이드 (옵션)
- 장애 대응 매뉴얼 (Troubleshooting Guide)