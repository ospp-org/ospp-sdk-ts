export type CertificateType = 'StationCertificate' | 'MQTTClientCertificate';

/** SignCertificate REQUEST — Station → Server. */
export interface SignCertificateRequest {
  certificateType: CertificateType;
  csr: string;
}

export type SignCertificateStatus = 'Accepted' | 'Rejected';

/** SignCertificate RESPONSE — Server → Station. */
export interface SignCertificateResponse {
  status: SignCertificateStatus;
  errorCode?: number;
  errorText?: string;
}
