// ── Manual payment details ──────────────────────────────────────────
// Online checkout was removed. Students pay the monthly fee by EFT to the
// mentor, who then records the payment from the admin panel. Everything
// students see about *how* to pay lives here, so it's edited in one place.

export const PM_FEE = 800;       // Private Mentorship — monthly (ZAR)
export const V1V1_FEE = 2075;    // 1v1 Mentorship — monthly (ZAR)

export const FEE_OF = (plan) => (plan === '1v1' ? V1V1_FEE : PM_FEE);

// Banking details displayed in the in-app payment reminder.
// TODO(Taaha): confirm these — they are shown to every student.
export const BANK = {
  holder: 'Taaha Azzakani',
  bank: 'Bank name',
  accountNumber: '0000000000',
  accountType: 'Cheque',
  branchCode: '000000',
  // What the student should put as their payment reference:
  reference: 'Your full name',
  // Optional line for how to confirm payment (e.g. WhatsApp / email). Leave '' to hide.
  confirmTo: '',
};
