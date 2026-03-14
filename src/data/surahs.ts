export interface Verse {
  number: number;
  text: string;
}

export interface Surah {
  id: number;
  name: string;
  nameArabic: string;
  verses: Verse[];
}

export const surahs: Surah[] = [
  {
    id: 112,
    name: "Al-Ikhlas",
    nameArabic: "الإخلاص",
    verses: [
      { number: 1, text: "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ" },
      { number: 2, text: "قُلْ هُوَ ٱللَّهُ أَحَدٌ" },
      { number: 3, text: "ٱللَّهُ ٱلصَّمَدُ" },
      { number: 4, text: "لَمْ يَلِدْ وَلَمْ يُولَدْ" },
      { number: 5, text: "وَلَمْ يَكُن لَّهُۥ كُفُوًا أَحَدٌۢ" },
    ],
  },
  {
    id: 113,
    name: "Al-Falaq",
    nameArabic: "الفلق",
    verses: [
      { number: 1, text: "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ" },
      { number: 2, text: "قُلْ أَعُوذُ بِرَبِّ ٱلْفَلَقِ" },
      { number: 3, text: "مِن شَرِّ مَا خَلَقَ" },
      { number: 4, text: "وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ" },
      { number: 5, text: "وَمِن شَرِّ ٱلنَّفَّـٰثَـٰتِ فِى ٱلْعُقَدِ" },
      { number: 6, text: "وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ" },
    ],
  },
  {
    id: 114,
    name: "An-Nas",
    nameArabic: "الناس",
    verses: [
      { number: 1, text: "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ" },
      { number: 2, text: "قُلْ أَعُوذُ بِرَبِّ ٱلنَّاسِ" },
      { number: 3, text: "مَلِكِ ٱلنَّاسِ" },
      { number: 4, text: "إِلَـٰهِ ٱلنَّاسِ" },
      { number: 5, text: "مِن شَرِّ ٱلْوَسْوَاسِ ٱلْخَنَّاسِ" },
      { number: 6, text: "ٱلَّذِى يُوَسْوِسُ فِى صُدُورِ ٱلنَّاسِ" },
      { number: 7, text: "مِنَ ٱلْجِنَّةِ وَٱلنَّاسِ" },
    ],
  },
];
