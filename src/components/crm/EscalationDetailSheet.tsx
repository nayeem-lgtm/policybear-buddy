import { useEffect, useState } from "react";
import { MessageSquare, Ticket } from "lucide-react";
import { toast } from "sonner";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  ESCALATION_STATUSES,
  riskTone,
  statusTone,
  type Escalation,
  type EscalationComment,
  type EscalationStatus,
} from "@/lib/escalations";

type Props = {
  escalation: Escalation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const dt = (iso: string) => new Date(iso).toLocaleString("en-US");

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-dashed py-2.5 last:border-b-0">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="max-w-[62%] text-right text-sm font-medium break-words">{value}</span>
    </div>
  );
}

export function EscalationDetailSheet({ escalation, open, onOpenChange }: Props) {
  const [status, setStatus] = useState<EscalationStatus>("OPEN");
  const [comments, setComments] = useState<EscalationComment[]>([]);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (escalation) {
      setStatus(escalation.status);
      setComments(escalation.comments);
      setDraft("");
    }
  }, [escalation]);

  if (!escalation) return null;

  const addComment = () => {
    if (!draft.trim()) return;
    setComments((c) => [
      ...c,
      {
        id: `${escalation.id}-${c.length + 1}`,
        author: "You",
        at: new Date().toISOString(),
        body: draft.trim(),
      },
    ]);
    setDraft("");
    toast.success("Comment added");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-y-auto p-0 sm:max-w-2xl"
      >
        <div className="sticky top-0 z-10 border-b bg-card/95 px-6 py-5 backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <Ticket className="size-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold">Escalation #{escalation.id}</h2>
              <p className="truncate text-sm text-muted-foreground">{escalation.topic}</p>
            </div>
            <span
              className={cn(
                "ml-auto mr-8 rounded-full border px-3 py-1 text-xs font-semibold",
                statusTone[status],
              )}
            >
              {status}
            </span>
          </div>
        </div>

        <Tabs defaultValue="overview" className="gap-0">
          <TabsList className="h-12 w-full justify-stretch rounded-none border-b bg-transparent p-0">
            {[
              { v: "overview", l: "Overview" },
              { v: "comments", l: `Comments (${comments.length})` },
            ].map((t) => (
              <TabsTrigger
                key={t.v}
                value={t.v}
                className="h-12 flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
              >
                {t.l}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="space-y-4 p-6">
            <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
              <span className="text-sm font-semibold">Status</span>
              <div className="flex items-center gap-2">
                <Select value={status} onValueChange={(v) => setStatus(v as EscalationStatus)}>
                  <SelectTrigger className="h-9 w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ESCALATION_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={() => toast.success(`Escalation #${escalation.id} set to ${status}`)}>
                  Update
                </Button>
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="mb-2 text-sm font-semibold">Ticket details</h3>
              <Row label="Campaign" value={escalation.campaign} />
              <Row label="Publisher" value={escalation.publisher} />
              <Row label="Topic" value={escalation.topic} />
              <div className="flex items-center justify-between border-b border-dashed py-2.5">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Risk
                </span>
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                    riskTone[escalation.risk],
                  )}
                >
                  {escalation.risk}
                </span>
              </div>
              <Row label="Reporting" value={escalation.reporting} />
              <Row label="Caller ID" value={escalation.callerId} />
              <Row label="Call ID" value={escalation.callId} />
              <Row label="Escalated to" value={escalation.escalatedTo} />
              <Row label="Issued by" value={escalation.issuedBy} />
              <Row label="Created" value={dt(escalation.created)} />
              <Row label="Updated" value={dt(escalation.updated)} />
            </Card>

            <Card className="p-5">
              <h3 className="mb-2 text-sm font-semibold">Message</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{escalation.message}</p>
            </Card>
          </TabsContent>

          <TabsContent value="comments" className="p-6">
            <Card className="p-5">
              <div className="mb-4 flex items-center gap-2">
                <MessageSquare className="size-4 text-primary" />
                <h3 className="text-sm font-semibold">Comments</h3>
              </div>

              {comments.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No comments yet.</p>
              ) : (
                <ul className="space-y-3">
                  {comments.map((c) => (
                    <li key={c.id} className="rounded-xl border bg-muted/30 p-3">
                      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">{c.author}</span>
                        <span>{dt(c.at)}</span>
                      </div>
                      <p className="text-sm leading-relaxed">{c.body}</p>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-5 space-y-3 border-t pt-4">
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Add a comment..."
                  className="min-h-28"
                />
                <div className="flex justify-end">
                  <Button onClick={addComment} disabled={!draft.trim()}>
                    Add comment
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
