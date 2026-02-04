import { db } from '../config/database';
import { assetDocuments, assetDocumentVersions } from '../db/schema';
import { eq, and, desc, asc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export class DocumentService {
  static async uploadDocument(data: {
    tenant_id: string;
    asset_id: string;
    document_type: string;
    title: string;
    description?: string;
    file_url: string;
    file_size_mb?: number;
    file_extension?: string;
    uploaded_by: string;
    tags?: string[];
    expires_at?: Date;
  }) {
    const documentId = uuidv4();

    // Marcar versões anteriores como not latest
    await db
      .update(assetDocuments)
      .set({ is_latest: false })
      .where(
        and(
          eq(assetDocuments.asset_id, data.asset_id),
          eq(assetDocuments.document_type, data.document_type),
          eq(assetDocuments.is_latest, true),
        ),
      );

    // Criar novo documento
    const [document] = await db
      .insert(assetDocuments)
      .values({
        tenant_id: data.tenant_id,
        asset_id: data.asset_id,
        document_type: data.document_type,
        title: data.title,
        description: data.description,
        file_url: data.file_url,
        file_size_mb: data.file_size_mb ? data.file_size_mb.toString() : undefined,
        file_extension: data.file_extension,
        uploaded_by: data.uploaded_by,
        version_number: 1,
        is_latest: true,
        tags: data.tags,
        expires_at: data.expires_at,
      })
      .returning();

    // Criar primeira versão
    await db.insert(assetDocumentVersions).values({
      id: uuidv4(),
      document_id: documentId,
      version_number: 1,
      change_log: 'Initial upload',
      file_url: data.file_url,
      uploaded_by: data.uploaded_by,
    });

    return document;
  }

  static async getDocuments(
    tenantId: string,
    assetId?: string,
    filter?: {
      document_type?: string;
      only_latest?: boolean;
      limit?: number;
      offset?: number;
    },
  ) {
    const conditions = [eq(assetDocuments.tenant_id, tenantId)];

    if (assetId) {
      conditions.push(eq(assetDocuments.asset_id, assetId));
    }

    if (filter?.document_type) {
      conditions.push(eq(assetDocuments.document_type, filter.document_type));
    }

    if (filter?.only_latest !== false) {
      conditions.push(eq(assetDocuments.is_latest, true));
    }

    return db.query.assetDocuments.findMany({
      where: and(...conditions),
      with: {
        asset: {
          columns: {
            id: true,
            name: true,
            code: true,
          },
        },
        uploadedByUser: {
          columns: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
        versions: {
          orderBy: desc(assetDocumentVersions.created_at),
        },
      },
      orderBy: desc(assetDocuments.created_at),
      limit: filter?.limit || 100,
      offset: filter?.offset || 0,
    });
  }

  static async getDocumentVersions(
    _tenantId: string,
    documentId: string,
  ) {
    return db.query.assetDocumentVersions.findMany({
      where: eq(assetDocumentVersions.document_id, documentId),
      with: {
        uploadedByUser: {
          columns: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
      },
      orderBy: desc(assetDocumentVersions.created_at),
    });
  }

  static async updateDocument(
    documentId: string,
    tenantId: string,
    data: Partial<{
      title: string;
      description: string;
      tags: string[];
      expires_at: Date;
    }>,
  ) {
    const [updated] = await db
      .update(assetDocuments)
      .set({
        ...data,
        updated_at: new Date(),
      })
      .where(
        and(
          eq(assetDocuments.id, documentId),
          eq(assetDocuments.tenant_id, tenantId),
        ),
      )
      .returning();

    return updated;
  }

  static async deleteDocument(documentId: string, tenantId: string) {
    await db
      .delete(assetDocuments)
      .where(
        and(
          eq(assetDocuments.id, documentId),
          eq(assetDocuments.tenant_id, tenantId),
        ),
      );
  }

  static async getExpiringDocuments(tenantId: string, daysThreshold: number = 30) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysThreshold);

    return db.query.assetDocuments.findMany({
      where: and(
        eq(assetDocuments.tenant_id, tenantId),
        eq(assetDocuments.is_latest, true),
      ),
      with: {
        asset: {
          columns: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: asc(assetDocuments.expires_at),
    });
  }
}
