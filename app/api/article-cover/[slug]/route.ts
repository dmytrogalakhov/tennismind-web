import { getArticleBySlug } from "@/lib/articles";
import { renderArticleCover } from "@/lib/cards/articleCover";
import { NextRequest } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) {
    return new Response("Not found", { status: 404 });
  }

  const png = renderArticleCover({ category: article.category, headline: article.title });

  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
