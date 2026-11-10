import type { Metadata } from "next";

import { LegalPage } from "@/components/legal-page";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="10 November 2026">
      <p>
        {site.name} is a small expense-splitting app built as a personal portfolio project. This page explains what
        data it stores and why.
      </p>

      <section className="grid gap-2">
        <h2>What we store</h2>
        <ul>
          <li>
            <strong>Your account:</strong> your email address and, if you sign in with Google, your name and profile
            picture as provided by Google. This is handled by our authentication provider, Supabase.
          </li>
          <li>
            <strong>What you enter:</strong> group names, member names, expenses (amounts, notes, dates) and how they
            are split.
          </li>
        </ul>
        <p>
          Group members don&apos;t have accounts. They are just names the organizer types in, and we don&apos;t collect
          anything from people who open a share link.
        </p>
      </section>

      <section className="grid gap-2">
        <h2>How it&apos;s used</h2>
        <p>
          Only to run the app: logging you in, showing your groups, calculating balances, and serving share links. We
          don&apos;t sell or share your data, show ads, or use tracking or analytics cookies. The only cookies are the
          ones that keep you logged in.
        </p>
      </section>

      <section className="grid gap-2">
        <h2>Who can see it</h2>
        <ul>
          <li>Only you, as the organizer, can see and edit your groups.</li>
          <li>
            Each share link shows one member their own balance and the expenses they&apos;re part of, to anyone who
            has the link. You can reset a link at any time to stop the old one working.
          </li>
        </ul>
      </section>

      <section className="grid gap-2">
        <h2>Where it&apos;s stored</h2>
        <p>
          Data is stored with Supabase (database and authentication) and the app is hosted on Vercel. Both act as
          service providers.
        </p>
      </section>

      <section className="grid gap-2">
        <h2>Deleting your data</h2>
        <p>
          Deleting a group permanently deletes its members, expenses and share links. To delete your account entirely,
          get in touch through the contact link below and it will be removed.
        </p>
      </section>

      <section className="grid gap-2">
        <h2>Contact</h2>
        <p>
          Questions or requests: <a href="https://github.com/HassanAmjad7543">github.com/HassanAmjad7543</a>.
        </p>
      </section>
    </LegalPage>
  );
}
