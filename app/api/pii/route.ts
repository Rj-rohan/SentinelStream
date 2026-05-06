import { NextResponse } from "next/server";
import { piiStore } from "../../lib/store";

export async function GET() {
  return NextResponse.json({
    events: piiStore,
    total: piiStore.length,
    totalRedactions: piiStore.reduce((acc, e) => acc + e.piiTypes.length, 0),
  });
}
