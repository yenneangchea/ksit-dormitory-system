'use client';

import { useEffect, useState } from 'react';
import type { UserRole } from '@/types';

export type Language = 'en' | 'km';

const translations = {
  en: {
    language: 'Language', english: 'English', khmer: 'Khmer', logout: 'Logout', portal: 'Portal',
    admin: 'Admin Portal', manager: 'Manager Portal', teacher: 'Teacher Portal', student: 'Student Portal',
    systemName: 'KSIT Dormitory Management System', systemSubtitle: 'Kampong Speu Institute of Technology · Smart residence operations',
    homepageEditor: 'Edit Homepage', userAccess: 'User access control', buildings: 'Buildings & rooms',
  },
  km: {
    language: 'ភាសា', english: 'អង់គ្លេស', khmer: 'ខ្មែរ', logout: 'ចាកចេញ', portal: 'ផ្ទាំងការងារ',
    admin: 'ផ្ទាំងអ្នកគ្រប់គ្រង', manager: 'ផ្ទាំងអ្នកគ្រប់គ្រងអន្តេវាសិកដ្ឋាន', teacher: 'ផ្ទាំងគ្រូបន្ទុក', student: 'ផ្ទាំងនិស្សិត',
    systemName: 'ប្រព័ន្ធគ្រប់គ្រងអន្តេវាសិកដ្ឋាន KSIT', systemSubtitle: 'វិទ្យាស្ថានបច្ចេកវិទ្យាកំពង់ស្ពឺ · ប្រតិបត្តិការស្នាក់នៅឆ្លាតវៃ',
    homepageEditor: 'កែប្រែគេហទំព័រ', userAccess: 'គ្រប់គ្រងសិទ្ធិអ្នកប្រើ', buildings: 'អគារ និងបន្ទប់',
  },
} as const;

export function useLanguage() {
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window === 'undefined') return 'en';
    const stored = window.localStorage.getItem('ksit_language');
    return stored === 'km' ? 'km' : 'en';
  });
  useEffect(() => {
    const receiveLanguage = (event: StorageEvent) => {
      if (event.key === 'ksit_language' && (event.newValue === 'en' || event.newValue === 'km')) setLanguage(event.newValue);
    };
    window.addEventListener('storage', receiveLanguage);
    const receiveSameTabLanguage = () => {
      const next = window.localStorage.getItem('ksit_language') as Language | null;
      if (next === 'en' || next === 'km') setLanguage(next);
    };
    window.addEventListener('ksit-language-change', receiveSameTabLanguage);
    return () => {
      window.removeEventListener('storage', receiveLanguage);
      window.removeEventListener('ksit-language-change', receiveSameTabLanguage);
    };
  }, []);
  function changeLanguage(next: Language) {
    window.localStorage.setItem('ksit_language', next);
    setLanguage(next);
    window.dispatchEvent(new Event('ksit-language-change'));
  }
  return { language, setLanguage: changeLanguage, t: translations[language] };
}

export function roleLabel(role: UserRole, language: Language) {
  return translations[language][role];
}

