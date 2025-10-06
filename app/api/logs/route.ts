
// // ===============================================
// // API LOGS ENDPOINT
// // app/api/logs/route.ts
// // ===============================================

// import { NextRequest, NextResponse } from 'next/server';
// import { createClient } from '@supabase/supabase-js';


// export async function POST(request: NextRequest) {
//   try {
//     const { logs } = await request.json();

//     // Store logs in Supabase
//     const supabase = createClient(
//       process.env.NEXT_PUBLIC_SUPABASE_URL!,
//       process.env.SUPABASE_SERVICE_ROLE_KEY!
//     );

//     // Insert logs into database
//     const { error } = await supabase.from('application_logs').insert(
//       logs.map((log: LogEntry) => ({
//         level: log.level,
//         message: log.message,
//         context: log.context,
//         user_id: log.userId,
//         session_id: log.sessionId,
//         trace_id: log.traceId,
//         created_at: log.timestamp,
//       }))
//     );

//     if (error) {
//       console.error('Failed to store logs:', error);
//       return NextResponse.json({ error: 'Failed to store logs' }, { status: 500 });
//     }

//     return NextResponse.json({ success: true });
//   } catch (error) {
//     console.error('Error processing logs:', error);
//     return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
//   }
// }
