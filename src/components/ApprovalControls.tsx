"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ApprovalControls({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  async function decide(status: "APPROVED" | "REJECTED" | "MODIFIED") {
    setBusy(true);
    await fetch(`/api/approvals/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status, decisionNote: note }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <input
        className="input flex-1 !py-1 text-xs"
        placeholder="decision note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <button className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-500 disabled:opacity-50" disabled={busy} onClick={() => decide("APPROVED")}>
        Approve
      </button>
      <button className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-500 disabled:opacity-50" disabled={busy} onClick={() => decide("REJECTED")}>
        Reject
      </button>
      <button className="btn-ghost !py-1.5 !text-xs" disabled={busy} onClick={() => decide("MODIFIED")}>
        Modify test
      </button>
    </div>
  );
}
