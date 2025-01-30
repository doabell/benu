import type { NextRequest } from "next/server";
import { fetchExternalMenu } from "@/utils/fetchExternalMenu";

export const config = {
  runtime: "edge",
};

export default async function handler(request: NextRequest) {

  const { searchParams } = new URL(request.url);

  const dateStr = searchParams.get("dateStr");
  const place = searchParams.get("place");
  const meal = searchParams.get("meal");

  if (
    typeof dateStr !== "string" ||
    typeof place !== "string" ||
    typeof meal !== "string"
  ) {
    return new Response(
      null,
      {
        status: 400, statusText: "Bad inputs"
      },
    );
  }

  const sections = await fetchExternalMenu(dateStr, place, meal);

  return new Response(
    JSON.stringify(sections),
    {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=432000, stale-while-revalidate", // 1, 5 days
        "Content-Type": "application/json",
      },
    }
  );

}
