export async function onRequest(context) {
    const { request, env } = context;
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
    };
    
    if (request.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }
    
    try {
        const input = await request.json();
        const { action, table, data, where, columns, order, sql } = input;
        const db = env.DB;
        
        if (!db) {
            return new Response(JSON.stringify({ success: false, error: "D1 Database connection (DB) not bound." }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }
        
        if (action === 'setup') {
            if (sql) {
                const queries = sql.split(';').map(q => q.trim()).filter(q => q.length > 0);
                for (const q of queries) {
                    await db.prepare(q).run();
                }
            }
            return new Response(JSON.stringify({ success: true, message: "D1 schema provisioned successfully." }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }
        
        if (action === 'select') {
            const cols = columns ? columns.join(', ') : '*';
            let query = `SELECT ${cols} FROM \`${table}\``;
            const params = [];
            
            if (where && Object.keys(where).length > 0) {
                const clauses = [];
                for (const [key, val] of Object.entries(where)) {
                    clauses.push(`\`${key}\` = ?`);
                    params.push(val);
                }
                query += ` WHERE ` + clauses.join(' AND ');
            }
            
            if (order) {
                query += ` ORDER BY ${order}`;
            }
            
            const stmt = db.prepare(query).bind(...params);
            const { results } = await stmt.all();
            return new Response(JSON.stringify({ success: true, data: results }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }
        
        if (action === 'insert') {
            const keys = Object.keys(data);
            const values = Object.values(data);
            const placeholders = keys.map(() => '?').join(', ');
            const query = `INSERT INTO \`${table}\` (${keys.map(k => `\`${k}\``).join(', ')}) VALUES (${placeholders}) RETURNING *`;
            
            const stmt = db.prepare(query).bind(...values);
            const result = await stmt.first();
            return new Response(JSON.stringify({ success: true, data: result }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }
        
        if (action === 'update') {
            const setKeys = Object.keys(data);
            const setValues = Object.values(data);
            const clauses = setKeys.map(k => `\`${k}\` = ?`).join(', ');
            
            let query = `UPDATE \`${table}\` SET ${clauses}`;
            const params = [...setValues];
            
            if (where && Object.keys(where).length > 0) {
                const whereClauses = [];
                for (const [key, val] of Object.entries(where)) {
                    whereClauses.push(`\`${key}\` = ?`);
                    params.push(val);
                }
                query += ` WHERE ` + whereClauses.join(' AND ');
            }
            
            const stmt = db.prepare(query).bind(...params);
            const info = await stmt.run();
            return new Response(JSON.stringify({ success: true, affected_rows: info.meta.changes || 0 }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }
        
        if (action === 'delete') {
            let query = `DELETE FROM \`${table}\``;
            const params = [];
            
            if (where && Object.keys(where).length > 0) {
                const clauses = [];
                for (const [key, val] of Object.entries(where)) {
                    clauses.push(`\`${key}\` = ?`);
                    params.push(val);
                }
                query += ` WHERE ` + clauses.join(' AND ');
            }
            
            const stmt = db.prepare(query).bind(...params);
            const info = await stmt.run();
            return new Response(JSON.stringify({ success: true, affected_rows: info.meta.changes || 0 }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }
        
        return new Response(JSON.stringify({ success: false, error: "Invalid action" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
        
    } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
}