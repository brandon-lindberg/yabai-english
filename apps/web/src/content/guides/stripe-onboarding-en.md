# Setting up Stripe as a teacher

Before students can pay you, Stripe needs to verify who you are. Stripe is the payment company that handles the money — English Studio Japan never sees your card or bank details.

This guide walks through every question Stripe asks, in the order you will meet them. Most of it is your own information. A few questions are about *this website*, and those have one correct answer for everyone — those are the ones people get stuck on, so they are spelled out below.

**Answer every question truthfully.** These are legal declarations. Where a question depends on your own circumstances, this guide tells you how to think about it rather than what to write.

---

## Before you start

Have these to hand. Missing one of them is the usual reason someone has to stop halfway and come back:

- **A photo ID** — driver's licence, passport, or My Number card
- **Your bank account details** — branch name, account number, and the account holder's name as the bank has it
- **Your address** in Japanese, including the katakana reading
- **A phone number** that can receive an SMS

---

## 1. Creating or reusing a Stripe account

If you have used Stripe before with the same email address, you will see a screen offering to **reuse details from an existing account**.

Choosing it copies your name, address, and bank details across so you do not retype them. It does **not** merge the two accounts — you end up with a separate account for teaching, which is what you want. Choosing "create a new account" instead simply means typing the same details in by hand.

Either option is safe. Reusing is faster.

---

## 2. Business type: individual or company

Pick **Individual (個人事業主)** unless you have registered a company (株式会社, 合同会社, etc.).

Teaching as yourself, even with a lot of students, is "individual". Choosing "company" when you do not have one will fail verification, because Stripe looks for a corporate registration number that does not exist.

---

## 3. Your personal details

- **Legal name** — exactly as it appears on your ID, not a nickname or an English spelling if your ID is in Japanese
- **Name in katakana** — the reading of your name. Required for Japanese accounts
- **Date of birth** — as on your ID
- **Home address** — your registered address, including the katakana reading of the building name if it has one
- **Phone number** — must be able to receive an SMS code during setup

The single most common cause of a failed verification is a name that does not match the ID document exactly. If your ID says 山田 太郎, write 山田 太郎 — not Taro Yamada.

---

## 4. About your business

**Industry / business category.** Choose the education category — "Educational services" or 教育サービス. If you are asked for a more specific option, language instruction or tutoring is the closest fit.

**Product description.** Describe what students actually pay for. Something like:

> Online and in-person English lessons booked through English Studio Japan. Students pay per lesson.

Vague descriptions ("consulting", "services") slow reviews down, because a human has to work out what you sell.

**Business website.** Use `https://www.englishstudiojapan.com` — this is where your lessons are sold and paid for. You do not need a website of your own.

---

## 5. Payout bank account

This is where your earnings land. It must be a **Japanese yen account in your own name** — Stripe cannot pay out to someone else's account, including a spouse's.

The account holder name usually has to be entered in katakana, matching the bank's records exactly. If the bank writes it as ﾔﾏﾀﾞ ﾀﾛｳ, small differences in spacing will cause a rejection.

---

## 6. Identity verification

Stripe will ask you to upload or photograph your ID. Two things make this fail more often than anything else:

- **Glare or blur.** Photograph it flat, in even light, with no flash reflection.
- **Cropped edges.** All four corners must be inside the frame.

If your address has changed since the ID was issued, expect Stripe to ask for a second document showing your current address.

---

## 7. The security questions (Japan only)

Japanese law — the Installment Sales Act (割賦販売法) — requires anyone accepting card payments to declare what security measures protect the payment process. Stripe asks these as a checklist.

**These questions are about the website where payments happen, which is English Studio Japan — not about your home computer or your own website.** That is why there is one correct answer for every teacher here.

### "Provide details about your login security measures"

Sign-in to English Studio Japan is handled entirely by **Google (Google OAuth)**. There is no password on this platform — none is created, and none is stored. That means the login protections are Google's.

Check these three:

- ✅ **Two-factor or multi-factor authentication for identity verification** — sign-in goes through Google, which provides 2FA
- ✅ **Verification of personal information at time of user registration** — registration uses a Google-verified email address; a self-declared address is never accepted
- ✅ **Other countermeasures** — and if a text box appears, paste:

> 認証はすべて Google OAuth (OpenID Connect) に委譲しており、当プラットフォームではパスワードを保存していません。多要素認証、不審なログインの検知、ログイン試行回数の制限、新しいデバイスからのログイン通知は Google 側で提供されます。

Leave the others unchecked. In particular, do **not** check "Email/SMS notification at login" — English Studio Japan does not send login emails, and "Not applicable: no user login function" is untrue since the platform does have sign-in.

### Other questions in the same set

Stripe may ask further questions about how card details are handled or how unauthorised use is prevented. The relevant fact for all of them: **card details are entered on Stripe's own hosted checkout page and never touch English Studio Japan's servers.** Answer from that starting point, and truthfully for anything that concerns your own working practices.

---

## 8. Accepting the terms

The final screen shows the **Connected Account Agreement**. Clicking "Agree and continue" is what accepts Stripe's terms — until you do, your account stays restricted and shows "Accept terms of service" as past due.

You may also see a note that **Radar** fraud screening is enabled at a small fee per screened transaction. This is normal fraud protection. You can change it under "Edit details" if you would rather not have it.

---

## 9. What happens next

When you finish, Stripe reviews your account before switching payments on. Under the Installment Sales Act this review is routine for Japanese accounts — **it does not mean anything is wrong.**

- Reviews usually finish within a few business days (Stripe often quotes 3–4)
- You will often see **payouts active** but **payments paused** during this period — this is the normal in-between state
- **There is nothing to do while you wait.** Do not re-submit or create a second account

Once Stripe approves the account, paid lessons turn on automatically and you can publish your availability.

---

## If something goes wrong

**"Stripe needs more information."** Something is genuinely missing. Open Stripe and the outstanding item will be listed at the top.

**"Stripe has restricted your account."** This one does not clear by waiting. Sign in to your Stripe dashboard and contact Stripe support — they can tell you the reason, which for privacy reasons they do not share with us.

**The review is taking much longer than a week.** Contact Stripe support directly. We can see your account's status but cannot influence or speed up a review.
