import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/supabase"
import { getSessionUser } from "@/lib/auth"

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ storagePath: string }> }
) {
  try {
    await getSessionUser() // just verify session, ownership checked at metadata fetch time
    const { storagePath } = await params

    // storagePath comes in URL-encoded, decode it
    const decoded = decodeURIComponent(storagePath)

    const { data, error } = await supabase.storage
      .from("attachments")
      .download(decoded)

    if (error || !data) {
      console.error("Storage download error:", error)
      return NextResponse.json({ error: "Download failed" }, { status: 500 })
    }

    const buffer = await data.arrayBuffer()

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Length": buffer.byteLength.toString(),
      },
    })
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}