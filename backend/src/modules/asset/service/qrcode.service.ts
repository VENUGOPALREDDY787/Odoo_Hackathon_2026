import QRCode from 'qrcode';

export class QRCodeService {
  /**
   * Generates a base64 Data URL containing the QR Code representation of the asset profile.
   */
  async generateQRCode(assetId: string, assetTag: string, orgId: string): Promise<string> {
    const payload = JSON.stringify({
      id: assetId,
      tag: assetTag,
      orgId
    });
    return QRCode.toDataURL(payload);
  }
}

export const qrCodeService = new QRCodeService();
export default qrCodeService;
