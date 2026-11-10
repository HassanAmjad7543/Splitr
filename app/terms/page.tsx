import type { Metadata } from "next";

import { LegalPage } from "@/components/legal-page";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="10 November 2026">
      <p>
        {site.name} is a free personal portfolio project for keeping track of shared expenses. By using it you agree
        to these terms.
      </p>

      <section className="grid gap-2">
        <h2>Use it fairly</h2>
        <ul>
          <li>Use it for its purpose: tracking who owes whom in a group.</li>
          <li>Don&apos;t try to access other people&apos;s data or disrupt the service.</li>
          <li>Only add people to a group if you&apos;re happy sharing their name and balance with them.</li>
        </ul>
      </section>

      <section className="grid gap-2">
        <h2>No guarantees</h2>
        <p>
          The app is provided as is, without warranties. Balances are calculated from what you enter, so double-check
          anything important. {site.name} doesn&apos;t move money and isn&apos;t responsible for payments between people.
          The service may change or be shut down at any time.
        </p>
      </section>

      <section className="grid gap-2">
        <h2>Your data</h2>
        <p>
          What you enter stays yours. See the <a href="/privacy">Privacy Policy</a> for what is stored and how to
          delete it.
        </p>
      </section>
    </LegalPage>
  );
}
