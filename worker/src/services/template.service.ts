import { createLogger } from '../config/logger';

const logger = createLogger('TemplateService');

export class TemplateService {
  private variablePattern = /\$\(([A-Za-z_][A-Za-z0-9_]*)\)/g;
  private listStartPattern = /<!--LIST:([A-Za-z_][A-Za-z0-9_]*)-->/g;
  private listEndPattern = /<!--ENDLIST-->/g;

  render(template: string, data: Record<string, any>): string {
    let result = template;

    // Handle list mappings first
    result = this.renderLists(result, data);

    // Handle simple variable substitution
    result = result.replace(this.variablePattern, (match, varName) => {
      const value = data[varName];
      if (value === undefined) {
        logger.warn(`Template variable not found: ${varName}`);
        return match; // Keep original if not found
      }
      return String(value);
    });

    return result;
  }

  renderSubject(subjectTemplate: string, data: Record<string, any>): string {
    return subjectTemplate.replace(this.variablePattern, (match, varName) => {
      const value = data[varName];
      if (value === undefined) {
        logger.warn(`Subject variable not found: ${varName}`);
        return match;
      }
      return String(value);
    });
  }

  private renderLists(template: string, data: Record<string, any>): string {
    let result = template;

    // Find all list blocks
    const listMatches = [...template.matchAll(/<!--LIST:([A-Za-z_][A-Za-z0-9_]*)-->([\s\S]*?)<!--ENDLIST-->/g)];

    for (const match of listMatches) {
      const [fullMatch, listName, listTemplate] = match;
      const listData = data[listName];

      if (!Array.isArray(listData)) {
        logger.warn(`List data not found or not an array: ${listName}`);
        result = result.replace(fullMatch, '');
        continue;
      }

      // Render each item in the list
      const renderedItems = listData.map(item => {
        return listTemplate.replace(this.variablePattern, (_, varName) => {
          const value = item[varName];
          return value !== undefined ? String(value) : '';
        });
      }).join('');

      result = result.replace(fullMatch, renderedItems);
    }

    return result;
  }

  extractVariables(template: string): string[] {
    const variables = new Set<string>();
    let match;

    while ((match = this.variablePattern.exec(template)) !== null) {
      variables.add(match[1]);
    }

    return Array.from(variables);
  }

  validate(template: string, availableVariables: string[]): {
    valid: boolean;
    missingVariables: string[];
  } {
    const usedVariables = this.extractVariables(template);
    const missingVariables = usedVariables.filter(v => !availableVariables.includes(v));

    return {
      valid: missingVariables.length === 0,
      missingVariables,
    };
  }
}
