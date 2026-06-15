const supabaseUrl = 'https://zchtrhmwqokeqgdoyjlf.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjaHRyaG13cW9rZXFnZG95amxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTY4MjIyNiwiZXhwIjoyMDk1MjU4MjI2fQ.6LciQV-fk2rK7wWIhJSuxiXy8GzUT0RHxoq4mXIJJYE';

async function run() {
  const res = await fetch(`${supabaseUrl}/rest/v1/`, {
    headers: {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`
    }
  });
  console.log('Status:', res.status);
  const data = await res.json();
  console.log('Tables/Views:', Object.keys(data.definitions || {}));
  console.log('Paths:', Object.keys(data.paths || {}));
}

run();
