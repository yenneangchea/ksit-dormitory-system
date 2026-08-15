export type ChangelogCategory = 'feature' | 'security' | 'improvement' | 'release';

export type ChangelogEntry = {
  version: string;
  releasedAt: string;
  dateLabel: string;
  category: ChangelogCategory;
  categoryLabel: string;
  title: string;
  summary: string;
  highlights: string[];
};

export const changelogEntries: ChangelogEntry[] = [
  {
    version: 'v1.3.0',
    releasedAt: '2026-08-15',
    dateLabel: '១៥ សីហា ២០២៦',
    category: 'feature',
    categoryLabel: 'FEATURE',
    title: 'Room Matrix អូស និងទម្លាក់សម្រាប់ Admin និង Manager',
    summary: 'បន្ថែមផ្ទាំងចាត់បន្ទប់ដោយដៃ ដែលអនុញ្ញាតឱ្យអ្នកមានសិទ្ធិអូសនិស្សិតទៅបន្ទប់សមស្រប ឬផ្លាស់ទីអ្នកស្នាក់នៅរវាងបន្ទប់។',
    highlights: [
      'គាំទ្រ Drag-and-Drop និង Select / Place here សម្រាប់ការប្រើប្រាស់លើទូរស័ព្ទ។',
      'ពិនិត្យភេទ សមត្ថភាពបន្ទប់ ស្ថានភាព maintenance និងលេខគ្រែទំនេរនៅ server-side។',
      'មានការពារការប្រកួតប្រជែងទិន្នន័យតាម occupied-count ពេលផ្លាស់ទីបន្ទប់។',
    ],
  },
  {
    version: 'v1.2.5',
    releasedAt: '2026-08-14',
    dateLabel: '១៤ សីហា ២០២៦',
    category: 'improvement',
    categoryLabel: 'IMPROVEMENT',
    title: 'ពង្រឹងការឆ្លើយតបលើទូរស័ព្ទ និង Touch Targets',
    summary: 'បានពិនិត្យ និងកែលម្អ ២២ ផ្ទាំងការងារ ដើម្បីធានាថាការរុករក និងបញ្ជាអាចប្រើបានល្អលើអេក្រង់តូច។',
    highlights: [
      'កែសម្រួលទំហំប៊ូតុង ស៊ុមបញ្ជា និង drawer controls ឱ្យស្របតាម touch target អប្បបរមា។',
      'កាត់បន្ថយ overflow និងធានាថា sidebar/navigation អាចប្រើបានលើទូរស័ព្ទ។',
      'ផ្ទៀងផ្ទាត់ layout សម្រាប់ Admin, Manager, Teacher និង Student portals។',
    ],
  },
  {
    version: 'v1.2.0',
    releasedAt: '2026-08-14',
    dateLabel: '១៤ សីហា ២០២៦',
    category: 'feature',
    categoryLabel: 'FEATURE',
    title: 'Sidebar រចនាបថ Gemini, Analytics និង Homepage CMS',
    summary: 'ធ្វើទំនើបកម្មផ្ទាំងតួនាទីទាំងបួន ដោយបន្ថែម sidebar អាចបិទបើក ក្រាហ្វស្ថិតិ និងឧបករណ៍គ្រប់គ្រងមាតិកាទំព័រមុខ។',
    highlights: [
      'Sidebar ផ្សារភ្ជាប់ជាមួយ URL tab ដើម្បីបង្ហាញតែ workspace ដែលបានជ្រើស។',
      'បង្ហាញស្ថិតិពាក្យស្នាក់នៅ ការកាន់កាប់គ្រែ វត្តមាន និងវិក្កយបត្រ។',
      'Admin អាចគ្រប់គ្រង ticker, deadline banner និងព័ត៌មានសាធារណៈ។',
    ],
  },
  {
    version: 'v1.1.0',
    releasedAt: '2026-08-14',
    dateLabel: '១៤ សីហា ២០២៦',
    category: 'security',
    categoryLabel: 'SECURITY',
    title: 'RBAC Security Hardening និង 403 API Protection',
    summary: 'ពង្រឹងការបំបែកសិទ្ធិចូលប្រើប្រាស់ ដើម្បីឱ្យតួនាទីនីមួយៗចូលបានតែផ្ទាំង និង API ដែលបានអនុញ្ញាត។',
    highlights: [
      'Role guard បញ្ជូនអ្នកប្រើទៅ dashboard ត្រឹមត្រូវដោយស្វ័យប្រវត្តិ។',
      'Express middleware បដិសេធ privileged API requests ដែលគ្មានសិទ្ធិដោយ HTTP 403។',
      'បន្ថែម regression tests សម្រាប់ការបំបែក Admin, Manager, Teacher និង Student។',
    ],
  },
  {
    version: 'v1.0.0',
    releasedAt: '2026-08-11',
    dateLabel: '១១ សីហា ២០២៦',
    category: 'release',
    categoryLabel: 'RELEASE',
    title: 'Initial Production Release: 4 Role Portals និង Supabase Schema',
    summary: 'បើកដំណើរការកំណែផលិតកម្មដំបូងសម្រាប់ប្រព័ន្ធគ្រប់គ្រងអន្តេវាសិកដ្ឋាន KSIT។',
    highlights: [
      'បង្កើតផ្ទាំងតួនាទី Admin, Manager, Teacher និង Student។',
      'រួមបញ្ចូល schema ដែលអាចដំណើរការ seed ឡើងវិញដោយសុវត្ថិភាព។',
      'គាំទ្រ room application, billing, Magic QR attendance និង maintenance workflows។',
    ],
  },
];

export const changelogFilters = [
  { key: 'all', label: 'ទាំងអស់', englishLabel: 'All' },
  { key: 'feature', label: 'មុខងារថ្មី', englishLabel: 'Features' },
  { key: 'security', label: 'សុវត្ថិភាព', englishLabel: 'Security' },
  { key: 'improvement', label: 'ការកែលម្អ', englishLabel: 'Improvements' },
] as const;

