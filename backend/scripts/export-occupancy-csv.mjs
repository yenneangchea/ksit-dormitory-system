import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.SUPABASE_URL || 'https://ukdpgzbzrzosbxvsxifc.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || 'sb_publishable_QpFoATIdqsnRnQC1TfPO9A_mOaJGDzi';

const supabase = createClient(supabaseUrl, supabaseKey);

async function exportCSV() {
  console.log('Querying 68 rooms and assignments from Supabase...');

  const { data: rooms, error: roomsError } = await supabase
    .from('rooms')
    .select(`
      id,
      room_number,
      floor_number,
      capacity,
      occupied_count,
      status,
      is_locked,
      building:buildings!rooms_building_id_fkey(
        code,
        name
      )
    `)
    .order('room_number');

  if (roomsError) {
    console.error('Error fetching rooms:', roomsError);
    process.exit(1);
  }

  console.log(`Fetched ${rooms ? rooms.length : 0} rooms from database.`);

  const { data: assignments, error: assignError } = await supabase
    .from('room_assignments')
    .select(`
      id,
      bed_number,
      academic_year,
      is_active,
      student:users!room_assignments_student_id_fkey(
        full_name_latin,
        full_name_khmer,
        email,
        phone,
        gender
      ),
      room:rooms!room_assignments_room_id_fkey(
        room_number
      )
    `)
    .eq('is_active', true);

  if (assignError) {
    console.error('Error fetching assignments:', assignError);
  }

  // Map assignments by room number
  const assignMap = {};
  if (assignments) {
    assignments.forEach(a => {
      const rNum = a.room?.room_number;
      if (rNum) {
        if (!assignMap[rNum]) assignMap[rNum] = [];
        assignMap[rNum].push(a);
      }
    });
  }

  let csvRows = [
    'Building Code,Building Name,Room Number,Floor,Capacity,Occupied,Status,Is Locked,Assigned Students,Student Emails'
  ];

  rooms.forEach(r => {
    const bCode = r.building?.code || 'N/A';
    const bName = `"${(r.building?.name || 'N/A').replace(/"/g, '""')}"`;
    const rNum = r.room_number;
    const floor = r.floor_number;
    const cap = r.capacity;
    const occ = r.occupied_count || 0;
    const status = r.status;
    const locked = r.is_locked ? 'Locked' : 'Open';
    
    const occupants = assignMap[rNum] || [];
    const studentNames = `"${occupants.map(o => o.student?.full_name_latin || 'Unknown').join('; ')}"`;
    const studentEmails = `"${occupants.map(o => o.student?.email || '').join('; ')}"`;

    csvRows.push(`${bCode},${bName},${rNum},${floor},${cap},${occ},${status},${locked},${studentNames},${studentEmails}`);
  });

  const outputPath = path.resolve(process.cwd(), '../ksit_dormitory_occupancy_assignments_report.csv');
  fs.writeFileSync(outputPath, csvRows.join('\n'), 'utf8');
  console.log(`CSV exported successfully to: ${outputPath}`);
  console.log(`Total rooms exported: ${rooms.length}`);
}

exportCSV().catch(err => {
  console.error('Export failed:', err);
  process.exit(1);
});
