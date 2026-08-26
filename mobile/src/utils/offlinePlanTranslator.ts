/**
 * Offline Learning Plan & Curriculum Translator
 * 
 * High-performance, zero-API, rule-based and glossary-based translation engine
 * for dynamic learning plans, curriculum titles, tasks, subtasks, and subjects.
 * Supports English (en), Spanish (es), Russian (ru), French (fr), Armenian (hy),
 * Japanese (ja), and Chinese (zh).
 */

export type SupportedLocale = 'en' | 'es' | 'ru' | 'fr' | 'hy' | 'ja' | 'zh';

// ── 1. Common Goal & Curriculum Titles ───────────────────────────────────────

const GOAL_DICTIONARY: Record<string, Record<SupportedLocale, string>> = {
  'javascript': {
    en: 'JavaScript',
    es: 'JavaScript',
    ru: 'JavaScript',
    fr: 'JavaScript',
    hy: 'JavaScript',
    ja: 'JavaScript',
    zh: 'JavaScript',
  },
  'typescript': {
    en: 'TypeScript',
    es: 'TypeScript',
    ru: 'TypeScript',
    fr: 'TypeScript',
    hy: 'TypeScript',
    ja: 'TypeScript',
    zh: 'TypeScript',
  },
  'python': {
    en: 'Python Mastery',
    es: 'Dominio de Python',
    ru: 'Мастерство Python',
    fr: 'Maîtrise de Python',
    hy: 'Python-ի վարպետություն',
    ja: 'Python完全習得',
    zh: 'Python 精通之路',
  },
  'react & react native': {
    en: 'React & React Native',
    es: 'React y React Native',
    ru: 'React и React Native',
    fr: 'React & React Native',
    hy: 'React և React Native',
    ja: 'React & React Native',
    zh: 'React 与 React Native',
  },
  'web development': {
    en: 'Web Development',
    es: 'Desarrollo Web',
    ru: 'Веб-разработка',
    fr: 'Développement Web',
    hy: 'Վեբ ծրագրավորում',
    ja: 'Web開発',
    zh: 'Web 开发',
  },
  'data structures & algorithms': {
    en: 'Data Structures & Algorithms',
    es: 'Estructuras de Datos y Algoritmos',
    ru: 'Структуры данных и алгоритмы',
    fr: 'Structures de Données et Algorithmes',
    hy: 'Տվյալների կառուցվածքներ և ալգորիթմներ',
    ja: 'データ構造とアルゴリズム',
    zh: '数据结构与算法',
  },
  'system design': {
    en: 'System Design & Architecture',
    es: 'Diseño y Arquitectura de Sistemas',
    ru: 'Архитектура и проектирование систем',
    fr: 'Conception et Architecture Système',
    hy: 'Համակարգերի նախագծում և ճարտարապետություն',
    ja: 'システム設計とアーキテクチャ',
    zh: '系统设计与架构',
  },
  'machine learning': {
    en: 'Machine Learning & AI',
    es: 'Aprendizaje Automático e IA',
    ru: 'Машинное обучение и ИИ',
    fr: 'Apprentissage Automatique & IA',
    hy: 'Մեքենայական ուսուցում և AI',
    ja: '機械学習とAI',
    zh: '机器学习与人工智能',
  },
};

// ── 2. Exact Task Title Glossaries ───────────────────────────────────────────

