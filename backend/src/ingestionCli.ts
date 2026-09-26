import { initDb } from './db.js';
import { ingestFirmsData } from './ingestionService.js';

async function run(): Promise<void> {
  await initDb();
  const bbox = process.argv[2] || '68,6,98,38';
  const dayRange = parseInt(process.argv[3]) || 1;
  console.log(`Starting ingestion for bbox: ${bbox}, dayRange: ${dayRange}`);
  const result = await ingestFirmsData(bbox, dayRange);
  console.log('Result:', JSON.stringify(result, null, 2));
  process.exit(0);
}

run().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
