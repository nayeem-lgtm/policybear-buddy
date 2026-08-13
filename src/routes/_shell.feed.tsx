import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Heart,
  MessageSquare,
  Paperclip,
  Pin,
  Search,
  Send,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/crm/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_shell/feed")({
  head: () => ({
    meta: [
      { title: "Company Feed — Policy Bear CRM" },
      {
        name: "description",
        content: "Internal company social wall for posts, wins, and announcements.",
      },
      { property: "og:title", content: "Company Feed — Policy Bear CRM" },
      {
        property: "og:description",
        content: "Internal company social wall for posts, wins, and announcements.",
      },
    ],
  }),
  component: FeedPage,
});

type Post = Database["public"]["Tables"]["posts"]["Row"];
type Comment = Database["public"]["Tables"]["post_comments"]["Row"];
type Like = Database["public"]["Tables"]["post_likes"]["Row"];
type Attachment = Database["public"]["Tables"]["post_attachments"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

const CHANNELS = ["general", "sales", "hr", "quality", "wins"] as const;
const ANNOUNCE_ROLES = ["CEO", "Administrator", "HR", "Operations"];

function relativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function FeedPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState<string>("all");

  const [composerChannel, setComposerChannel] = useState<string>("general");
  const [composerTitle, setComposerTitle] = useState("");
  const [composerBody, setComposerBody] = useState("");
  const [composerAnnouncement, setComposerAnnouncement] = useState(false);
  const [composerFiles, setComposerFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  const canAnnounce = !!user && ANNOUNCE_ROLES.includes(user.role);
  const canPin = canAnnounce;

  const postsQuery = useQuery({
    queryKey: ["posts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("posts").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Post[];
    },
  });

  const authorIds = useMemo(
    () => Array.from(new Set((postsQuery.data ?? []).map((p) => p.author_id).filter(Boolean))) as string[],
    [postsQuery.data],
  );

  const profilesQuery = useQuery({
    queryKey: ["profiles", authorIds],
    queryFn: async () => {
      if (authorIds.length === 0) return [] as Profile[];
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, department, title, team, avatar_initials, avatar_url, presence, landing, created_at, updated_at")
        .in("id", authorIds);
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
    enabled: authorIds.length > 0,
  });
  const profileMap = useMemo(() => {
    const map = new Map<string, Profile>();
    for (const p of profilesQuery.data ?? []) map.set(p.id, p);
    return map;
  }, [profilesQuery.data]);

  const commentsQuery = useQuery({
    queryKey: ["post_comments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("post_comments").select("*").order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Comment[];
    },
  });

  const likesQuery = useQuery({
    queryKey: ["post_likes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("post_likes").select("*");
      if (error) throw error;
      return (data ?? []) as Like[];
    },
  });

  const attachmentsQuery = useQuery({
    queryKey: ["post_attachments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("post_attachments").select("*");
      if (error) throw error;
      return (data ?? []) as Attachment[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("feed-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => {
        queryClient.invalidateQueries({ queryKey: ["posts"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "post_comments" }, () => {
        queryClient.invalidateQueries({ queryKey: ["post_comments"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "post_likes" }, () => {
        queryClient.invalidateQueries({ queryKey: ["post_likes"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const createPostMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      if (!composerBody.trim()) throw new Error("Write something first");
      const { data: post, error } = await supabase
        .from("posts")
        .insert({
          author_id: user.id,
          channel: composerChannel,
          title: composerTitle.trim() || null,
          body: composerBody.trim(),
          kind: composerAnnouncement && canAnnounce ? "announcement" : "post",
          pinned: false,
          audience: "all",
        })
        .select("*")
        .single();
      if (error) throw error;

      for (const file of composerFiles) {
        const path = `${user.id}/${Date.now()}-${safeName(file.name)}`;
        const { error: uploadError } = await supabase.storage.from("attachments").upload(path, file);
        if (uploadError) throw uploadError;
        const { error: attError } = await supabase.from("post_attachments").insert({
          post_id: post.id,
          path,
          name: file.name,
          mime: file.type || null,
          size: file.size,
          uploaded_by: user.id,
        });
        if (attError) throw attError;
      }
      return post;
    },
    onSuccess: () => {
      setComposerTitle("");
      setComposerBody("");
      setComposerFiles([]);
      setComposerAnnouncement(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast.success("Posted to the feed");
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["post_attachments"] });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to post"),
  });

  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase.from("posts").delete().eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const togglePinMutation = useMutation({
    mutationFn: async ({ postId, pinned }: { postId: string; pinned: boolean }) => {
      const { error } = await supabase.from("posts").update({ pinned }).eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["posts"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleLikeMutation = useMutation({
    mutationFn: async (postId: string) => {
      if (!user) throw new Error("Not signed in");
      const existing = (likesQuery.data ?? []).find((l) => l.post_id === postId && l.user_id === user.id);
      if (existing) {
        const { error } = await supabase.from("post_likes").delete().eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["post_likes"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const addCommentMutation = useMutation({
    mutationFn: async ({ postId, body }: { postId: string; body: string }) => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("post_comments").insert({ post_id: postId, author_id: user.id, body });
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      setCommentDrafts((prev) => ({ ...prev, [vars.postId]: "" }));
      queryClient.invalidateQueries({ queryKey: ["post_comments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase.from("post_comments").delete().eq("id", commentId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["post_comments"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  async function openAttachment(path: string) {
    if (signedUrls[path]) {
      window.open(signedUrls[path], "_blank");
      return;
    }
    const { data, error } = await supabase.storage.from("attachments").createSignedUrl(path, 3600);
    if (error || !data) {
      toast.error("Could not open attachment");
      return;
    }
    setSignedUrls((prev) => ({ ...prev, [path]: data.signedUrl }));
    window.open(data.signedUrl, "_blank");
  }

  const posts = postsQuery.data ?? [];
  const filteredPosts = useMemo(() => {
    return posts
      .filter((p) => (channelFilter === "all" ? true : p.channel === channelFilter))
      .filter((p) => {
        if (!search.trim()) return true;
        const q = search.trim().toLowerCase();
        return (p.title ?? "").toLowerCase().includes(q) || p.body.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [posts, channelFilter, search]);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Workspace" title="Company Feed" description="Company-wide social wall for updates, wins, and discussion." />

      <Card className="space-y-3 p-4 shadow-card">
        <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
          <Select value={composerChannel} onValueChange={setComposerChannel}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CHANNELS.map((c) => (
                <SelectItem key={c} value={c} className="capitalize">
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={composerTitle}
            onChange={(e) => setComposerTitle(e.target.value)}
            placeholder="Optional title"
            className="h-9 text-sm"
          />
        </div>
        <Textarea
          value={composerBody}
          onChange={(e) => setComposerBody(e.target.value)}
          placeholder="Share something with the team…"
          rows={3}
        />
        {composerFiles.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {composerFiles.map((f, i) => (
              <Badge key={`${f.name}-${i}`} variant="secondary" className="gap-1">
                <Paperclip className="size-3" /> {f.name}
              </Badge>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => setComposerFiles(Array.from(e.target.files ?? []))}
            />
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => fileInputRef.current?.click()}>
              <Paperclip className="size-3.5" /> Attach
            </Button>
            {canAnnounce && (
              <div className="flex items-center gap-2">
                <Switch checked={composerAnnouncement} onCheckedChange={setComposerAnnouncement} id="announce-toggle" />
                <Label htmlFor="announce-toggle" className="text-xs text-muted-foreground">
                  Post as announcement
                </Label>
              </div>
            )}
          </div>
          <Button
            size="sm"
            className="gap-1.5"
            disabled={!composerBody.trim() || createPostMutation.isPending}
            onClick={() => createPostMutation.mutate()}
          >
            <Send className="size-3.5" /> Post
          </Button>
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={channelFilter} onValueChange={setChannelFilter}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            {CHANNELS.map((c) => (
              <TabsTrigger key={c} value={c} className="capitalize">
                {c}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative w-full max-w-xs">
          <Search className="absolute top-2.5 left-2.5 size-3.5 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search posts…" className="h-9 pl-7 text-sm" />
        </div>
      </div>

      {postsQuery.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : filteredPosts.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">No posts yet. Be the first to share something!</Card>
      ) : (
        <div className="space-y-3">
          {filteredPosts.map((post) => {
            const author = post.author_id ? profileMap.get(post.author_id) : undefined;
            const postLikes = (likesQuery.data ?? []).filter((l) => l.post_id === post.id);
            const liked = !!user && postLikes.some((l) => l.user_id === user.id);
            const postComments = (commentsQuery.data ?? []).filter((c) => c.post_id === post.id);
            const postAttachments = (attachmentsQuery.data ?? []).filter((a) => a.post_id === post.id);
            const canDelete = !!user && (post.author_id === user.id || ANNOUNCE_ROLES.includes(user.role));
            const isExpanded = expandedPost === post.id;

            return (
              <Card key={post.id} className={cn("space-y-3 p-4 shadow-card", post.pinned && "border-brand/30 bg-brand/5")}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="size-9">
                      <AvatarFallback className="text-xs">{author?.avatar_initials ?? "??"}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-foreground">{author?.name ?? "Unknown"}</p>
                        {author?.department && <span className="text-xs text-muted-foreground">· {author.department}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground">{relativeTime(post.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {post.pinned && (
                      <Badge variant="secondary" className="gap-1">
                        <Pin className="size-3" /> Pinned
                      </Badge>
                    )}
                    <Badge variant="outline" className="capitalize">
                      {post.channel}
                    </Badge>
                    {post.kind === "announcement" && <Badge className="bg-brand text-brand-foreground">Announcement</Badge>}
                  </div>
                </div>

                {post.title && <h3 className="text-base font-semibold text-foreground">{post.title}</h3>}
                <p className="text-sm whitespace-pre-wrap text-foreground">{post.body}</p>

                {postAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {postAttachments.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => openAttachment(a.path)}
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-1 text-xs text-foreground hover:bg-muted/70"
                      >
                        <Paperclip className="size-3" /> {a.name}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 border-t border-border pt-2 text-xs text-muted-foreground">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn("h-7 gap-1.5", liked && "text-brand")}
                    onClick={() => toggleLikeMutation.mutate(post.id)}
                  >
                    <Heart className={cn("size-3.5", liked && "fill-brand text-brand")} /> {postLikes.length}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5"
                    onClick={() => setExpandedPost(isExpanded ? null : post.id)}
                  >
                    <MessageSquare className="size-3.5" /> {postComments.length}
                  </Button>
                  {canPin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1.5"
                      onClick={() => togglePinMutation.mutate({ postId: post.id, pinned: !post.pinned })}
                    >
                      <Pin className="size-3.5" /> {post.pinned ? "Unpin" : "Pin"}
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1.5 text-destructive hover:text-destructive"
                      onClick={() => deletePostMutation.mutate(post.id)}
                    >
                      <Trash2 className="size-3.5" /> Delete
                    </Button>
                  )}
                </div>

                {isExpanded && (
                  <div className="space-y-2 border-t border-border pt-3">
                    {postComments.map((c) => {
                      const commentAuthor = c.author_id ? profileMap.get(c.author_id) : undefined;
                      const canDeleteComment = !!user && (c.author_id === user.id || ANNOUNCE_ROLES.includes(user.role));
                      return (
                        <div key={c.id} className="flex items-start gap-2">
                          <Avatar className="size-6">
                            <AvatarFallback className="text-[0.6rem]">{commentAuthor?.avatar_initials ?? "??"}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 rounded-md bg-muted px-3 py-1.5 text-xs">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-semibold text-foreground">{commentAuthor?.name ?? "Unknown"}</p>
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">{relativeTime(c.created_at)}</span>
                                {canDeleteComment && (
                                  <button
                                    onClick={() => deleteCommentMutation.mutate(c.id)}
                                    className="text-muted-foreground hover:text-destructive"
                                  >
                                    <Trash2 className="size-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                            <p className="text-foreground">{c.body}</p>
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex items-center gap-2">
                      <Input
                        value={commentDrafts[post.id] ?? ""}
                        onChange={(e) => setCommentDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))}
                        placeholder="Write a comment…"
                        className="h-8 text-xs"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const body = (commentDrafts[post.id] ?? "").trim();
                            if (body) addCommentMutation.mutate({ postId: post.id, body });
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        className="h-8"
                        onClick={() => {
                          const body = (commentDrafts[post.id] ?? "").trim();
                          if (body) addCommentMutation.mutate({ postId: post.id, body });
                        }}
                      >
                        <Send className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
