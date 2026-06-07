import { Injectable } from '@nestjs/common';

@Injectable()
export class MetadataService {
  getLanguages() {
    return [
      { code: 'en', name: 'English', nativeName: 'English', levelScale: 'CEFR' },
      { code: 'zh', name: 'Chinese', nativeName: '中文', levelScale: 'HSK' },
      { code: 'ja', name: 'Japanese', nativeName: '日本語', levelScale: 'JLPT' },
      { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', levelScale: null },
    ];
  }

  getLevelScales() {
    return [
      { scale: 'CEFR', codes: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] },
      { scale: 'HSK', codes: ['HSK1', 'HSK2', 'HSK3', 'HSK4', 'HSK5', 'HSK6'] },
      { scale: 'JLPT', codes: ['N5', 'N4', 'N3', 'N2', 'N1'] },
    ];
  }
}
