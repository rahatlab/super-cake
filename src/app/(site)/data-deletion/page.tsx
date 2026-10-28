import type { Metadata } from "next";
import { getStore } from "@/lib/store";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "ডেটা ডিলিট অনুরোধ",
  description:
    "Super Cake থেকে আপনার ব্যক্তিগত তথ্য ডিলিট করার নিয়ম — Meta data deletion instructions, WhatsApp/email request ও ৩০ দিনের timeline।",
  alternates: { canonical: "/data-deletion" },
};

export default async function DataDeletionPage() {
  const settings = await getStore().getSettings();
  const wa = settings.whatsapp_phone.replace(/\D/g, "");

  return (
    <LegalPage
      badge="🗑️ Data Deletion"
      title="ডেটা ডিলিট অনুরোধ"
      subtitle="Your data deletion instructions for Super Cake and Meta."
      updated="২৬ অক্টোবর ২০২৬"
      settings={settings}
      intro={
        <>
          <p className="font-semibold text-fg">English summary</p>
          <p className="mt-1">
            To request deletion of your Super Cake data, email{" "}
            <a className="font-semibold text-brand-strong underline" href={`mailto:${settings.email}`}>
              {settings.email}
            </a>{" "}
            or WhatsApp{" "}
            <a
              className="font-semibold text-brand-strong underline"
              href={`https://wa.me/${wa}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {settings.phone}
            </a>{" "}
            with your name and the phone number used for ordering. We respond within 30 days.
          </p>
        </>
      }
      sections={[
        {
          title: "কীভাবে অনুরোধ করবেন / How to request deletion",
          body: (
            <>
              <p>নিচের যেকোনো একটি উপায়ে request করুন:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  Email:{" "}
                  <a className="font-semibold text-brand-strong underline" href={`mailto:${settings.email}?subject=Data%20Deletion%20Request`}>
                    {settings.email}
                  </a>{" "}
                  — subject: <strong className="text-fg">Data Deletion Request</strong>
                </li>
                <li>
                  WhatsApp:{" "}
                  <a
                    className="font-semibold text-brand-strong underline"
                    href={`https://wa.me/${wa}?text=${encodeURIComponent("Data Deletion Request")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {settings.phone}
                  </a>
                </li>
              </ul>
              <p>
                message-এ আপনার <strong className="text-fg">নাম</strong>, অর্ডারে ব্যবহৃত{" "}
                <strong className="text-fg">ফোন নম্বর</strong> ও (থাকলে) order number দিন। অতিরিক্ত
                verification প্রয়োজন হতে পারে যাতে ভুল ব্যক্তির তথ্য মুছে না যায়।
              </p>
            </>
          ),
        },
        {
          title: "কী ডিলিট করা হবে / What we delete",
          body: (
            <ul className="list-disc space-y-1 pl-5">
              <li>Customer profile ও account তথ্য (থাকলে)।</li>
              <li>WhatsApp marketing/reminder opt-in ও cart lead।</li>
              <li>Marketing message history ও অপ্রয়োজনীয় WhatsApp log।</li>
              <li>আপনার request অনুযায়ী অন্যান্য personal data, যেখানে আইনগত বাধা নেই।</li>
            </ul>
          ),
        },
        {
          title: "কী রাখা হতে পারে / What we may retain",
          body: (
            <p>
              Completed order ও payment record (invoice/accounting, tax, fraud prevention বা legal
              obligation) নির্দিষ্ট সময় রাখা হতে পারে। এ ক্ষেত্রে শুধু প্রয়োজনীয় তথ্য রাখা হয় এবং
              marketing-এ ব্যবহার করা হয় না। আইনগতভাবে রাখতে বাধ্য এমন তথ্য deletion request-এ
              মুছে ফেলা যাবে না।
            </p>
          ),
        },
        {
          title: "কত সময় লাগবে / Timeline",
          body: (
            <p>
              আমরা সাধারণত <strong className="text-fg">৩০ দিনের মধ্যে</strong> request process করি।
              verification সম্পন্ন হলে confirmation পাঠানো হবে। জটিল বা আইনগত review প্রয়োজন হলে
              সময় বেশি লাগতে পারে, সেক্ষেত্রে জানানো হবে।
            </p>
          ),
        },
        {
          title: "Marketing বন্ধ করা / Opt out",
          body: (
            <p>
              শুধু marketing/reminder বন্ধ করতে চাইলে WhatsApp-এ <strong className="text-fg">STOP</strong>{" "}
              লিখে reply করুন। এটি order-related জরুরি message বন্ধ করে না। আবার চালু করতে{" "}
              <strong className="text-fg">START</strong> লিখুন।
            </p>
          ),
        },
        {
          title: "তৃতীয় পক্ষ / Third parties",
          body: (
            <p>
              আমরা Supabase (database/storage), Vercel (hosting), Meta/WhatsApp (messaging) ও
              payment provider ব্যবহার করি। আপনার deletion request প্রযোজ্য হলে সংশ্লিষ্ট
              provider-এর কাছে necessary request পাঠানো হয়। তাদের নিজস্ব retention policy প্রযোজ্য
              হতে পারে।
            </p>
          ),
        },
        {
          title: "Meta data deletion URL",
          body: (
            <p>
              এই page-টিই Meta App-এর <strong className="text-fg">Data Deletion Instructions URL</strong>{" "}
              হিসেবে ব্যবহার করা যাবে। Meta app-এর মাধ্যমে সংগৃহীত data deletion request-এর জন্য
              উপরের email/WhatsApp ব্যবহার করুন।
            </p>
          ),
        },
      ]}
    />
  );
}
