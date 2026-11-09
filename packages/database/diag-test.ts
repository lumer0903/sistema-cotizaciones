import { PrismaClient } from "@prisma/client";
const p = new PrismaClient({ datasources: { db: { url: process.env.TEST_URL } } });
p.$queryRawUnsafe("SELECT current_user::text AS u").then(r => { console.log("OK", JSON.stringify(r)); return p.$disconnect(); }).catch(e => { console.log("FAIL:", (e.message||"").replace(/\s+/g," ").slice(0,300)); p.$disconnect(); });
