/**
 * AWS SES 실제 발송 테스트 스크립트
 *
 * 사용법:
 *   npx ts-node scripts/test-ses-send.ts
 *
 * 주의: DEV_MODE=false 설정 필요
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment
dotenv.config({ path: path.join(__dirname, '../.env.local') });

import { SesService } from '../src/services/ses.service';
import { TemplateService } from '../src/services/template.service';

async function testSendEmail() {
  console.log('='.repeat(50));
  console.log('AWS SES 이메일 발송 테스트');
  console.log('='.repeat(50));

  // Check DEV_MODE
  if (process.env.DEV_MODE === 'true') {
    console.log('\n⚠️  DEV_MODE=true 상태입니다.');
    console.log('실제 발송을 위해 DEV_MODE=false 설정이 필요합니다.\n');
  }

  const sesService = new SesService();
  const templateService = new TemplateService();

  // 1. Check SES Quota
  console.log('\n📊 SES Quota 확인:');
  try {
    const quota = await sesService.getQuota();
    console.log(`  - 일일 한도: ${quota.max24HourSend}`);
    console.log(`  - 발송 완료: ${quota.sentLast24Hours}`);
    console.log(`  - 남은 한도: ${quota.remaining}`);
    console.log(`  - 초당 발송률: ${quota.maxSendRate}/sec`);
  } catch (error: any) {
    console.error('  ❌ Quota 조회 실패:', error.message);
    return;
  }

  // 2. Test email template
  const emailTemplate = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; }
    .container { padding: 20px; }
    .header { background: #007bff; color: white; padding: 10px; }
    .content { padding: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>테스트 이메일</h1>
    </div>
    <div class="content">
      <p>안녕하세요, {{name}}님!</p>
      <p>이것은 AWS SES 테스트 이메일입니다.</p>
      <p>발송 시간: {{sendTime}}</p>
    </div>
  </div>
</body>
</html>
  `;

  const templateData = {
    name: '테스트 사용자',
    sendTime: new Date().toLocaleString('ko-KR'),
  };

  const renderedHtml = templateService.render(emailTemplate, templateData);
  const subject = templateService.renderSubject('테스트 이메일 - {{name}}', templateData);

  console.log('\n📧 이메일 미리보기:');
  console.log(`  - 제목: ${subject}`);
  console.log(`  - 본문 길이: ${renderedHtml.length} bytes`);

  // 3. Optional: Add PDF attachment
  let attachment = null;
  const pdfPath = path.join(__dirname, '../test-files/sample.pdf');

  if (fs.existsSync(pdfPath)) {
    const pdfContent = fs.readFileSync(pdfPath);
    attachment = {
      filePath: pdfPath,
      fileName: 'sample.pdf',
      content: pdfContent,
      contentType: 'application/pdf',
      size: pdfContent.length,
    };
    console.log(`  - 첨부파일: sample.pdf (${attachment.size} bytes)`);
  } else {
    console.log('  - 첨부파일: 없음 (test-files/sample.pdf 생성하면 첨부됨)');
  }

  // 4. Send test email
  console.log('\n📤 이메일 발송 중...');

  // ⚠️ 실제 발송할 이메일 주소 설정
  const testRecipient = 'your-verified-email@example.com'; // 변경 필요!
  const senderEmail = process.env.SES_FROM_EMAIL || 'sender@example.com';
  const senderName = 'Tank Email System';

  try {
    const result = await sesService.send({
      to: testRecipient,
      subject: subject,
      htmlBody: renderedHtml,
      senderEmail: senderEmail,
      senderName: senderName,
      attachment: attachment,
    });

    if (result.success) {
      console.log('\n✅ 발송 성공!');
      console.log(`  - Message ID: ${result.messageId}`);
      console.log(`  - 수신자: ${testRecipient}`);
    } else {
      console.log('\n❌ 발송 실패:');
      console.log(`  - 에러 코드: ${result.errorCode}`);
      console.log(`  - 에러 메시지: ${result.error}`);
    }
  } catch (error: any) {
    console.error('\n❌ 발송 중 오류:', error.message);
  }

  console.log('\n' + '='.repeat(50));
}

testSendEmail().catch(console.error);
