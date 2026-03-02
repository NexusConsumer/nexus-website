import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Enable pgvector extension ────────────────────────────
  await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS vector;');
  console.log('✅ pgvector extension enabled');

  // ─── Default AI system prompt ─────────────────────────────
  await prisma.aiConfig.upsert({
    where: { key: 'system_prompt' },
    create: {
      key: 'system_prompt',
      value: `אתה נציג תמיכה ומכירות של Nexus — פלטפורמת תשלומים ופינטק מובילה.
עונה תמיד בעברית, בנימה מקצועית אך ידידותית וחמה.

הנחיות:
• הבן את צורך הלקוח ב-1-2 שאלות לפני שאתה ממליץ
• תשובות קצרות ולעניין — עד 3 משפטים
• אם הלקוח מעוניין בדמו או שאלה טכנית מורכבת — הצע נציג אנושי
• אל תמציא מחירים — השתמש רק בפרטים מהידע שסופק לך
• אם אין לך תשובה מדויקת — אמור בכנות ותציע נציג
• אם הלקוח מבקש נציג אנושי — ענה: ESCALATE

משפט escalation: "אני מחבר אותך עכשיו לנציג מומחה שיוכל לעזור — הוא יחזור אליך תוך דקות."`,
      description: 'הנחיות מערכת ל-AI assistant בצ\'אט',
    },
    update: {},
  });

  // ─── Escalation threshold ─────────────────────────────────
  await prisma.aiConfig.upsert({
    where: { key: 'escalation_threshold' },
    create: {
      key: 'escalation_threshold',
      value: '0.35',
      description: 'Minimum cosine similarity for a relevant chunk (0–1). Below this → escalate.',
    },
    update: {},
  });

  // ─── Max AI messages before escalation ───────────────────
  await prisma.aiConfig.upsert({
    where: { key: 'max_ai_messages' },
    create: {
      key: 'max_ai_messages',
      value: '5',
      description: 'Maximum number of AI messages in a session before forcing escalation to human',
    },
    update: {},
  });

  // ─── Seed few-shot examples ───────────────────────────────
  const examples = [
    {
      question: 'כמה עולה Nexus?',
      answer: 'יש לנו מספר תוכניות — החל מ-₪199/חודש לעסקים קטנים ועד פתרונות Enterprise מותאמים אישית. רוצה שאמסור לך פרטים על תוכנית ספציפית?',
      category: 'pricing',
    },
    {
      question: 'האם אפשר לקבל דמו?',
      answer: 'בהחלט! אני מחבר אותך לנציג שיקבע איתך הדגמה אישית בהתאם לצרכים שלך.',
      category: 'demo',
    },
    {
      question: 'איך מתחברים ל-API שלכם?',
      answer: 'ה-API שלנו מבוסס REST עם אותנטיקציה OAuth2. יש לנו SDK ל-Node.js, Python ו-PHP. רוצה שאחבר אותך לתיעוד הטכני או לנציג טכני?',
      category: 'technical',
    },
    {
      question: 'מה זמן השבת לשאלות תמיכה?',
      answer: 'צוות התמיכה שלנו זמין ראשון עד שישי 09:00–18:00. לפניות דחופות יש לנו תמיכה 24/7 ל-Enterprise.',
      category: 'support',
    },
  ];

  for (const ex of examples) {
    await prisma.aiExample.upsert({
      where: { id: `seed_${ex.category}` },
      create: { id: `seed_${ex.category}`, ...ex, language: 'he' },
      update: {},
    });
  }

  // ─── Admin user ───────────────────────────────────────────
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@nexus.com';
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'Change-Me-Immediately-123!';

  await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      fullName: 'Nexus Admin',
      passwordHash: await bcrypt.hash(adminPassword, 12),
      role: 'ADMIN',
      emailVerified: true,
    },
    update: {},
  });
  console.log(`✅ Admin user: ${adminEmail}`);

  console.log('🌱 Seed complete!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
