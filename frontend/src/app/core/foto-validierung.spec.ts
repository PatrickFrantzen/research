import { uebernehmeFoto, zielMasse } from './foto-validierung.js';

describe('zielMasse', () => {
  it('scales the longest edge down to 2000 px and keeps the aspect ratio', () => {
    expect(zielMasse(4000, 3000)).toEqual({ breite: 2000, hoehe: 1500 });
    expect(zielMasse(3000, 6000)).toEqual({ breite: 1000, hoehe: 2000 });
  });

  it('does not upscale smaller photos', () => {
    expect(zielMasse(1200, 800)).toEqual({ breite: 1200, hoehe: 800 });
    expect(zielMasse(2000, 1000)).toEqual({ breite: 2000, hoehe: 1000 });
  });
});

describe('uebernehmeFoto', () => {
  it('converts a large PNG into a downscaled JPEG', async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 3000;
    canvas.height = 1500;
    const png = await new Promise<Blob>((resolve) => canvas.toBlob((blob) => resolve(blob!), 'image/png'));

    const { datei, meldung } = await uebernehmeFoto(new File([png], 'gross.png', { type: 'image/png' }));

    expect(meldung).toBeNull();
    expect(datei!.type).toBe('image/jpeg');
    expect(datei!.name).toBe('gross.jpg');
    const bild = await createImageBitmap(datei!);
    expect([bild.width, bild.height]).toEqual([2000, 1000]);
  });
});
