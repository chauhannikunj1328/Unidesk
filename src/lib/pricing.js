/** The one source for prices and discounts. Screens never hard-code a price. Amounts are whole cents per user per month. */
export const PRICES = {
  PROPOSALS: 500,
  APPOINTMENT: 500,
  SOP: 500,
  CRM: 599,
  INVOICING: 599,
  WORKDRIVE: 0, // included with CRM
  ACCOUNTING: 2000, // per pack of 3 users
};

/** Bundle discount by number of paid apps (assumption to confirm with the client). */
export function bundleDiscount(paidAppCount) {
  if (paidAppCount >= 7) return 0.25;
  if (paidAppCount >= 5) return 0.2;
  if (paidAppCount >= 3) return 0.15;
  if (paidAppCount >= 2) return 0.1;
  return 0;
}

export const TRIAL_DAYS = 30;
