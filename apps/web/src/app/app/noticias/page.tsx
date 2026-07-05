"use client";

import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Skeleton,
  Textarea,
} from "@ligas/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Newspaper, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { authedApi } from "@/lib/api";
import { useSession } from "@/lib/session";

interface News {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  publishedAt: string | null;
  author: { firstName: string; lastName: string } | null;
}

export default function NewsPage() {
  const { orgId } = useSession();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["news", orgId],
    queryFn: () => authedApi<News[]>(`/orgs/${orgId}/news`),
  });

  const invalidate = () => void qc.invalidateQueries({ queryKey: ["news", orgId] });

  const create = useMutation({
    mutationFn: (status: "DRAFT" | "PUBLISHED") =>
      authedApi(`/orgs/${orgId}/news`, {
        method: "POST",
        body: JSON.stringify({ title, content, status }),
      }),
    onSuccess: () => {
      invalidate();
      setTitle("");
      setContent("");
      setShowForm(false);
    },
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      authedApi(`/orgs/${orgId}/news/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => authedApi(`/orgs/${orgId}/news/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Noticias</h1>
          <p className="text-sm text-foreground-muted">
            Lo publicado aparece en el portal público de tu organización.
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus className="size-4" /> Nueva noticia
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="title" required>
                Título
              </Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="content" required>
                Contenido
              </Label>
              <Textarea
                id="content"
                rows={6}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Escribe la noticia…"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                disabled={title.length < 5 || content.length < 20}
                loading={create.isPending}
                onClick={() => create.mutate("DRAFT")}
              >
                Guardar borrador
              </Button>
              <Button
                disabled={title.length < 5 || content.length < 20}
                loading={create.isPending}
                onClick={() => create.mutate("PUBLISHED")}
              >
                Publicar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <Skeleton className="h-48" />
      ) : !data?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Newspaper className="size-10 text-foreground-subtle" />
            <p className="font-medium">Aún no hay noticias</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {data.map((n) => (
            <Card key={n.id}>
              <CardContent className="flex items-center gap-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{n.title}</p>
                  <p className="text-xs text-foreground-muted">
                    {n.author ? `${n.author.firstName} ${n.author.lastName}` : "—"}
                    {n.publishedAt &&
                      ` · ${new Date(n.publishedAt).toLocaleDateString("es", { day: "2-digit", month: "long" })}`}
                  </p>
                </div>
                <Badge
                  variant={n.status === "PUBLISHED" ? "success" : n.status === "DRAFT" ? "neutral" : "outline"}
                  dot
                >
                  {n.status === "PUBLISHED" ? "Publicada" : n.status === "DRAFT" ? "Borrador" : "Archivada"}
                </Badge>
                {n.status === "DRAFT" ? (
                  <Button size="sm" onClick={() => setStatus.mutate({ id: n.id, status: "PUBLISHED" })}>
                    Publicar
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setStatus.mutate({ id: n.id, status: "ARCHIVED" })}
                  >
                    Archivar
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Eliminar"
                  onClick={() => remove.mutate(n.id)}
                >
                  <Trash2 className="size-4 text-danger" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
