// Template Types

export interface Template {
  templateId: number;
  autoId: number;
  htmlContent: string;
  validYn: 'Y' | 'N';
  updatedBy?: number;
  updatedAt: Date;
}

export interface CreateTemplateDto {
  htmlContent: string;
}

export interface UpdateTemplateDto {
  htmlContent: string;
}

// Template Variable - $(VARIABLE_NAME) 형식
export interface TemplateVariable {
  name: string;
  source: 'TARGET' | 'MAPPING' | 'TEXT';
  sampleValue?: string;
}

export interface TemplateValidationResult {
  valid: boolean;
  errors: TemplateValidationError[];
  warnings: TemplateValidationWarning[];
  variables: TemplateVariable[];
}

export interface TemplateValidationError {
  type: 'UNMAPPED_VARIABLE' | 'CLOB_IN_LIST' | 'SYNTAX_ERROR';
  message: string;
  variable?: string;
}

export interface TemplateValidationWarning {
  type: 'HTML_SYNTAX' | 'UNCLOSED_TAG';
  message: string;
  line?: number;
}

export interface TemplatePreviewRequest {
  index?: number;
}

export interface TemplatePreviewResponse {
  html: string;
  subject: string;
  hasAttachment: boolean;
  attachmentName?: string;
}
