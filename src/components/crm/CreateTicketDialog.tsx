import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const TOPICS = [
  "Lead quality",
  "Billing dispute",
  "Call recording issue",
  "Fraud / fake customer",
  "Duplicate call",
  "Agent behaviour",
  "Technical / routing",
];
const PRIORITIES = ["Low", "Medium", "High", "Urgent"];
const REPORTING = ["Publisher", "Buyer", "Internal QA", "Compliance"];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign?: string;
  callId?: string;
};

export function CreateTicketDialog({ open, onOpenChange, campaign, callId }: Props) {
  const [topic, setTopic] = useState<string>("");
  const [priority, setPriority] = useState<string>("");
  const [reporting, setReporting] = useState<string>("");
  const [email, setEmail] = useState("");
  const [cc, setCc] = useState("");
  const [message, setMessage] = useState("");

  const submit = () => {
    if (!topic || !priority || !email) {
      toast.error("Topic, priority and email are required");
      return;
    }
    toast.success("Ticket sent", { description: `${topic} · ${priority} priority` });
    onOpenChange(false);
    setTopic("");
    setPriority("");
    setReporting("");
    setEmail("");
    setCc("");
    setMessage("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Create Ticket</DialogTitle>
          <DialogDescription className="space-y-0.5 text-xs">
            {campaign ? <span className="block">Campaign: {campaign}</span> : null}
            {callId ? <span className="block">Call ID: {callId}</span> : null}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Topic</Label>
            <Select value={topic} onValueChange={setTopic}>
              <SelectTrigger>
                <SelectValue placeholder="Select topic" />
              </SelectTrigger>
              <SelectContent>
                {TOPICS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Reporting</Label>
              <Select value={reporting} onValueChange={setReporting}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reporting" />
                </SelectTrigger>
                <SelectContent>
                  {REPORTING.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input
              type="email"
              placeholder="recipient@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>
              CC <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              placeholder="cc1@example.com, cc2@example.com"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Separate multiple addresses with commas.</p>
          </div>

          <div className="space-y-1.5">
            <Label>Ticket Message</Label>
            <Textarea
              rows={5}
              placeholder="Please check lead quality for the last 24 hours..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={submit}>Send Ticket</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
