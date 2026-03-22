import type { ServiceItem } from '../common';

/** UpdateServiceCatalog REQUEST — Server → Station. */
export interface UpdateServiceCatalogRequest {
  catalogVersion: string;
  services: ServiceItem[];
}

/** UpdateServiceCatalog RESPONSE — Station → Server (discriminated union). */
export type UpdateServiceCatalogResponse =
  | { status: 'Accepted'; previousCatalogVersion?: string }
  | { status: 'Rejected'; errorCode: number; errorText: string };
