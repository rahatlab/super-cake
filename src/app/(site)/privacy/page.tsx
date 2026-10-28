import type { Metadata } from "next";
import { getStore } from "@/lib/store";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "প্রাইভেসি পলিসি",
  description:
    "Super Cake কীভাবে আপনার ব্যক্তিগত তথ্য সংগ্রহ, ব্যবহার, শেয়ার ও সুরক্ষিত রাখে — WhatsApp automation, order delivery ও data deletion সহ।",
  alternates: { canonical: "/privacy" },
};

export default async function PrivacyPage() {
  const settings = await getStore().getSettings();

  return (
    <LegalPage
      badge="🔒 Privacy Policy"
      title="প্রাইভেসি পলিসি"
      subtitle="Super Cake আপনার তথ্য কীভাবে সংগ্রহ, ব্যবহার ও সুরক্ষিত রাখে।"
      updated="২৬ অক্টোবর ২০২৬"
      settings={settings}
      intro={
        <>
          এই প্রাইভেসি পলিসি <strong className="text-fg">{settings.store_name}</strong> এর website,
          WhatsApp অর্ডার, delivery ও customer support-এ প্রযোজ্য। আমরা আপনার ব্যক্তিগত তথ্যকে
          সম্মান করি এবং শুধু অর্ডার সম্পন্ন করতে, support দিতে ও (আপনার সম্মতিতে) update পাঠাতে
          ব্যবহার করি। This policy explains what we collect, why, and how you can request deletion.
        </>
      }
      sections={[
        {
          title: "আমরা কে / Who we are",
          body: (
            <p>
              {settings.store_name} — {settings.address}. Custom cake অর্ডার, delivery ও WhatsApp
              customer support পরিচালনা করে। যোগাযোগ: {settings.email}, {settings.phone}.
            </p>
          ),
        },
        {
          title: "আমরা কী তথ্য সংগ্রহ করি / Information we collect",
          body: (
            <ul className="list-disc space-y-1 pl-5">
              <li>নাম, ফোন নম্বর, ইমেইল ও delivery address।</li>
              <li>অর্ডার details: cake, size, flavour, message on cake, delivery date/time, note.</li>
              <li>Payment reference: bKash TrxID বা cash-on-delivery status। আমরা card/OTP তথ্য রাখি না।</li>
              <li>WhatsApp messages: আপনি আমাদের WhatsApp নম্বরে পাঠানো message ও আমাদের reply।</li>
              <li>Website usage: cart, session, device/browser তথ্য ও basic analytics (যদি চালু থাকে)।</li>
            </ul>
          ),
        },
        {
          title: "কীভাবে ব্যবহার করি / How we use it",
          body: (
            <ul className="list-disc space-y-1 pl-5">
              <li>অর্ডার গ্রহণ, তৈরি, delivery ও payment verification।</li>
              <li>Order confirmation, status update, delivery ও review request পাঠানো।</li>
              <li>Customer support ও অভিযোগ নিষ্পত্তি।</li>
              <li>আপনার সম্মতি থাকলে WhatsApp reminder, offer বা marketing message।</li>
              <li>Fraud প্রতিরোধ, legal compliance ও service উন্নয়ন।</li>
            </ul>
          ),
        },
        {
          title: "WhatsApp ও Meta / WhatsApp & Meta",
          body: (
            <>
              <p>
                আমরা Meta-র WhatsApp Cloud API ব্যবহার করে অর্ডার update, review request ও (opt-in
                থাকলে) cart reminder পাঠাই। আপনার WhatsApp নম্বর ও message Meta-র মাধ্যমে process
                হয়। Meta-র নিজস্ব privacy policy ও terms প্রযোজ্য।
              </p>
              <p>
                Marketing/reminder message বন্ধ করতে যেকোনো সময় <strong className="text-fg">STOP</strong>{" "}
                লিখে reply করুন। আবার চালু করতে <strong className="text-fg">START</strong> লিখুন।
                Order-related জরুরি message (যেমন delivery update) opt-out-এর পরও পাঠানো হতে পারে।
              </p>
            </>
          ),
        },
        {
          title: "তথ্য শেয়ার / Sharing",
          body: (
            <ul className="list-disc space-y-1 pl-5">
              <li>Supabase — database, file storage ও authentication।</li>
              <li>Vercel — website hosting।</li>
              <li>Meta/WhatsApp — message delivery।</li>
              <li>bKash বা সংশ্লিষ্ট payment provider — payment verification।</li>
              <li>Delivery partner — শুধু delivery সম্পন্ন করার জন্য প্রয়োজনীয় তথ্য।</li>
              <li>Legal authority — আইনগত বাধ্যবাধকতা থাকলে।</li>
            </ul>
          ),
        },
        {
          title: "কুকিজ ও local storage / Cookies",
          body: (
            <p>
              Cart, login session ও theme মনে রাখতে আমরা essential cookies/local storage ব্যবহার করি।
              Analytics cookies (যদি থাকে) শুধু service উন্নয়নের জন্য। আপনি browser থেকে cookies
              মুছে ফেলতে পারেন, তবে cart/session কাজ নাও করতে পারে।
            </p>
          ),
        },
        {
          title: "কতদিন রাখি / Retention",
          body: (
            <p>
              Order ও payment record আইনগত/accounting প্রয়োজনে নির্দিষ্ট সময় রাখা হয়। Marketing
              data opt-out করার পর আর ব্যবহার করা হয় না। WhatsApp message log ও cart lead
              প্রয়োজন শেষ হলে মুছে ফেলা হয়। Data deletion request পেলে ৩০ দিনের মধ্যে ব্যবস্থা নেওয়া হয়।
            </p>
          ),
        },
        {
          title: "নিরাপত্তা / Security",
          body: (
            <p>
              আমরা reasonable technical ও organisational measures ব্যবহার করি — access control,
              encrypted connection ও trusted service provider। তবে internet-এ ১০০% নিরাপত্তা
              নিশ্চিত করা সম্ভব নয়; সন্দেহজনক message/link এড়িয়ে চলুন।
            </p>
          ),
        },
        {
          title: "আপনার অধিকার / Your rights",
          body: (
            <>
              <p>
                আপনি আপনার তথ্য দেখতে, সংশোধন করতে, deletion চাইতে বা marketing opt-out করতে পারেন।
                কীভাবে request করবেন তা <strong className="text-fg">Data Deletion</strong> page-এ দেওয়া আছে।
              </p>
              <p>
                Data Deletion:{" "}
                <a className="font-semibold text-brand-strong underline" href="/data-deletion">
                  /data-deletion
                </a>
              </p>
            </>
          ),
        },
        {
          title: "শিশুদের তথ্য / Children",
          body: (
            <p>
              আমাদের service ১৩ বছরের কম বয়সী শিশুদের জন্য নয়। অভিভাবকের সম্মতি ছাড়া শিশুর
              ব্যক্তিগত তথ্য সংগ্রহ করা হয় না। ভুলবশত সংগ্রহ হলে যোগাযোগ করলে মুছে ফেলা হবে।
            </p>
          ),
        },
        {
          title: "পরিবর্তন / Changes",
          body: (
            <p>
              এই policy সময়ে সময়ে update হতে পারে। বড় পরিবর্তন হলে website-এ notice দেওয়া হবে।
              সর্বশেষ update তারিখ উপরে দেখানো হয়।
            </p>
          ),
        },
      ]}
    />
  );
}
