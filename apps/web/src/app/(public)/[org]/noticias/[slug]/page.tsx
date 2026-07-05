import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { publicApi } from "@/lib/public-api";

interface PublicArticle {
  organization: { name: string; slug: string };
  article: {
    title: string;
    excerpt: string | null;
    content: string;
    publishedAt: string | null;
    author: { firstName: string; lastName: string } | null;
  };
}

interface Props {
  params: Promise<{ org: string; slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { org, slug } = await params;
  const data = await publicApi<PublicArticle>(`/${org}/news/${slug}`);
  return {
    title: data ? `${data.article.title} · ${data.organization.name}` : "Noticia",
    description: data?.article.excerpt ?? undefined,
  };
}

export default async function PublicArticlePage({ params }: Props) {
  const { org, slug } = await params;
  const data = await publicApi<PublicArticle>(`/${org}/news/${slug}`);
  if (!data) notFound();
  const { article, organization } = data;

  return (
    <article className="mx-auto w-full max-w-2xl px-4 py-12">
      <p className="text-sm text-primary">{organization.name}</p>
      <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight">{article.title}</h1>
      <p className="mt-3 text-sm text-foreground-muted">
        {article.author && `${article.author.firstName} ${article.author.lastName} · `}
        {article.publishedAt &&
          new Date(article.publishedAt).toLocaleDateString("es", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}
      </p>
      <div className="mt-8 whitespace-pre-wrap text-base leading-relaxed text-foreground">
        {article.content}
      </div>
    </article>
  );
}
