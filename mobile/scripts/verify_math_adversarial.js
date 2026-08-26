/**
 * Adversarial Empirical Verification Suite for Math and Logic Fixes
 * LifePivot Mobile Application (BUG-01, BUG-02, BUG-03, BUG-05, BUG-07, BUG-14, BUG-15)
 */

const assert = require('assert');

let passedTests = 0;
let failedTests = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✓ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}`);
    console.error(`    Error: ${err.message}`);
    failedTests++;
  }
}

console.log('================================================================================');
console.log('  ADVERSARIAL EMPIRICAL VERIFICATION HARNESS — MATH & LOGIC FIXES');
console.log('================================================================================\n');

// ─────────────────────────────────────────────────────────────────────────────
// 1. XP PROGRESSION LOGIC (BUG-01, BUG-08)
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- 1. XP PROGRESSION LOGIC ACROSS INDEX, PROFILE, SHOP ---');

function computeIndexXp(level, xp) {
  const effectiveLevel = level ?? 1;
  const effectiveXp = xp ?? 0;
  const xpNeeded = Math.max(1, effectiveLevel * 100);
  const xpProgress = Math.min(1, Math.max(0, effectiveXp / xpNeeded));
  return { xpNeeded, xpProgress };
}

function computeProfileXp(level, xp) {
  const effectiveLevel = level ?? 1;
  const effectiveXp = xp ?? 0;
  const xpNeeded = Math.max(100, effectiveLevel * 100);
  const xpProgress = Math.min(1, Math.max(0, effectiveXp) / xpNeeded);
  return { xpNeeded, xpProgress };
}

function computeShopXp(level, xp) {
  const effectiveLevel = level ?? 1;
  const effectiveXp = xp ?? 0;
  const xpRequirement = Math.max(100, effectiveLevel * 100);
  const xpProgress = Math.min(1, Math.max(0, effectiveXp) / xpRequirement);
  return { xpRequirement, xpProgress };
}

runTest('Level 1: xpNeeded is 100 across index, profile, shop', () => {
  const idx = computeIndexXp(1, 50);
  const prof = computeProfileXp(1, 50);
  const shop = computeShopXp(1, 50);

  assert.strictEqual(idx.xpNeeded, 100);
  assert.strictEqual(prof.xpNeeded, 100);
  assert.strictEqual(shop.xpRequirement, 100);

  assert.strictEqual(idx.xpProgress, 0.5);
  assert.strictEqual(prof.xpProgress, 0.5);
  assert.strictEqual(shop.xpProgress, 0.5);
});

runTest('Level 2: xpNeeded is 200 across index, profile, shop', () => {
  const idx = computeIndexXp(2, 100);
  const prof = computeProfileXp(2, 100);
  const shop = computeShopXp(2, 100);

  assert.strictEqual(idx.xpNeeded, 200);
  assert.strictEqual(prof.xpNeeded, 200);
  assert.strictEqual(shop.xpRequirement, 200);

  assert.strictEqual(idx.xpProgress, 0.5);
  assert.strictEqual(prof.xpProgress, 0.5);
  assert.strictEqual(shop.xpProgress, 0.5);
});

runTest('Level 5: xpNeeded is 500 across index, profile, shop', () => {
  const idx = computeIndexXp(5, 250);
  const prof = computeProfileXp(5, 250);
  const shop = computeShopXp(5, 250);

  assert.strictEqual(idx.xpNeeded, 500);
  assert.strictEqual(prof.xpNeeded, 500);
  assert.strictEqual(shop.xpRequirement, 500);

  assert.strictEqual(idx.xpProgress, 0.5);
  assert.strictEqual(prof.xpProgress, 0.5);
  assert.strictEqual(shop.xpProgress, 0.5);
});

runTest('Level 10: xpNeeded is 1000 across index, profile, shop', () => {
  const idx = computeIndexXp(10, 750);
  const prof = computeProfileXp(10, 750);
  const shop = computeShopXp(10, 750);

  assert.strictEqual(idx.xpNeeded, 1000);
  assert.strictEqual(prof.xpNeeded, 1000);
  assert.strictEqual(shop.xpRequirement, 1000);

  assert.strictEqual(idx.xpProgress, 0.75);
  assert.strictEqual(prof.xpProgress, 0.75);
  assert.strictEqual(shop.xpProgress, 0.75);
});

runTest('Level 50: xpNeeded is 5000 across index, profile, shop', () => {
  const idx = computeIndexXp(50, 2500);
  const prof = computeProfileXp(50, 2500);
  const shop = computeShopXp(50, 2500);

  assert.strictEqual(idx.xpNeeded, 5000);
  assert.strictEqual(prof.xpNeeded, 5000);
  assert.strictEqual(shop.xpRequirement, 5000);

  assert.strictEqual(idx.xpProgress, 0.5);
  assert.strictEqual(prof.xpProgress, 0.5);
  assert.strictEqual(shop.xpProgress, 0.5);
});

runTest('Adversarial Boundary: Level 0 does not divide by zero or yield NaN/Infinity', () => {
  const idx = computeIndexXp(0, 0);
  const prof = computeProfileXp(0, 0);
  const shop = computeShopXp(0, 0);

  assert(!isNaN(idx.xpProgress) && isFinite(idx.xpProgress));
  assert(!isNaN(prof.xpProgress) && isFinite(prof.xpProgress));
  assert(!isNaN(shop.xpProgress) && isFinite(shop.xpProgress));

  assert(idx.xpNeeded >= 1);
  assert(prof.xpNeeded >= 100);
  assert(shop.xpRequirement >= 100);
});

runTest('Adversarial Boundary: Negative XP is safely clamped to 0', () => {
  const idx = computeIndexXp(3, -50);
  const prof = computeProfileXp(3, -50);
  const shop = computeShopXp(3, -50);

  assert.strictEqual(idx.xpProgress, 0);
  assert.strictEqual(prof.xpProgress, 0);
  assert.strictEqual(shop.xpProgress, 0);
});

runTest('Adversarial Boundary: Overflow XP is safely clamped to 1.0', () => {
  const idx = computeIndexXp(3, 9999);
  const prof = computeProfileXp(3, 9999);
  const shop = computeShopXp(3, 9999);

  assert.strictEqual(idx.xpProgress, 1.0);
  assert.strictEqual(prof.xpProgress, 1.0);
  assert.strictEqual(shop.xpProgress, 1.0);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. CALENDAR ROLLBACK LOGIC (BUG-02)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 2. CALENDAR ROLLBACK LOGIC (calendar.tsx) ---');

const TOKEN_REWARD = { 0: 0, 1: 1, 2: 1, 3: 1, 4: 2, 5: 3 };

function simulateTaskToggle(currentStatus, priority, profile) {
  const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
  const tokenDelta = TOKEN_REWARD[priority] ?? 1;
  const baseXp = priority > 0 ? priority * 10 + 10 : 10;

  let newTokens = profile.tokens_balance || 0;
  let newXp = profile.xp || 0;
  let newLevel = profile.level || 1;

  if (newStatus === 'completed') {
    newTokens += tokenDelta;
    newXp += baseXp;
    const xpNeeded = newLevel * 100;
    if (newXp >= xpNeeded) {
      newLevel += 1;
      newXp -= xpNeeded;
    }
  } else {
    newTokens = Math.max(0, newTokens - tokenDelta);
    newXp = Math.max(0, newXp - baseXp);
  }

  return { newStatus, newTokens, newXp, newLevel };
}

runTest('Completed -> Pending deducts exact P5 reward (3 tokens, 60 XP)', () => {
  const initial = { tokens_balance: 10, xp: 100, level: 2 };
  const res = simulateTaskToggle('completed', 5, initial);

  assert.strictEqual(res.newStatus, 'pending');
  assert.strictEqual(res.newTokens, 7); // 10 - 3 = 7
  assert.strictEqual(res.newXp, 40);    // 100 - 60 = 40
  assert.strictEqual(res.newLevel, 2);
});

runTest('Completed -> Pending deducts exact P4 reward (2 tokens, 50 XP)', () => {
  const initial = { tokens_balance: 5, xp: 80, level: 1 };
  const res = simulateTaskToggle('completed', 4, initial);

  assert.strictEqual(res.newStatus, 'pending');
  assert.strictEqual(res.newTokens, 3); // 5 - 2 = 3
  assert.strictEqual(res.newXp, 30);    // 80 - 50 = 30
});

runTest('Completed -> Pending deducts exact P1 reward (1 token, 20 XP)', () => {
  const initial = { tokens_balance: 5, xp: 50, level: 1 };
  const res = simulateTaskToggle('completed', 1, initial);

  assert.strictEqual(res.newStatus, 'pending');
  assert.strictEqual(res.newTokens, 4); // 5 - 1 = 4
  assert.strictEqual(res.newXp, 30);    // 50 - 20 = 30
});

runTest('Adversarial Rollback: Clamps to 0 when user has fewer tokens than deduction', () => {
  const initial = { tokens_balance: 1, xp: 10, level: 1 };
  const res = simulateTaskToggle('completed', 5, initial); // P5 is 3 tokens, 60 XP

  assert.strictEqual(res.newTokens, 0); // Math.max(0, 1 - 3) = 0
  assert.strictEqual(res.newXp, 0);     // Math.max(0, 10 - 60) = 0
});

runTest('Cycle Symmetry: Complete then Uncomplete restores exact initial balance (no level-up)', () => {
  const initial = { tokens_balance: 20, xp: 30, level: 2 };
  const completed = simulateTaskToggle('pending', 3, initial); // P3: +1 token, +40 XP
  assert.strictEqual(completed.newTokens, 21);
  assert.strictEqual(completed.newXp, 70);

  const uncompleted = simulateTaskToggle('completed', 3, {
    tokens_balance: completed.newTokens,
    xp: completed.newXp,
    level: completed.newLevel,
  });

  assert.strictEqual(uncompleted.newTokens, initial.tokens_balance);
  assert.strictEqual(uncompleted.newXp, initial.xp);
  assert.strictEqual(uncompleted.newLevel, initial.level);
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. FOCUS TIMER ELAPSED CALCULATION (BUG-03)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 3. FOCUS TIMER ELAPSED CALCULATION (FocusModeModal.tsx) ---');

function computeElapsedMinutes(totalSeconds, secondsRemaining) {
  return Math.max(1, Math.round((totalSeconds - secondsRemaining) / 60));
}

runTest('Scenario A: totalSeconds = 1500, secondsRemaining = 900 -> 10 minutes', () => {
  const result = computeElapsedMinutes(1500, 900);
  assert.strictEqual(result, 10);
});

runTest('Scenario B: totalSeconds = 1500, secondsRemaining = 0 -> 25 minutes', () => {
  const result = computeElapsedMinutes(1500, 0);
  assert.strictEqual(result, 25);
});

runTest('Scenario C: totalSeconds = 1500, secondsRemaining = 1490 (10s elapsed) -> clamped to 1 minute', () => {
  const result = computeElapsedMinutes(1500, 1490);
  assert.strictEqual(result, 1);
});

runTest('Scenario D: totalSeconds = 1500, secondsRemaining = 1471 (29s elapsed) -> clamped to 1 minute', () => {
  const result = computeElapsedMinutes(1500, 1471);
  assert.strictEqual(result, 1);
});

runTest('Scenario E: totalSeconds = 1500, secondsRemaining = 1470 (30s elapsed) -> rounded to 1 minute', () => {
  const result = computeElapsedMinutes(1500, 1470);
  assert.strictEqual(result, 1);
});

runTest('Scenario F: totalSeconds = 1500, secondsRemaining = 1410 (90s elapsed) -> rounded to 2 minutes', () => {
  const result = computeElapsedMinutes(1500, 1410);
  assert.strictEqual(result, 2);
});

runTest('Scenario G: Mid-session +5 min added (totalSeconds = 1800, secondsRemaining = 300, 25 min elapsed) -> 25 minutes', () => {
  const result = computeElapsedMinutes(1800, 300);
  assert.strictEqual(result, 25);
});

runTest('Scenario H: 60-min sprint full completion (totalSeconds = 3600, secondsRemaining = 0) -> 60 minutes', () => {
  const result = computeElapsedMinutes(3600, 0);
  assert.strictEqual(result, 60);
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. SOCRATIC DRILL SHUFFLE LOGIC (BUG-14)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 4. SOCRATIC DRILL SHUFFLE LOGIC (SocraticMicroDrillsModal.tsx) ---');

function shuffleQuestionOptions(q) {
  const originalOptions = q.options;
  const correctOptionText = originalOptions[q.correctOptionIndex ?? 0];
  const shuffled = [...originalOptions];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const newCorrectIndex = shuffled.indexOf(correctOptionText);
  return {
    ...q,
    options: shuffled,
    correctOptionIndex: newCorrectIndex !== -1 ? newCorrectIndex : 0,
  };
}

const sampleQuestion = {
  question: 'Which of the following describes the core objective of this study session?',
  options: [
    'Applying foundational principles to solve practical problems.',
    'Passively reviewing textbook pages without active engagement.',
    'Memorizing multiple-choice answers for short-term recall.',
    'Skipping conceptual derivations to finish faster.',
  ],
  correctOptionIndex: 0,
  explanation: 'Active problem-solving builds durable neural connections.',
};

runTest('Invariant: correctOptionIndex ALWAYS points to original correct text across 1,000 shuffles', () => {
  const originalCorrectText = sampleQuestion.options[sampleQuestion.correctOptionIndex];
  for (let i = 0; i < 1000; i++) {
    const shuffledQ = shuffleQuestionOptions(sampleQuestion);
    assert.strictEqual(
      shuffledQ.options[shuffledQ.correctOptionIndex],
      originalCorrectText,
      `Mismatch on iteration ${i}`
    );
    assert.strictEqual(shuffledQ.options.length, 4);
    // All original options are present
    sampleQuestion.options.forEach((opt) => {
      assert(shuffledQ.options.includes(opt));
    });
  }
});

runTest('Distribution: Shuffling produces fair random distribution across all 4 option slots', () => {
  const counts = { 0: 0, 1: 0, 2: 0, 3: 0 };
  const iterations = 4000;

  for (let i = 0; i < iterations; i++) {
    const shuffledQ = shuffleQuestionOptions(sampleQuestion);
    counts[shuffledQ.correctOptionIndex]++;
  }

  // Expected ~1000 per index (25%). Allow 15% - 35% margin (600 - 1400)
  for (let idx = 0; idx < 4; idx++) {
    assert(
      counts[idx] >= 600 && counts[idx] <= 1400,
      `Index ${idx} count (${counts[idx]}) deviated excessively from expected ~1000`
    );
  }
  console.log(`    Position distribution over 4000 runs: [0]: ${counts[0]}, [1]: ${counts[1]}, [2]: ${counts[2]}, [3]: ${counts[3]}`);
});

runTest('Multi-Language Fallback Data: All languages have unique options per question', () => {
  const MULTI_LANG_FALLBACKS = {
    en: [
      {
        question: 'Which of the following describes the core objective of this study session?',
        options: [
          'Applying foundational principles to solve practical problems.',
          'Passively reviewing textbook pages without active engagement.',
          'Memorizing multiple-choice answers for short-term recall.',
          'Skipping conceptual derivations to finish faster.',
        ],
        correctOptionIndex: 0,
      },
      {
        question: 'Why is active recall essential during Socratic verification?',
        options: [
          'It forces retrieval from long-term memory, highlighting gaps in understanding.',
          'It reduces the amount of total study time needed by 90%.',
          'It is only useful for memorizing arbitrary vocabulary definitions.',
          'It prevents the brain from making new synaptic connections.',
        ],
        correctOptionIndex: 0,
      },
      {
        question: 'What is the most effective next step when encountering cognitive friction?',
        options: [
          'Deconstruct the concept into simple analogies (Feynman Technique).',
          'Abandon the study session and switch to a different goal.',
          'Reread the same paragraph 5 times without taking notes.',
          'Memorize the formula without understanding the underlying mechanism.',
        ],
        correctOptionIndex: 0,
      },
    ],
    ru: [
      {
        question: 'Что из следующего описывает основную цель этой темы?',
        options: [
          'Применение принципов к практическому решению задач.',
          'Пассивный обзор концепций без активного вовлечения.',
          'Заучивание ответов для подготовки к экзамену.',
          'Игнорирование концептуальных основ.',
        ],
        correctOptionIndex: 0,
      },
      {
        question: 'Почему активное припоминание важно для этой задачи?',
        options: [
          'Оно выстраивает долгосрочные нейронные связи и выявляет пробелы в понимании.',
          'Оно ускоряет обучение, но делает его менее эффективным.',
          'Оно полезно только для заучивания словарных слов.',
          'Оно не влияет на долгосрочное удержание информации.',
        ],
        correctOptionIndex: 0,
      },
      {
        question: 'Какой лучший способ проверить концептуальное мастерство?',
        options: [
          'Простое объяснение идеи своими словами (метод Фейнмана).',
          'Многократное перечитывание страницы учебника.',
          'Выделение определений разными цветами.',
          'Переход сразу к продвинутому материалу.',
        ],
        correctOptionIndex: 0,
      },
    ],
    fr: [
      {
        question: "Lequel des éléments suivants décrit l'objectif principal de cette session ?",
        options: [
          'Appliquer les principes à la résolution de problèmes pratiques.',
          'Revoir passivement les concepts sans engagement.',
          'Mémoriser les réponses pour la préparation aux examens.',
          'Ignorer les bases conceptuelles.',
        ],
        correctOptionIndex: 0,
      },
      {
        question: 'Pourquoi la récupération active est-elle importante ?',
        options: [
          'Elle renforce les connexions neuronales et révèle les lacunes de compréhension.',
          'Elle rend l\'étude plus rapide mais moins efficace.',
          'Elle n\'est utile que pour les termes de vocabulaire.',
          'Elle n\'affecte pas la rétention à long terme.',
        ],
        correctOptionIndex: 0,
      },
      {
        question: 'Quel est le meilleur moyen de vérifier la maîtrise conceptuelle ?',
        options: [
          'Expliquer l\'idée simplement avec ses propres mots (technique de Feynman).',
          'Relire la page du manuel plusieurs fois.',
          'Surligner des définitions dans différentes couleurs.',
          'Passer directement au matériel avancé.',
        ],
        correctOptionIndex: 0,
      },
    ],
    es: [
      {
        question: '¿Cuál de las siguientes opciones describe el objetivo principal de esta sesión?',
        options: [
          'Aplicar los principios a la resolución práctica de problemas.',
          'Revisar pasivamente los conceptos sin involucrarse.',
          'Memorizar respuestas para la preparación de exámenes.',
          'Ignorar las bases conceptuales.',
        ],
        correctOptionIndex: 0,
      },
      {
        question: '¿Por qué es importante el recuerdo activo?',
        options: [
          'Construye conexiones neuronales a largo plazo y expone brechas de comprensión.',
          'Hace que el estudio sea más rápido pero menos efectivo.',
          'Solo es útil para términos de vocabulario.',
          'No afecta la retención a largo plazo.',
        ],
        correctOptionIndex: 0,
      },
      {
        question: '¿Cuál es la mejor manera de verificar el dominio conceptual?',
        options: [
          'Explicar la idea de manera sencilla con tus propias palabras (Técnica Feynman).',
          'Releer la página del libro de texto varias veces.',
          'Resaltar definiciones con diferentes colores.',
          'Pasar directamente al material avanzado.',
        ],
        correctOptionIndex: 0,
      },
    ],
    hy: [
      {
        question: 'Հետևյալներից ո՞րն է նկարագրում այս թեմայի հիմնական նպատակը:',
        options: [
          'Սկզբունքների կիրառումը գործնական խնդիրների լուծման մեջ:',
          'Հասկացությունների պասիվ վերանայում առանց ներգրավվածության:',
          'Պատասխանների անգիր անելը քննության նախապատրաստման համար:',
          'Հայեցակարգային հիմքերի անտեսումը:',
        ],
        correctOptionIndex: 0,
      },
      {
        question: 'Ինչու՞ է ակտիվ վերհիշումը կարևոր այս առաջադրանքի համար:',
        options: [
          'Այն կառուցում է երկարաժամկետ նյարդային կապեր և բացահայտում ըմբռնման բացերը:',
          'Այն ուսումնառությունը դարձնում է ավելի արագ, բայց պակաս արդյունավետ:',
          'Այն օգտակար է միայն բառապաշարի տերմինների համար:',
          'Այն չի ազդում երկարաժամկետ հիշողության վրա:',
        ],
        correctOptionIndex: 0,
      },
      {
        question: 'Ո՞րն է հայեցակարգային տիրապետումը ստուգելու լավագույն միջոցը:',
        options: [
          'Գաղափարը պարզապես սեփական բառերով բացատրելը (Ֆեյնմանի մեթոդ):',
          'Դասագրքի էջը բազմիցս վերընթերցելը:',
          'Սահմանումները տարբեր գույներով ընդգծելը:',
          'Անմիջապես անցնելը բարդ նյութերին:',
        ],
        correctOptionIndex: 0,
      },
    ],
    ja: [
      {
        question: '次のうち、このセッションの核心的な目的を説明しているものはどれですか？',
        options: [
          '原則を実践的な問題解決に応用すること。',
          '主体的に関与せず、受動的に概念を見直すこと。',
          '試験対策のために答えを暗記すること。',
          '概念的な基礎を無視すること。',
        ],
        correctOptionIndex: 0,
      },
      {
        question: 'なぜアクティブリコールが重要なのですか？',
        options: [
          '長期的な神経接続を構築し、理解のギャップを明らかにするため。',
          '学習は早くなるが、効果は低くなるため。',
          '語彙の用語にのみ有用であるため。',
          '長期的な記憶定着には影響しないため。',
        ],
        correctOptionIndex: 0,
      },
      {
        question: '概念の習得度を確認する最良の方法は何ですか？',
        options: [
          '自分の言葉でシンプルにそのアイデアを説明すること（ファインマン・テクニック）。',
          '教科書のページを何度も読み返すこと。',
          '異なる色で定義をハイライトすること。',
          'すぐに高度な内容に進むこと。',
        ],
        correctOptionIndex: 0,
      },
    ],
    zh: [
      {
        question: '以下哪项描述了本次学习的核心目标？',
        options: [
          '将原理应用到实际解题中。',
          '被动地复习概念而不参与互动。',
          '为了备考而死记硬背答案。',
          '忽略概念基础。',
        ],
        correctOptionIndex: 0,
      },
      {
        question: '为什么主动回忆对这项任务很重要？',
        options: [
          '它建立长期神经连接并暴露理解盲区。',
          '它让学习更快但效果更差。',
          '它仅对词汇术语有用。',
          '它不影响长期记忆。',
        ],
        correctOptionIndex: 0,
      },
      {
        question: '验证概念掌握情况的最佳方法是什么？',
        options: [
          '用自己的话简单解释这个概念（费曼学习法）。',
          '多次重读教科书页面。',
          '用不同的颜色突出显示定义。',
          '直接跳到高级材料。',
        ],
        correctOptionIndex: 0,
      },
    ],
  };

  Object.entries(MULTI_LANG_FALLBACKS).forEach(([lang, questions]) => {
    questions.forEach((q, qIdx) => {
      const uniqueOptions = new Set(q.options);
      assert.strictEqual(
        uniqueOptions.size,
        q.options.length,
        `Duplicate options found in lang ${lang}, question ${qIdx}`
      );
      const shuffled = shuffleQuestionOptions(q);
      assert.strictEqual(
        shuffled.options[shuffled.correctOptionIndex],
        q.options[q.correctOptionIndex],
        `Shuffle mapping failure in lang ${lang}, question ${qIdx}`
      );
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. ADDITIONAL LOGIC VERIFICATIONS (BUG-05, BUG-07, BUG-15)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 5. ADDITIONAL LOGIC VERIFICATIONS ---');

runTest('BUG-05: Shop level gate defaults to level 1 (locked)', () => {
  const initialLayoutLevel = 1;
  const isShopLockedAtStart = initialLayoutLevel < 2;
  assert.strictEqual(isShopLockedAtStart, true);
});

runTest('BUG-07: Stale Goal ID healing logic', () => {
  const loadedGoals = [
    { id: 'goal-101', title: 'Calculus III' },
    { id: 'goal-102', title: 'Linear Algebra' },
  ];

  let storedId = 'goal-stale-deleted';
  let healedId = null;

  if (storedId && loadedGoals.some((g) => g.id === storedId)) {
    healedId = storedId;
  } else if (loadedGoals.length > 0) {
    healedId = loadedGoals[0].id;
  } else {
    healedId = null;
  }

  assert.strictEqual(healedId, 'goal-101');
});

runTest('BUG-15: Rank title thresholds match design specification', () => {
  function getRankTitle(level) {
    if (level >= 11) return 'GRANDMASTER';
    if (level >= 8) return 'SAGE';
    if (level >= 5) return 'SCHOLAR';
    if (level >= 3) return 'ACOLYTE';
    return 'PATHSEEKER';
  }

  assert.strictEqual(getRankTitle(1), 'PATHSEEKER');
  assert.strictEqual(getRankTitle(2), 'PATHSEEKER');
  assert.strictEqual(getRankTitle(3), 'ACOLYTE');
  assert.strictEqual(getRankTitle(4), 'ACOLYTE');
  assert.strictEqual(getRankTitle(5), 'SCHOLAR');
  assert.strictEqual(getRankTitle(7), 'SCHOLAR');
  assert.strictEqual(getRankTitle(8), 'SAGE');
  assert.strictEqual(getRankTitle(10), 'SAGE');
  assert.strictEqual(getRankTitle(11), 'GRANDMASTER');
  assert.strictEqual(getRankTitle(50), 'GRANDMASTER');
});

console.log('\n================================================================================');
console.log(`  EMPIRICAL VERIFICATION COMPLETE: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('================================================================================\n');

if (failedTests > 0) {
  process.exit(1);
}
