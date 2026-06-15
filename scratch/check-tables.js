const supabaseUrl = 'https://zchtrhmwqokeqgdoyjlf.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjaHRyaG13cW9rZXFnZG95amxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTY4MjIyNiwiZXhwIjoyMDk1MjU4MjI2fQ.6LciQV-fk2rK7wWIhJSuxiXy8GzUT0RHxoq4mXIJJYE';

async function run() {
  // Try querying a hypothetical "bets" table
  console.log('Checking "bets" table...');
  const res = await fetch(`${supabaseUrl}/rest/v1/bets?select=*`, {
    headers: {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Range': '0-0'
    }
  });
  console.log('Status bets:', res.status, res.statusText);
  const text = await res.text();
  console.log('Response bets:', text);

  // Try querying "predictions" table to see its structure by fetching one record
  console.log('Checking "predictions" table...');
  const res2 = await fetch(`${supabaseUrl}/rest/v1/predictions?select=*&limit=1`, {
    headers: {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`
    }
  });
  console.log('Status predictions:', res2.status, res2.statusText);
  const text2 = await res2.text();
  console.log('Response predictions:', text2);
}

run();
