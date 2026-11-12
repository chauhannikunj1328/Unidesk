import { deliverInvitesAction, undoInvitesAction } from "../invite-actions";
import { UNDO_SECONDS } from "../invite-rules";

/**
 * After "Send", the email goes out when the Undo time has passed. The timer lives here, not in the drawer, so it still
 * fires if the drawer is gone or the person moves to another page. (If the tab closes first, the Team page sends it
 * the next time anyone opens it.)
 */
const timers = new Map();

export function scheduleDelivery(batchId) {
  clearTimeout(timers.get(batchId));
  timers.set(
    batchId,
    setTimeout(async () => {
      timers.delete(batchId);
      try { await deliverInvitesAction({ batchId }); } catch { /* the Team page sends it later */ }
    }, UNDO_SECONDS * 1000 + 400)
  );
}

export function cancelDelivery(batchId) {
  clearTimeout(timers.get(batchId));
  timers.delete(batchId);
}

/** Takes the send back. Returns the server's answer. */
export async function undoSend(batchId) {
  cancelDelivery(batchId);
  return undoInvitesAction({ batchId });
}
