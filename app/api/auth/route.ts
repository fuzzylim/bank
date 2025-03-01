import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json()

    // Call the Open Bank Project API for authentication
    const response = await fetch("https://apisandbox.openbankproject.com/my/logins/direct", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        password,
      }),
    })

    if (!response.ok) {
      return NextResponse.json({ error: "Authentication failed" }, { status: response.status })
    }

    const data = await response.json()

    return NextResponse.json({ token: data.token })
  } catch (error) {
    console.error("Authentication error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