const EXACT_TASK_DICTIONARY: Record<string, Record<SupportedLocale, string>> = {
  'enhancing api with delete & basic error handling': {
    en: 'Enhancing API with DELETE & Basic Error Handling',
    es: 'Mejora de API con DELETE y Manejo Básico de Errores',
    ru: 'Расширение API методом DELETE и базовая обработка ошибок',
    fr: 'Amélioration de l\'API avec DELETE et gestion de base des erreurs',
    hy: 'API-ի բարելավում DELETE մեթոդով և սխալների մշակում',
    ja: 'DELETEメソッドの追加と基本的なエラーハンドリング',
    zh: '通过 DELETE 与基础错误处理增强 API',
  },
  'building a core rest api with express': {
    en: 'Building a Core REST API with Express',
    es: 'Construcción de una API REST Principal con Express',
    ru: 'Создание базового REST API на Express',
    fr: 'Création d\'une API REST principale avec Express',
    hy: 'Հիմնական REST API-ի կառուցում Express-ով',
    ja: 'ExpressによるコアREST APIの構築',
    zh: '使用 Express 构建核心 REST API',
  },
  'implementing data persistence and crud operations': {
    en: 'Implementing Data Persistence and CRUD Operations',
    es: 'Implementación de Persistencia de Datos y Operaciones CRUD',
    ru: 'Реализация сохранения данных и CRUD-операций',
    fr: 'Implémentation de la persistance des données et opérations CRUD',
    hy: 'Տվյալների պահպանման և CRUD գործողությունների իրականացում',
    ja: 'データ永続化とCRUD操作の実装',
    zh: '实现数据持久化与 CRUD 操作',
  },
  'deep dive into the javascript event loop and async patterns': {
    en: 'Deep Dive into the JavaScript Event Loop and Async Patterns',
    es: 'Inmersión Profunda en el Event Loop de JavaScript y Patrones Asíncronos',
    ru: 'Глубокое погружение в Event Loop JavaScript и асинхронные паттерны',
    fr: 'Exploration approfondie de la boucle d\'événements JavaScript et modèles asynchrones',
    hy: 'JavaScript Event Loop-ի և ասինխրոն մոդելների խորացված ուսումնասիրություն',
    ja: 'JavaScriptイベントループと非同期パターンの徹底解説',
    zh: '深入理解 JavaScript 事件循环与异步模式',
  },
  'modular architecture and express middleware': {
    en: 'Modular Architecture and Express Middleware',
    es: 'Arquitectura Modular y Middleware de Express',
    ru: 'Модульная архитектура и промежуточное ПО Express',
    fr: 'Architecture modulaire et middlewares Express',
    hy: 'Մոդուլային ճարտարապետություն և Express Middleware',
    ja: 'モジュール構造とExpressミドルウェア',
    zh: '模块化架构与 Express 中间件',
  },
  'introduction to unit testing with jest': {
    en: 'Introduction to Unit Testing with Jest',
    es: 'Introducción a las Pruebas Unitarias con Jest',
    ru: 'Введение в модульное тестирование с помощью Jest',
    fr: 'Introduction aux tests unitaires avec Jest',
    hy: 'Ներածություն մոդուլային թեստավորման մեջ Jest-ով',
    ja: 'Jestによる単体テスト入門',
    zh: '使用 Jest 进行单元测试入门',
  },
};

// ── 3. Subjects / Category Tags ──────────────────────────────────────────────

const SUBJECT_DICTIONARY: Record<string, Record<SupportedLocale, string>> = {
  'tech': { en: 'TECH', es: 'TECNOLOGÍA', ru: 'ТЕХНОЛОГИИ', fr: 'TECH', hy: 'ՏԵԽ', ja: '技術', zh: '技术' },
  'code': { en: 'CODE', es: 'CÓDIGO', ru: 'КОД', fr: 'CODE', hy: 'ԿՈԴ', ja: 'コード', zh: '代码' },
  'theory': { en: 'THEORY', es: 'TEORÍA', ru: 'ТЕОРИЯ', fr: 'THÉORIE', hy: 'ՏԵՍՈՒԹՅՈՒՆ', ja: '理論', zh: '理论' },
  'practice': { en: 'PRACTICE', es: 'PRÁCTICA', ru: 'ПРАКТИКА', fr: 'PRATIQUE', hy: 'ՊՐԱԿՏԻԿԱ', ja: '実践', zh: '实践' },
  'science': { en: 'SCIENCE', es: 'CIENCIA', ru: 'НАУКА', fr: 'SCIENCE', hy: 'ԳԻՏՈՒԹՅՈՒՆ', ja: '科学', zh: '科学' },
  'math': { en: 'MATH', es: 'MATEMÁTICAS', ru: 'МАТЕМАТИКА', fr: 'MATHS', hy: 'ՄԱԹԵՄ', ja: '数学', zh: '数学' },
  'arts': { en: 'ARTS', es: 'ARTE', ru: 'ИСКУССТВО', fr: 'ARTS', hy: 'ԱՐՎԵՍՏ', ja: '芸術', zh: '艺术' },
  'general': { en: 'GENERAL', es: 'GENERAL', ru: 'ОБЩЕЕ', fr: 'GÉNÉRAL', hy: 'ԸՆԴՀԱՆՈՒՐ', ja: '一般', zh: '通用' },
};

// ── 4. Pattern-Based Composition Engine ───────────────────────────────────────

