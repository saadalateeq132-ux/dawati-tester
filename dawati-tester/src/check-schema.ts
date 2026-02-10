#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkSchema(tableName: string) {
  if (!tableName) {
    console.error('Error: Table name is required.');
    console.error('Usage: bun src/check-schema.ts <table_name>');
    process.exit(1);
  }

  console.log(`Checking ${tableName} table schema...\n`);

  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  if (data && data.length > 0) {
    console.log(`${tableName} table columns:`);
    console.log(Object.keys(data[0]));
  } else {
    console.log(`No ${tableName} in table yet - checking schema differently...`);

    // Try to insert a dummy record to see schema
    const { error: insertError } = await supabase
      .from(tableName)
      .insert({})
      .select();

    if (insertError) {
      console.log('\nRequired/Not-null columns based on error:');
      console.log(insertError.message);
    }
  }
}

const tableName = process.argv[2];
checkSchema(tableName);
