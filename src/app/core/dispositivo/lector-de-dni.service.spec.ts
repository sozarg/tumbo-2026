import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { BarcodeScanner, BarcodeFormat, BarcodeValueType } from '@capacitor-mlkit/barcode-scanning';
import { LectorDeDni } from './lector-de-dni.service';
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true, getPlatform: () => 'android' },
}));
vi.mock('@capacitor-mlkit/barcode-scanning', () => ({
  BarcodeFormat: { QrCode: 'QR_CODE', Pdf417: 'PDF_417' },
  BarcodeValueType: { Text: 'TEXT' },
  BarcodeScanner: {
    isSupported: vi.fn(),
    requestPermissions: vi.fn(),
    isGoogleBarcodeScannerModuleAvailable: vi.fn(),
    installGoogleBarcodeScannerModule: vi.fn(),
    scan: vi.fn(),
  },
}));
describe('Lector nativo: contrato y errores recuperables (sin acreditar óptica física)', () => {
  beforeEach(() => {
    vi.mocked(BarcodeScanner.isSupported).mockResolvedValue({ supported: true });
    vi.mocked(BarcodeScanner.requestPermissions).mockResolvedValue({ camera: 'granted' });
    vi.mocked(BarcodeScanner.isGoogleBarcodeScannerModuleAvailable).mockResolvedValue({
      available: true,
    });
  });
  it.each([BarcodeFormat.QrCode, BarcodeFormat.Pdf417])(
    'distingue formato %s y solo lee campos presentes',
    async (formato) => {
      vi.mocked(BarcodeScanner.scan).mockResolvedValue({
        barcodes: [
          {
            format: formato,
            rawValue: '0011@PRUEBA@PERSONA@F@43210987@A',
            displayValue: '',
            valueType: BarcodeValueType.Text,
          },
        ],
      });
      const r = await TestBed.inject(LectorDeDni).leer();
      expect(r.estado).toBe('leido');
      if (r.estado === 'leido') {
        expect(r.formato).toBe(formato === BarcodeFormat.QrCode ? 'QR' : 'PDF417');
        expect(r.datos.cuil).toBeNull();
        expect(r.datos.correo).toBeNull();
      }
    },
  );
  it('permiso denegado permite reintentar', async () => {
    vi.mocked(BarcodeScanner.requestPermissions).mockResolvedValueOnce({ camera: 'denied' });
    expect((await TestBed.inject(LectorDeDni).leer()).estado).toBe('error');
    vi.mocked(BarcodeScanner.scan).mockResolvedValueOnce({ barcodes: [] });
    expect((await TestBed.inject(LectorDeDni).leer()).estado).toBe('cancelado');
  });
  it('cancelar no genera persona', async () => {
    vi.mocked(BarcodeScanner.scan).mockRejectedValueOnce(new Error('User cancelled'));
    expect(await TestBed.inject(LectorDeDni).leer()).toEqual({ estado: 'cancelado' });
  });
  it.each([
    ['TUMBO://mesa/token', 'otro-codigo'],
    ['0011@PRUEBA@PERSONA@F@incorrecto', 'malformado'],
  ])('diferencia %s', async (rawValue, estado) => {
    vi.mocked(BarcodeScanner.scan).mockResolvedValueOnce({
      barcodes: [
        {
          format: BarcodeFormat.QrCode,
          rawValue,
          displayValue: '',
          valueType: BarcodeValueType.Text,
        },
      ],
    });
    expect((await TestBed.inject(LectorDeDni).leer()).estado).toBe(estado);
  });
});