interface ActionPattern {
  regex: RegExp;
  template: Record<SupportedLocale, (topic: string) => string>;
}

const ACTION_PATTERNS: ActionPattern[] = [
  {
    regex: /^Building (?:a |an )?(.+)$/i,
    template: {
      en: (t) => `Building ${t}`,
      es: (t) => `Construcción de ${t}`,
      ru: (t) => `Создание ${t}`,
      fr: (t) => `Création de ${t}`,
      hy: (t) => `${t}-ի կառուցում`,
      ja: (t) => `${t}の構築`,
      zh: (t) => `构建 ${t}`,
    },
  },
  {
    regex: /^Enhancing (.+) with (.+)$/i,
    template: {
      en: (t) => `Enhancing ${t}`,
      es: (t) => `Mejora de ${t}`,
      ru: (t) => `Улучшение ${t}`,
      fr: (t) => `Amélioration de ${t}`,
      hy: (t) => `${t}-ի բարելավում`,
      ja: (t) => `${t}の拡張`,
      zh: (t) => `增强 ${t}`,
    },
  },
  {
    regex: /^Implementing (.+)$/i,
    template: {
      en: (t) => `Implementing ${t}`,
      es: (t) => `Implementación de ${t}`,
      ru: (t) => `Реализация ${t}`,
      fr: (t) => `Implémentation de ${t}`,
      hy: (t) => `${t}-ի իրականացում`,
      ja: (t) => `${t}の実装`,
      zh: (t) => `实现 ${t}`,
    },
  },
  {
    regex: /^Deep Dive into (.+)$/i,
    template: {
      en: (t) => `Deep Dive into ${t}`,
      es: (t) => `Inmersión Profunda en ${t}`,
      ru: (t) => `Глубокое погружение в ${t}`,
      fr: (t) => `Exploration approfondie de ${t}`,
      hy: (t) => `${t}-ի խորացված ուսումնասիրություն`,
      ja: (t) => `${t}の徹底解説`,
      zh: (t) => `深入理解 ${t}`,
    },
  },
  {
    regex: /^Introduction to (.+)$/i,
    template: {
      en: (t) => `Introduction to ${t}`,
      es: (t) => `Introducción a ${t}`,
      ru: (t) => `Введение в ${t}`,
      fr: (t) => `Introduction à ${t}`,
      hy: (t) => `Ներածություն ${t}`,
      ja: (t) => `${t}入門`,
      zh: (t) => `${t} 入门`,
    },
  },
  {
    regex: /^Fundamentals of (.+)$/i,
    template: {
      en: (t) => `Fundamentals of ${t}`,
      es: (t) => `Fundamentos de ${t}`,
      ru: (t) => `Основы ${t}`,
      fr: (t) => `Fondamentaux de ${t}`,
      hy: (t) => `${t}-ի հիմունքներ`,
      ja: (t) => `${t}の基礎`,
      zh: (t) => `${t} 基础`,
    },
  },
  {
    regex: /^Mastering (.+)$/i,
    template: {
      en: (t) => `Mastering ${t}`,
      es: (t) => `Dominando ${t}`,
      ru: (t) => `Освоение ${t}`,
      fr: (t) => `Maîtrise de ${t}`,
      hy: (t) => `${t}-ի տիրապետում`,
      ja: (t) => `${t}のマスター`,
      zh: (t) => `精通 ${t}`,
    },
  },
  {
    regex: /^Understanding (.+)$/i,
    template: {
      en: (t) => `Understanding ${t}`,
      es: (t) => `Comprensión de ${t}`,
      ru: (t) => `Понимание ${t}`,
      fr: (t) => `Comprendre ${t}`,
      hy: (t) => `${t}-ի հասկացողություն`,
      ja: (t) => `${t}の理解`,
      zh: (t) => `理解 ${t}`,
    },
  },
  {
    regex: /^Optimizing (.+)$/i,
    template: {
      en: (t) => `Optimizing ${t}`,
      es: (t) => `Optimización de ${t}`,
      ru: (t) => `Оптимизация ${t}`,
      fr: (t) => `Optimisation de ${t}`,
      hy: (t) => `${t}-ի օպտիմալացում`,
      ja: (t) => `${t}の最適化`,
      zh: (t) => `优化 ${t}`,
    },
  },
  {
    regex: /^Refactoring (.+)$/i,
    template: {
      en: (t) => `Refactoring ${t}`,
      es: (t) => `Refactorización de ${t}`,
      ru: (t) => `Рефакторинг ${t}`,
      fr: (t) => `Refactorisation de ${t}`,
      hy: (t) => `${t}-ի ռեֆակտորինգ`,
      ja: (t) => `${t}のリファクタリング`,
      zh: (t) => `重构 ${t}`,
    },
  },
];

