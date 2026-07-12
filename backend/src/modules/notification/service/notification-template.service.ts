import { NotificationRepository } from '../repository/notification.repository';
import prisma from '../../../database/db';

/**
 * NotificationTemplateService — Dynamic title and body generation using parameterized templates.
 */
export class NotificationTemplateService {
  private repository: NotificationRepository;

  constructor(repository = new NotificationRepository()) {
    this.repository = repository;
  }

  /**
   * Evaluates templates against variables.
   * Fallback to static text if no template registered.
   */
  async render(
    orgId: string,
    type: string,
    variables: Record<string, string>,
    defaultTitle: string,
    defaultBody: string
  ): Promise<{ title: string; message: string }> {
    const template = await this.repository.findTemplate(orgId, type);

    if (!template) {
      return {
        title: this.interpolate(defaultTitle, variables),
        message: this.interpolate(defaultBody, variables)
      };
    }

    return {
      title: this.interpolate(template.titleTemplate, variables),
      message: this.interpolate(template.bodyTemplate, variables)
    };
  }

  /**
   * Helper upserting templates. Used for setup or testing.
   */
  async upsertTemplate(orgId: string, type: string, titleTemplate: string, bodyTemplate: string) {
    return prisma.notificationTemplate.upsert({
      where: { organizationId_type: { organizationId: orgId, type } },
      create: { organizationId: orgId, type, titleTemplate, bodyTemplate },
      update: { titleTemplate, bodyTemplate }
    });
  }

  private interpolate(tmpl: string, vars: Record<string, string>): string {
    return tmpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
      return vars[key] !== undefined ? vars[key] : `{{${key}}}`;
    });
  }
}

export default NotificationTemplateService;
