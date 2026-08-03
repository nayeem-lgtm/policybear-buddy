import { Link } from "@tanstack/react-router";
import {
  Coffee,
  FileUp,
  LogIn,
  LogOut,
  Megaphone,
  Plus,
  PhoneForwarded,
  ReceiptText,
  ShieldCheck,
  Siren,
  Sparkles,
  UserPlus,
  UtensilsCrossed,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useShift } from "@/context/ShiftContext";

/** Persistent lower-right quick-action button (global framework spec). */
export function QuickActionButton() {
  const { setStatus } = useShift();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          className="fixed right-5 bottom-5 z-50 size-12 rounded-full shadow-brand"
          aria-label="Quick actions"
        >
          <Plus className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="w-60">
        <DropdownMenuLabel>Shift</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => setStatus("Available", "Signed in")}>
          <LogIn className="size-4" /> Sign In
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setStatus("Break")}>
          <Coffee className="size-4" /> Start Break
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setStatus("Lunch")}>
          <UtensilsCrossed className="size-4" /> Start Lunch
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setStatus("Available")}>
          <Play className="size-4" /> Return
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setStatus("Signed Out", "Signed out")}>
          <LogOut className="size-4" /> Sign Out
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Create</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link to="/customers/new">
            <UserPlus className="size-4" /> Add Customer
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/callbacks">
            <PhoneForwarded className="size-4" /> Schedule Callback
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/quotes">
            <Sparkles className="size-4" /> Pull Quotes
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/qa">
            <ShieldCheck className="size-4" /> Start QA Review
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/incidents">
            <Siren className="size-4" /> Report Incident
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/announcements">
            <Megaphone className="size-4" /> Create Announcement
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/expenses">
            <ReceiptText className="size-4" /> Add Expense
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/admin/imports">
            <FileUp className="size-4" /> Import Data
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
