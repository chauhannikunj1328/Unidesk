import { withOrg } from "@/server/db";
import { requireAccess } from "@/server/access";
import { writeAudit } from "@/server/audit";
import { APP_LIST, appByCode } from "@/lib/apps";
import { APP_DESCRIPTIONS, DATA_LABELS, DATA_TYPES, applyChange, countOn, defaultsFor, sameSettings } from "./shared-data-rules";

/**
 * Shared data: which apps may read contacts, clients and projects (Hub flow 09). Owners and admins only.
 * One implementation for every theme. Turning a switch off never deletes data; the app just stops reading it.
 * Results are { ok: true, ... } or { ok: false, error: "plain words" }.
 */

const fail = (error) => ({ ok: false, error });
const ADMINS = ["OWNER", "ADMIN"];

const pick = (row) => ({ contacts: row.contacts, clients: row.clients, projects: row.projects });

/** Every app with its saved settings (or the defaults when nothing was saved yet). */
export async function getSharedData(session) {
  requireAccess(session, { roles: ADMINS });
  const db = withOrg(session);
  const rows = await db.sharedDataSetting.findMany({});
  const byApp = new Map(rows.map((r) => [r.app, pick(r)]));
  const apps = APP_LIST.map((a) => {
    const settings = byApp.get(a.code) ?? defaultsFor(a.code);
    return { code: a.code, label: a.label, description: APP_DESCRIPTIONS[a.code], dot: a.dot, settings, count: countOn(settings) };
  });
  const columns = Object.fromEntries(DATA_TYPES.map((t) => [t, apps.filter((a) => a.settings[t]).length]));
  return { apps, columns, total: apps.length };
}

async function currentFor(db, app) {
  const row = await db.sharedDataSetting.findFirst({ where: { app } });
  return row ? pick(row) : defaultsFor(app);
}

/** Saves a full set of three switches for one app, and writes one audit event per switch that changed. */
async function save(session, app, values) {
  const db = withOrg(session);
  const before = await currentFor(db, app);
  if (sameSettings(before, values)) return { changed: [], before };
  const existing = await db.sharedDataSetting.findFirst({ where: { app } });
  if (existing) {
    await db.sharedDataSetting.updateMany({ where: { app }, data: values });
  } else {
    try {
      await db.sharedDataSetting.create({ data: { app, ...values } });
    } catch (e) {
      if (e?.code !== "P2002") throw e; // two people saving at once: the other row won, so update it
      await db.sharedDataSetting.updateMany({ where: { app }, data: values });
    }
  }
  const label = appByCode(app).label;
  const changed = DATA_TYPES.filter((t) => before[t] !== values[t]);
  for (const t of changed) {
    const what = DATA_LABELS[t].toLowerCase();
    await writeAudit(session, {
      action: values[t] ? "team.shared_data_on" : "team.shared_data_off",
      entityType: "shared_data",
      entityId: app,
      summary: values[t] ? `${session.name} let ${label} read ${what}` : `${session.name} stopped ${label} from reading ${what}`,
      meta: { app, type: t, enabled: values[t] },
    });
  }
  return { changed, before };
}

/** One switch. Projects and Clients move together (see applyChange). */
export async function changeSharedData(session, { app, type, enabled }) {
  requireAccess(session, { roles: ADMINS });
  if (!appByCode(app) || !DATA_TYPES.includes(type)) return fail("That setting does not exist.");
  const db = withOrg(session);
  const { next, note } = applyChange(await currentFor(db, app), type, enabled);
  const { changed, before } = await save(session, app, next);
  return { ok: true, changed: changed.length > 0, app, label: appByCode(app).label, settings: next, previous: before, note: changed.length > 1 ? note : null };
}

/** Undo: put all three switches of one app back exactly as they were. */
export async function restoreSharedData(session, { app, values }) {
  requireAccess(session, { roles: ADMINS });
  if (!appByCode(app)) return fail("That app does not exist.");
  // Projects can never be on without Clients, even if someone sends a made-up set of values.
  const safe = { contacts: values.contacts, clients: values.clients || values.projects, projects: values.projects };
  const { changed } = await save(session, app, safe);
  return { ok: true, changed: changed.length > 0, app, label: appByCode(app).label, settings: safe };
}
