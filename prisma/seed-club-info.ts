import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const sampleClubInfo = [
  {
    category: 'fees',
    title: 'Membership and Registration Fees',
    content:
      'General membership fee is 500 BDT per month. Student / Player quota membership is 200 BDT per month. Permanent membership lifetime registration fee is 5,000 BDT. Tournament entry fees vary per tournament (typically 1,000 - 2,500 BDT per team).',
    tags: ['fees', 'dues', 'cost', 'membership', 'price', 'pricing', 'monthly'],
  },
  {
    category: 'hours',
    title: 'Club Opening Hours and Field Schedule',
    content:
      'The club premises and field are open daily from 6:00 AM to 10:00 PM. Morning fitness & practice: 6:00 AM - 9:00 AM. Afternoon sports & tournaments: 3:30 PM - 7:00 PM. Club office and administrative desk: 9:00 AM - 8:00 PM Saturday through Thursday (Closed on Friday mornings).',
    tags: ['hours', 'schedule', 'timing', 'opening hours', 'practice', 'office'],
  },
  {
    category: 'rules',
    title: 'Club Rules, Code of Conduct & Ground Regulations',
    content:
      '1. Proper athletic footwear (cleats or turf shoes) is mandatory on the field. 2. Respect fellow players, referees, and club property. 3. Smoking, alcohol, and prohibited substances are strictly banned on club grounds. 4. Guests must register at the reception desk before using facilities. 5. Any unsportsmanlike behavior or property damage will result in immediate suspension.',
    tags: ['rules', 'conduct', 'regulations', 'discipline', 'guidelines', 'policy'],
  },
  {
    category: 'contact',
    title: 'Contact Information and Location',
    content:
      'Address: Shavarchala Shanti Sangha Club Ground, Shavarchala, Kaliakair, Gazipur, Bangladesh. Email: info@shantisangho.com / support@shantisangho.com. Phone: +8801700000000. Official website: https://shantisangho.com. Emergency helpline: +8801711111111.',
    tags: ['contact', 'email', 'phone', 'address', 'location', 'help', 'support'],
  },
  {
    category: 'faq',
    title: 'Frequently Asked Questions (FAQ)',
    content:
      'Q: How can I become a member? A: You can register online or visit our office with a national ID or student ID and 2 passport photos. Q: Can non-members book the field? A: Yes, subject to availability and booking fees. Contact the club office at least 48 hours in advance.',
    tags: ['faq', 'membership', 'booking', 'questions', 'join'],
  },
];

export async function seedClubInfo(client: PrismaClient = prisma) {
  console.log('🌱 Seeding ClubInfo entries...');

  for (const info of sampleClubInfo) {
    const existing = await client.clubInfo.findFirst({
      where: {
        category: info.category,
        title: info.title,
      },
    });

    if (existing) {
      await client.clubInfo.update({
        where: { id: existing.id },
        data: info,
      });
      console.log(`  Updated ClubInfo: [${info.category}] ${info.title}`);
    } else {
      await client.clubInfo.create({
        data: info,
      });
      console.log(`  Created ClubInfo: [${info.category}] ${info.title}`);
    }
  }

  console.log('✅ ClubInfo seeding finished successfully.');
}

async function main() {
  await seedClubInfo();
}

if (require.main === module) {
  main()
    .catch((err) => {
      console.error('❌ Error seeding ClubInfo:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