// ── 5. Core Translation Functions ────────────────────────────────────────────

export function translateSubject(subject: string | undefined, locale: string): string | undefined {
  if (!subject) return subject;
  const loc = (locale as SupportedLocale) || 'en';
  const key = subject.trim().toLowerCase();
  return SUBJECT_DICTIONARY[key]?.[loc] || subject;
}

export function translateGoalTitle(title: string | undefined, locale: string): string {
  if (!title) return '';
  const loc = (locale as SupportedLocale) || 'en';
  if (loc === 'en') return title;

  const key = title.trim().toLowerCase();
  if (GOAL_DICTIONARY[key]?.[loc]) {
    return GOAL_DICTIONARY[key][loc];
  }
  return title;
}

export function translateTaskTitle(title: string | undefined, locale: string): string {
  if (!title) return '';
  const loc = (locale as SupportedLocale) || 'en';
  if (loc === 'en') return title;

  const key = title.trim().toLowerCase();

  // 1. Exact dictionary match
  if (EXACT_TASK_DICTIONARY[key]?.[loc]) {
    return EXACT_TASK_DICTIONARY[key][loc];
  }

  // 2. Pattern match
  for (const pattern of ACTION_PATTERNS) {
    const match = title.match(pattern.regex);
    if (match && match[1]) {
      const topic = match[1];
      const fn = pattern.template[loc];
      if (fn) {
        return fn(topic);
      }
    }
  }

  return title;
}

// ── 6. Full Plan Entity Wrappers ─────────────────────────────────────────────

export function translatePlanGoal(goal: any, locale: string): any {
  if (!goal) return goal;
  const loc = (locale as SupportedLocale) || 'en';

  // Check DB embedded translations first
  const metadata = goal.plan_metadata || {};
  const translatedTitles = metadata.translated_titles || {};
  let goalTitle = translatedTitles[loc];

  // Fallback to offline rule dictionary
  if (!goalTitle) {
    goalTitle = translateGoalTitle(goal.title, loc);
  }

  let translatedTasks = goal.tasks;
  if (translatedTasks && Array.isArray(translatedTasks)) {
    translatedTasks = translatePlanTasksArray(translatedTasks, loc);
  }

  return {
    ...goal,
    title: goalTitle,
    tasks: translatedTasks,
  };
}

export function translatePlanTask(task: any, locale: string): any {
  if (!task) return task;
  const loc = (locale as SupportedLocale) || 'en';

  const subtasksArray = task.subtasks ?? [];
  const translationsSubtask = subtasksArray.find((s: any) => s.id === 'translations') as any;
  const realSubtasks = subtasksArray.filter((s: any) => s.id !== 'translations');

  // 1. Title translation
  let taskTitle = translationsSubtask?.translations?.title?.[loc];
  if (!taskTitle) {
    taskTitle = translateTaskTitle(task.title, loc);
  }

  // 2. Subject translation
  const translatedSubject = translateSubject(task.subject, loc);

  // 3. Subtasks translation
  const translatedSubtasks = realSubtasks.map((sub: any) => {
    let subTitle = translationsSubtask?.translations?.subtasks?.[sub.id]?.[loc];
    if (!subTitle && typeof sub.title === 'string') {
      subTitle = translateTaskTitle(sub.title, loc);
    }
    return {
      ...sub,
      title: subTitle || sub.title,
    };
  });

  // 4. Learning Goal parent translation
  let learningGoals = task.learning_goals;
  if (learningGoals) {
    learningGoals = translatePlanGoal(learningGoals, loc);
  }

  return {
    ...task,
    title: taskTitle,
    subject: translatedSubject,
    subtasks: translatedSubtasks,
    learning_goals: learningGoals,
  };
}

export function translatePlanTasksArray(tasks: any[] | null | undefined, locale: string): any[] {
  if (!tasks) return [];
  return tasks.map((task) => translatePlanTask(task, locale));
}

export function translatePlanGoalsArray(goals: any[] | null | undefined, locale: string): any[] {
  if (!goals) return [];
  return goals.map((goal) => translatePlanGoal(goal, locale));
}
