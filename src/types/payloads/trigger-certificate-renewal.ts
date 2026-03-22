import type { CertificateType } from './sign-certificate';

/** TriggerCertificateRenewal REQUEST — Server → Station. */
export interface TriggerCertificateRenewalRequest {
  certificateType: CertificateType;
}

export type TriggerCertificateRenewalStatus = 'Accepted' | 'Rejected';

/** TriggerCertificateRenewal RESPONSE — Station → Server. */
export interface TriggerCertificateRenewalResponse {
  status: TriggerCertificateRenewalStatus;
  errorCode?: number;
  errorText?: string;
}
