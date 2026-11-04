import { Check, CircleDashed, Clock, Eye, Mail, PenLine, Send, X, TriangleAlert, Ban } from "lucide-react";
import { Chip } from "./Chip";

/** Status to word, tone and Lucide icon. Always shows the word. */
const STATUS = {
  active: { label: "Active", tone: "success", icon: Check },
  invited: { label: "Invited", tone: "accent", icon: Mail },
  inactive: { label: "Inactive", tone: "neutral", icon: Ban },
  draft: { label: "Draft", tone: "neutral", icon: CircleDashed },
  sent: { label: "Sent", tone: "accent", icon: Send },
  viewed: { label: "Viewed", tone: "accent", icon: Eye },
  signed: { label: "Signed", tone: "success", icon: PenLine },
  declined: { label: "Declined", tone: "danger", icon: X },
  expired: { label: "Expired", tone: "warning", icon: Clock },
  paid: { label: "Paid", tone: "success", icon: Check },
  overdue: { label: "Overdue", tone: "danger", icon: TriangleAlert },
};

export function StatusChip({ status }) {
  const s = STATUS[status];
  if (!s) return <Chip>Unknown</Chip>;
  return (
    <Chip tone={s.tone} icon={s.icon}>
      {s.label}
    </Chip>
  );
}
