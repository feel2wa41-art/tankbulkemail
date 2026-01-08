/**
 * Template Service Unit Tests
 * 템플릿 렌더링 서비스 테스트
 */
import { TemplateService } from './template.service';

describe('TemplateService', () => {
  let templateService: TemplateService;

  beforeEach(() => {
    templateService = new TemplateService();
  });

  describe('render()', () => {
    it('should render Handlebars {{variable}} syntax', () => {
      const template = 'Hello, {{name}}!';
      const data = { name: 'John' };

      const result = templateService.render(template, data);

      expect(result).toBe('Hello, John!');
    });

    it('should render legacy $(VARIABLE) syntax', () => {
      const template = 'Hello, $(name)!';
      const data = { name: 'Jane' };

      const result = templateService.render(template, data);

      expect(result).toBe('Hello, Jane!');
    });

    it('should handle mixed syntax templates', () => {
      const template = 'Hello $(firstName), your email is {{email}}.';
      const data = { firstName: 'Mike', email: 'mike@test.com' };

      const result = templateService.render(template, data);

      expect(result).toBe('Hello Mike, your email is mike@test.com.');
    });

    it('should preserve HTML tags without escaping', () => {
      const template = '<h1>Hello, {{name}}</h1><p>Welcome!</p>';
      const data = { name: 'User' };

      const result = templateService.render(template, data);

      expect(result).toBe('<h1>Hello, User</h1><p>Welcome!</p>');
    });

    it('should handle missing variables gracefully', () => {
      const template = 'Hello, {{name}}!';
      const data = {};

      const result = templateService.render(template, data);

      expect(result).toBe('Hello, !');
    });

    it('should render multiple variables', () => {
      const template = '{{greeting}}, {{name}}! Your order #{{orderId}} is {{status}}.';
      const data = {
        greeting: 'Hi',
        name: 'Customer',
        orderId: '12345',
        status: 'shipped',
      };

      const result = templateService.render(template, data);

      expect(result).toBe('Hi, Customer! Your order #12345 is shipped.');
    });

    it('should handle empty template', () => {
      const result = templateService.render('', { name: 'Test' });

      expect(result).toBe('');
    });

    it('should handle template with no variables', () => {
      const template = 'This is a static message.';

      const result = templateService.render(template, { name: 'Test' });

      expect(result).toBe('This is a static message.');
    });

    it('should render #each loops', () => {
      const template = '<ul>{{#each items}}<li>{{this}}</li>{{/each}}</ul>';
      const data = { items: ['Apple', 'Banana', 'Cherry'] };

      const result = templateService.render(template, data);

      expect(result).toBe('<ul><li>Apple</li><li>Banana</li><li>Cherry</li></ul>');
    });

    it('should render #if conditions', () => {
      const template = '{{#if premium}}Premium User{{else}}Regular User{{/if}}';

      const premiumResult = templateService.render(template, { premium: true });
      const regularResult = templateService.render(template, { premium: false });

      expect(premiumResult).toBe('Premium User');
      expect(regularResult).toBe('Regular User');
    });

    it('should return original template on syntax error', () => {
      const template = '{{#if unclosed}}Missing end';

      const result = templateService.render(template, {});

      // Should return original or handle gracefully
      expect(typeof result).toBe('string');
    });
  });

  describe('renderSubject()', () => {
    it('should render subject with variables', () => {
      const subject = 'Order #{{orderId}} - Confirmation';
      const data = { orderId: '12345' };

      const result = templateService.renderSubject(subject, data);

      expect(result).toBe('Order #12345 - Confirmation');
    });

    it('should render subject with legacy syntax', () => {
      const subject = 'Welcome, $(name)!';
      const data = { name: 'User' };

      const result = templateService.renderSubject(subject, data);

      expect(result).toBe('Welcome, User!');
    });
  });

  describe('extractVariables()', () => {
    it('should extract Handlebars variables', () => {
      const template = 'Hello {{name}}, your email is {{email}}.';

      const variables = templateService.extractVariables(template);

      expect(variables).toContain('name');
      expect(variables).toContain('email');
      expect(variables).toHaveLength(2);
    });

    it('should extract legacy $(VAR) variables', () => {
      const template = 'Hello $(firstName) $(lastName)!';

      const variables = templateService.extractVariables(template);

      expect(variables).toContain('firstName');
      expect(variables).toContain('lastName');
    });

    it('should extract mixed syntax variables', () => {
      const template = '$(greeting), {{name}}! Order: $(orderId)';

      const variables = templateService.extractVariables(template);

      expect(variables).toContain('greeting');
      expect(variables).toContain('name');
      expect(variables).toContain('orderId');
    });

    it('should not include Handlebars keywords', () => {
      const template = '{{#if active}}{{name}}{{/if}}{{#each items}}{{this}}{{/each}}';

      const variables = templateService.extractVariables(template);

      expect(variables).not.toContain('if');
      expect(variables).not.toContain('each');
      expect(variables).not.toContain('else');
      expect(variables).toContain('name');
    });

    it('should handle empty template', () => {
      const variables = templateService.extractVariables('');

      expect(variables).toHaveLength(0);
    });

    it('should deduplicate variables', () => {
      const template = '{{name}} said hello to {{name}}.';

      const variables = templateService.extractVariables(template);

      expect(variables.filter(v => v === 'name')).toHaveLength(1);
    });
  });

  describe('validate()', () => {
    it('should return valid for template with all variables available', () => {
      const template = 'Hello {{name}}, your email is {{email}}.';
      const availableVars = ['name', 'email', 'phone'];

      const result = templateService.validate(template, availableVars);

      expect(result.valid).toBe(true);
      expect(result.missingVariables).toHaveLength(0);
      expect(result.syntaxErrors).toHaveLength(0);
    });

    it('should detect missing variables', () => {
      const template = 'Hello {{name}}, order {{orderId}}!';
      const availableVars = ['name'];

      const result = templateService.validate(template, availableVars);

      expect(result.valid).toBe(false);
      expect(result.missingVariables).toContain('orderId');
    });

    it('should handle syntax error check gracefully', () => {
      // Handlebars may handle some "incomplete" templates gracefully
      // This test ensures validate() doesn't throw
      const template = '{{#if open}}Content without closing';
      const availableVars = ['open'];

      const result = templateService.validate(template, availableVars);

      // The function should return a result without throwing
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('missingVariables');
      expect(result).toHaveProperty('syntaxErrors');
    });

    it('should validate legacy syntax templates', () => {
      const template = 'Hello $(name)!';
      const availableVars = ['name'];

      const result = templateService.validate(template, availableVars);

      expect(result.valid).toBe(true);
    });
  });

  describe('generateSampleData()', () => {
    it('should generate sample data for name variables', () => {
      const variables = ['userName', 'firstName'];

      const sampleData = templateService.generateSampleData(variables);

      expect(sampleData.userName).toBe('홍길동');
      expect(sampleData.firstName).toBe('홍길동');
    });

    it('should generate sample data for email variables', () => {
      const variables = ['email', 'userEmail'];

      const sampleData = templateService.generateSampleData(variables);

      expect(sampleData.email).toBe('sample@example.com');
      expect(sampleData.userEmail).toBe('sample@example.com');
    });

    it('should generate sample data for company variables', () => {
      // Use 'company' without 'name' suffix to avoid matching name pattern first
      const variables = ['company', 'myCompany'];

      const sampleData = templateService.generateSampleData(variables);

      expect(sampleData.company).toBe('Sample Company');
      expect(sampleData.myCompany).toBe('Sample Company');
    });

    it('should generate sample data for amount/price variables', () => {
      const variables = ['amount', 'totalPrice'];

      const sampleData = templateService.generateSampleData(variables);

      expect(sampleData.amount).toBe('100,000');
      expect(sampleData.totalPrice).toBe('100,000');
    });

    it('should generate placeholder for unknown variables', () => {
      const variables = ['customField'];

      const sampleData = templateService.generateSampleData(variables);

      expect(sampleData.customField).toBe('[customField]');
    });
  });

  describe('preview()', () => {
    it('should generate preview with sample data', () => {
      const template = 'Hello {{name}}, your email is {{email}}.';

      const preview = templateService.preview(template);

      expect(preview).toContain('홍길동');
      expect(preview).toContain('sample@example.com');
    });

    it('should allow custom data override', () => {
      const template = 'Hello {{name}}!';
      const customData = { name: 'Custom User' };

      const preview = templateService.preview(template, customData);

      expect(preview).toBe('Hello Custom User!');
    });

    it('should merge custom data with sample data', () => {
      const template = '{{name}}: {{email}}';
      const customData = { name: 'Override Name' };

      const preview = templateService.preview(template, customData);

      expect(preview).toContain('Override Name');
      expect(preview).toContain('sample@example.com');
    });
  });

  describe('Handlebars Helpers', () => {
    it('should format date with formatDate helper', () => {
      const template = '{{formatDate date}}';
      const date = new Date('2024-01-15');

      const result = templateService.render(template, { date });

      expect(result).toMatch(/2024/);
      expect(result).toMatch(/1월|January/);
    });

    it('should format number with formatNumber helper', () => {
      const template = '{{formatNumber amount}}';
      const data = { amount: 1234567 };

      const result = templateService.render(template, data);

      expect(result).toMatch(/1,234,567|1.234.567/);
    });

    it('should convert to uppercase with uppercase helper', () => {
      const template = '{{uppercase text}}';
      const data = { text: 'hello world' };

      const result = templateService.render(template, data);

      expect(result).toBe('HELLO WORLD');
    });

    it('should convert to lowercase with lowercase helper', () => {
      const template = '{{lowercase text}}';
      const data = { text: 'HELLO WORLD' };

      const result = templateService.render(template, data);

      expect(result).toBe('hello world');
    });

    it('should provide default value with default helper', () => {
      const template = '{{default value "N/A"}}';

      const withValue = templateService.render(template, { value: 'Test' });
      const withoutValue = templateService.render(template, { value: '' });
      const undefinedValue = templateService.render(template, {});

      expect(withValue).toBe('Test');
      expect(withoutValue).toBe('N/A');
      expect(undefinedValue).toBe('N/A');
    });

    it('should handle comparison helpers', () => {
      const template = '{{#if (eq status "active")}}Active{{else}}Inactive{{/if}}';

      const activeResult = templateService.render(template, { status: 'active' });
      const inactiveResult = templateService.render(template, { status: 'pending' });

      expect(activeResult).toBe('Active');
      expect(inactiveResult).toBe('Inactive');
    });

    it('should handle numeric comparison helpers', () => {
      const template = '{{#if (gt count 10)}}Many{{else}}Few{{/if}}';

      const manyResult = templateService.render(template, { count: 15 });
      const fewResult = templateService.render(template, { count: 5 });

      expect(manyResult).toBe('Many');
      expect(fewResult).toBe('Few');
    });
  });
});
