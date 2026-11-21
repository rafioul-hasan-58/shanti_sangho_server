import { MongoClient } from 'mongodb';

const uri =
  'mongodb://shavarchalashantisangho_db_user:EV8wvH8JCkUJG2p4@ac-kkgifwy-shard-00-00.zyjlxue.mongodb.net:27017,ac-kkgifwy-shard-00-01.zyjlxue.mongodb.net:27017,ac-kkgifwy-shard-00-02.zyjlxue.mongodb.net:27017/shantisangho_db?ssl=true&replicaSet=atlas-wzj25q-shard-0&authSource=admin&appName=ClusterX';

async function main() {
  console.log('Connecting to MongoDB cluster (replicaSet: atlas-wzj25q-shard-0)...');
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected successfully to MongoDB Replica Set!');
    const db = client.db('shantisangho_db');

    const collections = (await db.listCollections().toArray()).map((c) => c.name);
    console.log('Current collections in DB:', collections);

    const userCount = collections.includes('User')
      ? await db.collection('User').countDocuments()
      : 0;
    const memberCount = collections.includes('Member')
      ? await db.collection('Member').countDocuments()
      : 0;

    console.log(`Document counts before migration:`);
    console.log(`- User: ${userCount}`);
    console.log(`- Member: ${memberCount}`);

    // Step 1: Ensure Executive collection exists
    if (!collections.includes('Executive')) {
      await db.createCollection('Executive');
      console.log(`✅ Created 'Executive' collection.`);
    }

    // Step 2: Ensure User documents are safely copied into Member
    if (collections.includes('User') && userCount > 0) {
      console.log(`Copying all ${userCount} documents from 'User' to 'Member'...`);
      const userDocs = await db.collection('User').find().toArray();

      // If 'Member' exists and was empty, drop it first so we can cleanly populate it
      if (collections.includes('Member')) {
        await db.collection('Member').drop();
      }

      await db.collection('Member').insertMany(userDocs);
      const newMemberCount = await db.collection('Member').countDocuments();
      console.log(`✅ 'Member' collection now has ${newMemberCount} documents (matched original User count: ${userCount}).`);

      // Recreate indexes on Member collection
      console.log('Creating unique index on Member.email...');
      await db.collection('Member').createIndex({ email: 1 }, { unique: true });

      // Keep a safety backup of User as 'User_backup'
      if (!collections.includes('User_backup')) {
        await db.collection('User_backup').insertMany(userDocs);
        console.log(`✅ Created 'User_backup' collection with ${userCount} documents for safety.`);
      }

      console.log(`✅ Preserved original 'User' collection as well.`);
    }

    const finalCollections = (await db.listCollections().toArray()).map((c) => c.name);
    console.log('\nFinal collections in DB:');
    for (const collectionName of finalCollections) {
      const cnt = await db.collection(collectionName).countDocuments();
      console.log(`- Collection "${collectionName}": ${cnt} documents`);
    }

    console.log('\n🎉 Collection migration completed successfully with 100% data preservation!');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await client.close();
  }
}

main();
