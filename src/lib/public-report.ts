type PublicReportImage = {
  id: string;
  objectKey: string;
  contentType: string;
};

type ReportForPublicView = {
  id: string;
  caseReference: string;
  type: string;
  status: string;
  category: { id: string; name: string };
  brand?: string | null;
  model?: string | null;
  colour?: string | null;
  description: string;
  campusBuilding?: string | null;
  campusLandmark?: string | null;
  createdAt: Date | string | number;
  updatedAt: Date | string | number;
  images?: PublicReportImage[];
};

function toIsoString(value: Date | string | number): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'number') return new Date(value).toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString();
}

const PRIVATE_DESCRIPTION_LABELS = [
  'Hidden verification details:',
  'Time window:',
  'Custody notes:',
  'Contact phone:',
];

/** Defense in depth for any legacy rows written before the data migration. */
function publicDescription(description: string): string {
  return description
    .split('\n')
    .filter((line) => !PRIVATE_DESCRIPTION_LABELS.some((label) => line.trimStart().startsWith(label)))
    .join('\n')
    .trim();
}

/**
 * Allowlist projection for unauthenticated report responses. Private fields
 * (contact details, verification notes, exact floor, uploader identity) are
 * deliberately never read from the source object.
 */
export function toPublicReport(report: ReportForPublicView) {
  return {
    id: report.id,
    caseReference: report.caseReference,
    type: report.type,
    status: report.status,
    category: { id: report.category.id, name: report.category.name },
    brand: report.brand ?? null,
    model: report.model ?? null,
    colour: report.colour ?? null,
    description: publicDescription(report.description),
    campusArea: {
      building: report.campusBuilding ?? null,
      landmark: report.campusLandmark ?? null,
    },
    createdAt: toIsoString(report.createdAt),
    updatedAt: toIsoString(report.updatedAt),
    images: (report.images ?? []).map((image) => ({
      id: image.id,
      objectKey: image.objectKey,
      contentType: image.contentType,
    })),
  };
}
