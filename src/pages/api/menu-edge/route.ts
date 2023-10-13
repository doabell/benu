import type { NextRequest } from 'next/server';
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

  const items = await fetchExternalMenu(dateStr, place, meal);

  return new Response(
    JSON.stringify(items),
    {
      status: 200,
      headers: {
        'Cache-Control': 's-maxage=432000', // 5 days
        'Content-Type': 'application/json',
      },
    }
  );

}