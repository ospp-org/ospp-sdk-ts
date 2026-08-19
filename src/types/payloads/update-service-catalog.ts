import type { ServiceItem } from '../common.js';

/** UpdateServiceCatalog REQUEST — Server → Station. */
export interface UpdateServiceCatalogRequest {
  catalogVersion: string;
  services: ServiceItem[];
}

/** UpdateServiceCatalog RESPONSE — Station → Server (discriminated union). */
export type UpdateServiceCatalogResponse =
  | {
      status: 'Accepted';
      /**
       * The catalog version this update replaced.
       *
       * REQUIRED on `Accepted` since spec `v0.25.0`, which put the conditional in
       * `update-service-catalog-response.schema.json` — `if status is Accepted,
       * then previousCatalogVersion is required`. Before that it was a **MUST** in
       * `update-service-catalog.md` processing rule 3, `Required=No` in that same
       * file's table, and optional in the schema: three sites, two answers, and
       * the profile is the document firmware is written from.
       *
       * The **empty string** is the legitimate value for a station that has never
       * held a catalog — which is why this is `string` and not an optional field
       * with `undefined` standing in for "none". Those are two different
       * statements on the wire and only one of them is conforming.
       */
      previousCatalogVersion: string;
    }
  | { status: 'Rejected'; errorCode: number; errorText: string };
