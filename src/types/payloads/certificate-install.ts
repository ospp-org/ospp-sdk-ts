import type { CertificateType } from './sign-certificate';

/** CertificateInstall REQUEST — Server → Station. */
export interface CertificateInstallRequest {
  certificateType: CertificateType;
  certificate: string;
  caCertificateChain?: string;
}

export type CertificateInstallStatus = 'Accepted' | 'Rejected';

/** CertificateInstall RESPONSE — Station → Server. */
export interface CertificateInstallResponse {
  status: CertificateInstallStatus;
  certificateSerialNumber?: string;
  errorCode?: number;
  errorText?: string;
}
