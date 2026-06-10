/**
 * Shape returned by GET /reports (paginated list endpoint).
 * Individual items omit contractCode to keep responses lean.
 */
export class AuditListItemDto {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  contractName: string;
  status: string;
  blobId: string | null;
  walrusUrl: string | null;
  overallRisk: string | null;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  infoCount: number;
  errorMessage: string | null;
  summaryJson: unknown;
}

/**
 * Paginated list response for GET /reports
 */
export class PaginatedAuditResponseDto {
  data: AuditListItemDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