const dashboardKhmer: Record<string, string> = {
  'Welcome back, Admin Portal': 'សូមស្វាគមន៍មកកាន់ផ្ទាំងអ្នកគ្រប់គ្រង',
  'Welcome back, Manager Portal': 'សូមស្វាគមន៍មកកាន់ផ្ទាំងអ្នកគ្រប់គ្រងអន្តេវាសិកដ្ឋាន',
  'Welcome back, Teacher Portal': 'សូមស្វាគមន៍មកកាន់ផ្ទាំងគ្រូបន្ទុក',
  'Welcome back, Student Portal': 'សូមស្វាគមន៍មកកាន់ផ្ទាំងនិស្សិត',
  'Registered users': 'អ្នកប្រើប្រាស់ដែលបានចុះឈ្មោះ', 'Buildings': 'អគារ', 'Pending review': 'កំពុងរង់ចាំពិនិត្យ',
  'Open work orders': 'សំណើជួសជុលបើកចំហ', 'User access control': 'គ្រប់គ្រងសិទ្ធិអ្នកប្រើ',
  'Operational status': 'ស្ថានភាពប្រតិបត្តិការ', 'Buildings & rooms': 'អគារ និងបន្ទប់',
  'Add new user': 'បន្ថែមអ្នកប្រើថ្មី', 'Add user': 'បន្ថែមអ្នកប្រើ', 'Add building': 'បន្ថែមអគារ', 'Add room': 'បន្ថែមបន្ទប់',
  'Create news post': 'បង្កើតព័ត៌មានថ្មី', 'Save homepage announcements': 'រក្សាទុកសេចក្តីជូនដំណឹង',
  'Announcements & News Management': 'គ្រប់គ្រងសេចក្តីជូនដំណឹង និងព័ត៌មាន', 'News posts': 'ព័ត៌មាន និងសេចក្តីជូនដំណឹង',
  'Account': 'គណនី', 'Contact': 'ទំនាក់ទំនង', 'Role': 'តួនាទី', 'Actions': 'សកម្មភាព',
  'Edit': 'កែប្រែ', 'Delete': 'លុប', 'Hide': 'លាក់', 'Show': 'បង្ហាញ', 'Visible': 'បង្ហាញជាសាធារណៈ', 'Hidden': 'លាក់',
  'Yearly applications': 'ពាក្យស្នើសុំប្រចាំឆ្នាំ', 'Maintenance tickets': 'សំណើជួសជុល',
  'Daily attendance': 'វត្តមានប្រចាំថ្ងៃ', 'Dynamic split-billing': 'ការចែកវិក្កយបត្រស្វ័យប្រវត្តិ',
  'My residence': 'កន្លែងស្នាក់នៅរបស់ខ្ញុំ', 'KHQR bills': 'វិក្កយបត្រ KHQR', 'Maintenance': 'ការជួសជុល',
  'Dormitory application': 'ពាក្យស្នើសុំអន្តេវាសិកដ្ឋាន', 'Residence status': 'ស្ថានភាពកន្លែងស្នាក់នៅ',
  'Room assignment pending': 'កំពុងរង់ចាំចាត់បន្ទប់', 'Roommates': 'អ្នករួមបន្ទប់',
  'Unpaid KHQR bills': 'វិក្កយបត្រ KHQR មិនទាន់បង់', 'Open tickets': 'សំណើបើកចំហ', 'Present records': 'កំណត់ត្រាវត្តមាន',
  'Confirm KHQR payment': 'បញ្ជាក់ការបង់ KHQR', 'New maintenance ticket': 'សំណើជួសជុលថ្មី',
  'Submit ticket': 'ដាក់ស្នើសំណើ', 'Submit application': 'ដាក់ពាក្យស្នើសុំ', 'Application history': 'ប្រវត្តិពាក្យស្នើសុំ',
  'Admin Portal': 'ផ្ទាំងអ្នកគ្រប់គ្រង', 'Manager Portal': 'ផ្ទាំងអ្នកគ្រប់គ្រងអន្តេវាសិកដ្ឋាន',
  'Teacher Portal': 'ផ្ទាំងគ្រូបន្ទុក', 'Student Portal': 'ផ្ទាំងនិស្សិត',
  'approved': 'អនុម័ត', 'rejected': 'បដិសេធ', 'submitted': 'បានដាក់ស្នើ', 'assigned': 'បានចាត់បន្ទប់',
  'present': 'មានវត្តមាន', 'absent': 'អវត្តមាន', 'leave': 'សុំច្បាប់', 'open': 'បើកចំហ', 'resolved': 'បានដោះស្រាយ',
};

export function useDashboardLocalization(language: Language) {
  useEffect(() => {
    const root = document.querySelector('[data-ksit-dashboard]');
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    while (walker.nextNode()) nodes.push(walker.currentNode as Text);
    nodes.forEach((node) => {
      const value = node.nodeValue || '';
      const trimmed = value.trim();
      if (!trimmed) return;
      const translated = language === 'km' ? dashboardKhmer[trimmed] : node.parentElement?.dataset.enText;
      if (language === 'km' && translated) {
        node.parentElement?.setAttribute('data-en-text', value);
        node.nodeValue = value.replace(trimmed, translated);
      }
      if (language === 'en' && translated) node.nodeValue = translated as string;
    });
  }, [language]);
}
