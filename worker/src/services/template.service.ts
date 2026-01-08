/**
 * Template Service
 * 이메일 템플릿 렌더링 서비스
 *
 * 지원하는 템플릿 문법:
 * 1. $(VARIABLE) - 레거시 문법 (기존 호환)
 * 2. {{variable}} - Handlebars 문법 (권장)
 * 3. {{#each items}}...{{/each}} - 반복문
 * 4. {{#if condition}}...{{/if}} - 조건문
 */
import Handlebars from 'handlebars';
import { createLogger } from '../config/logger';

const logger = createLogger('TemplateService');

export class TemplateService {
  // 레거시 $(VARIABLE) 패턴
  private legacyVariablePattern = /\$\(([A-Za-z_][A-Za-z0-9_]*)\)/g;

  constructor() {
    this.registerHelpers();
  }

  /**
   * Handlebars 헬퍼 함수 등록
   */
  private registerHelpers(): void {
    // 날짜 포맷팅
    Handlebars.registerHelper('formatDate', (date: string | Date, format?: string) => {
      const d = new Date(date);
      if (isNaN(d.getTime())) return date;

      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: format === 'short' ? 'short' : 'long',
        day: 'numeric',
      };

      return d.toLocaleDateString('ko-KR', options);
    });

    // 숫자 포맷팅 (천 단위 콤마)
    Handlebars.registerHelper('formatNumber', (num: number) => {
      if (typeof num !== 'number') return num;
      return num.toLocaleString('ko-KR');
    });

    // 통화 포맷팅
    Handlebars.registerHelper('formatCurrency', (num: number, currency?: string) => {
      if (typeof num !== 'number') return num;
      return new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency: currency || 'KRW',
      }).format(num);
    });

    // 대문자 변환
    Handlebars.registerHelper('uppercase', (str: string) => {
      return typeof str === 'string' ? str.toUpperCase() : str;
    });

    // 소문자 변환
    Handlebars.registerHelper('lowercase', (str: string) => {
      return typeof str === 'string' ? str.toLowerCase() : str;
    });

    // 값이 있으면 표시, 없으면 기본값
    Handlebars.registerHelper('default', (value: any, defaultValue: any) => {
      return value !== undefined && value !== null && value !== '' ? value : defaultValue;
    });

    // 비교 연산자
    Handlebars.registerHelper('eq', (a: any, b: any) => a === b);
    Handlebars.registerHelper('ne', (a: any, b: any) => a !== b);
    Handlebars.registerHelper('gt', (a: number, b: number) => a > b);
    Handlebars.registerHelper('lt', (a: number, b: number) => a < b);
    Handlebars.registerHelper('gte', (a: number, b: number) => a >= b);
    Handlebars.registerHelper('lte', (a: number, b: number) => a <= b);

    // 논리 연산자
    Handlebars.registerHelper('and', (a: any, b: any) => a && b);
    Handlebars.registerHelper('or', (a: any, b: any) => a || b);
    Handlebars.registerHelper('not', (a: any) => !a);
  }

  /**
   * 템플릿 렌더링 (HTML 본문)
   * 레거시 $(VAR) 문법과 Handlebars {{var}} 문법 모두 지원
   */
  render(template: string, data: Record<string, any>): string {
    try {
      // Step 1: 레거시 $(VARIABLE) 문법을 Handlebars {{VARIABLE}} 문법으로 변환
      let convertedTemplate = this.convertLegacySyntax(template);

      // Step 2: Handlebars로 렌더링
      const compiled = Handlebars.compile(convertedTemplate, {
        noEscape: true, // HTML 태그 이스케이프 하지 않음
      });

      return compiled(data);
    } catch (error: any) {
      logger.error('Template rendering failed:', error.message);
      // 실패 시 원본 템플릿 반환
      return template;
    }
  }

  /**
   * 제목 템플릿 렌더링
   */
  renderSubject(subjectTemplate: string, data: Record<string, any>): string {
    try {
      const convertedTemplate = this.convertLegacySyntax(subjectTemplate);
      const compiled = Handlebars.compile(convertedTemplate);
      return compiled(data);
    } catch (error: any) {
      logger.error('Subject rendering failed:', error.message);
      return subjectTemplate;
    }
  }

  /**
   * 레거시 $(VARIABLE) 문법을 {{VARIABLE}}로 변환
   */
  private convertLegacySyntax(template: string): string {
    return template.replace(this.legacyVariablePattern, '{{$1}}');
  }

  /**
   * 템플릿에서 사용된 변수 목록 추출
   */
  extractVariables(template: string): string[] {
    const variables = new Set<string>();

    // 레거시 $(VARIABLE) 패턴
    let match;
    const legacyPattern = /\$\(([A-Za-z_][A-Za-z0-9_]*)\)/g;
    while ((match = legacyPattern.exec(template)) !== null) {
      variables.add(match[1]);
    }

    // Handlebars {{variable}} 패턴 (헬퍼 제외)
    const hbsPattern = /\{\{([A-Za-z_][A-Za-z0-9_]*)\}\}/g;
    while ((match = hbsPattern.exec(template)) !== null) {
      // 헬퍼 함수나 블록 구문이 아닌 경우만
      const varName = match[1];
      if (!['if', 'unless', 'each', 'with', 'else'].includes(varName)) {
        variables.add(varName);
      }
    }

    return Array.from(variables);
  }

  /**
   * 템플릿 유효성 검사
   */
  validate(template: string, availableVariables: string[]): {
    valid: boolean;
    missingVariables: string[];
    syntaxErrors: string[];
  } {
    const syntaxErrors: string[] = [];

    // Handlebars 문법 검사
    try {
      const convertedTemplate = this.convertLegacySyntax(template);
      Handlebars.compile(convertedTemplate);
    } catch (error: any) {
      syntaxErrors.push(`Template syntax error: ${error.message}`);
    }

    // 변수 존재 여부 검사
    const usedVariables = this.extractVariables(template);
    const missingVariables = usedVariables.filter(v => !availableVariables.includes(v));

    return {
      valid: missingVariables.length === 0 && syntaxErrors.length === 0,
      missingVariables,
      syntaxErrors,
    };
  }

  /**
   * 미리보기용 샘플 데이터 생성
   */
  generateSampleData(variables: string[]): Record<string, string> {
    const sampleData: Record<string, string> = {};

    for (const varName of variables) {
      // 변수명에 따라 적절한 샘플 데이터 생성
      const lowerName = varName.toLowerCase();

      if (lowerName.includes('name')) {
        sampleData[varName] = '홍길동';
      } else if (lowerName.includes('email')) {
        sampleData[varName] = 'sample@example.com';
      } else if (lowerName.includes('company')) {
        sampleData[varName] = 'Sample Company';
      } else if (lowerName.includes('date')) {
        sampleData[varName] = new Date().toLocaleDateString('ko-KR');
      } else if (lowerName.includes('amount') || lowerName.includes('price')) {
        sampleData[varName] = '100,000';
      } else if (lowerName.includes('phone') || lowerName.includes('tel')) {
        sampleData[varName] = '010-1234-5678';
      } else {
        sampleData[varName] = `[${varName}]`;
      }
    }

    return sampleData;
  }

  /**
   * 템플릿 미리보기 생성
   */
  preview(template: string, customData?: Record<string, any>): string {
    const variables = this.extractVariables(template);
    const sampleData = this.generateSampleData(variables);
    const data = { ...sampleData, ...customData };

    return this.render(template, data);
  }
}
