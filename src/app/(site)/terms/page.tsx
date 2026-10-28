import type { Metadata } from "next";
import { getStore } from "@/lib/store";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "শর্তাবলী",
  description:
    "Super Cake অর্ডার, পেমেন্ট, ডেলিভারি, cancellation, refund, custom cake ও WhatsApp automation-এর শর্তাবলী।",
  alternates: { canonical: "/terms" },
};

export default async function TermsPage() {
  const settings = await getStore().getSettings();

  return (
    <LegalPage
      badge="📜 Terms of Service"
      title="শর্তাবলী"
      subtitle="Super Cake থেকে অর্ডার ও service ব্যবহারের নিয়ম।"
      updated="২৬ অক্টোবর ২০২৬"
      settings={settings}
      intro={
        <>
          এই শর্তাবলী <strong className="text-fg">{settings.store_name}</strong> এর website, WhatsApp
          অর্ডার ও delivery service-এ প্রযোজ্য। অর্ডার confirm করার মাধ্যমে আপনি এই শর্তাবলীতে
          সম্মত হচ্ছেন। কোনো প্রশ্ন থাকলে অর্ডারের আগে আমাদের সাথে যোগাযোগ করুন।
        </>
      }
      sections={[
        {
          title: "অর্ডার / Orders",
          body: (
            <ul className="list-disc space-y-1 pl-5">
              <li>অর্ডার website বা WhatsApp-এর মাধ্যমে নেওয়া হয়।</li>
              <li>Order confirmation message পাওয়ার পর অর্ডার নিশ্চিত считается।</li>
              <li>ভুল নাম, ফোন নম্বর, address বা delivery date দিলে delivery ব্যর্থ হতে পারে; সেক্ষেত্রে additional charge প্রযোজ্য হতে পারে।</li>
              <li>Custom cake-এর জন্য কমপক্ষে ২ দিন আগে অর্ডার করার পরামর্শ দেওয়া হয়।</li>
            </ul>
          ),
        },
        {
          title: "দাম ও পেমেন্ট / Pricing & payment",
          body: (
            <ul className="list-disc space-y-1 pl-5">
              <li>দাম website-এ দেখানো হয়; delivery charge ও promo আলাদাভাবে যোগ/বিয়োগ হতে পারে।</li>
              <li>Payment options: Cash on Delivery ও bKash Send Money (প্রযোজ্য হলে)।</li>
              <li>bKash payment-এর ক্ষেত্রে TrxID যাচাইয়ের পর অর্ডার confirm হয়।</li>
              <li>ভুল/জাল TrxID দিলে অর্ডার বাতিল হতে পারে।</li>
            </ul>
          ),
        },
        {
          title: "ডেলিভারি / Delivery",
          body: (
            <ul className="list-disc space-y-1 pl-5">
              <li>Delivery date/time অর্ডারের সময় নির্বাচন করা হয়; traffic/weather-এর কারণে বিলম্ব হতে পারে।</li>
              <li>Delivery-এর সময় recipient উপস্থিত না থাকলে re-delivery charge প্রযোজ্য হতে পারে।</li>
              <li>Delivery সম্পন্ন হওয়ার পর cake-এর quality সংক্রান্ত অভিযোগ দ্রুত (একই দিনে) জানাতে হবে।</li>
            </ul>
          ),
        },
        {
          title: "বাতিল ও রিফান্ড / Cancellation & refund",
          body: (
            <ul className="list-disc space-y-1 pl-5">
              <li>Custom cake তৈরি শুরু হওয়ার পর সাধারণত cancellation গ্রহণ করা হয় না।</li>
              <li>আমাদের ভুলে অর্ডার বাতিল/ভুল cake delivered হলে যুক্তিসঙ্গত replacement বা refund দেওয়া হবে।</li>
              <li>Refund সময় payment method ও provider-এর উপর নির্ভর করে; সাধারণত ৭–১০ কর্মদিবস লাগতে পারে।</li>
              <li>Change of mind-এর ক্ষেত্রে refund শুধু আমাদের সম্মতিতে ও খরচ বাদ দিয়ে হতে পারে।</li>
            </ul>
          ),
        },
        {
          title: "Custom cake / কাস্টম ডিজাইন",
          body: (
            <ul className="list-disc space-y-1 pl-5">
              <li>Reference image/design শুধু inspiration হিসেবে ব্যবহৃত হয়; হাতে বানানো হওয়ায় হুবহু মিল নাও থাকতে পারে।</li>
              <li>Allergen (nuts, dairy, gluten, eggs) থাকলে অর্ডারের আগে জানাতে হবে।</li>
              <li>কেকের উপরের লেখা/ডিজাইন আমাদের যুক্তিসঙ্গত বিবেচনায় করা হয়; অস্পষ্ট বা inappropriate request বাতিল হতে পারে।</li>
            </ul>
          ),
        },
        {
          title: "অ্যাকাউন্ট ও নিরাপত্তা / Account & security",
          body: (
            <p>
              Account থাকলে আপনার login তথ্য গোপন রাখুন। আপনার account দিয়ে করা অর্ডার/কার্যক্রমের
              দায়িত্ব আপনার। সন্দেহজনক activity দেখলে সাথে সাথে আমাদের জানান।
            </p>
          ),
        },
        {
          title: "গ্রহণযোগ্য ব্যবহার / Acceptable use",
          body: (
            <ul className="list-disc space-y-1 pl-5">
              <li>Website/WhatsApp-এ ভুয়া অর্ডার, spam, abusive বা unlawful message পাঠানো নিষিদ্ধ।</li>
              <li>আমাদের content, ছবি বা logo অনুমতি ছাড়া commercial ব্যবহার করা যাবে না।</li>
              <li>Automation/webhook-এর মাধ্যমে system-এ আক্রমণ বা unauthorized access চেষ্টা নিষিদ্ধ।</li>
            </ul>
          ),
        },
        {
          title: "দায়সীমা / Liability",
          body: (
            <p>
              আমরা reasonable যত্ন নিয়ে cake তৈরি ও delivery করি। তবে আমাদের নিয়ন্ত্রণের বাইরে
              থাকা কারণ (যেমন traffic, weather, third-party delivery, payment provider downtime)
              থেকে হওয়া ক্ষতির জন্য দায়সীমা প্রযোজ্য আইনের আওতায় সীমিত। কোনো indirect বা
              consequential loss-এর জন্য দায় নেওয়া হয় না, যেখানে আইন অনুমতি দেয়।
            </p>
          ),
        },
        {
          title: "বৌদ্ধিক সম্পত্তি / Intellectual property",
          body: (
            <p>
              Website-এর text, ছবি, design, logo ও recipe content {settings.store_name}-এর
              সম্পত্তি। অনুমতি ছাড়া copy, reproduce বা commercial ব্যবহার করা যাবে না।
            </p>
          ),
        },
        {
          title: "প্রযোজ্য আইন / Governing law",
          body: (
            <p>
              এই শর্তাবলী বাংলাদেশের আইন দ্বারা পরিচালিত। বিরোধ হলে প্রথমে আমাদের সাথে আলোচনার
              মাধ্যমে সমাধানের চেষ্টা করা হবে; প্রয়োজনে বাংলাদেশের competent court-এ নেওয়া যাবে।
            </p>
          ),
        },
        {
          title: "পরিবর্তন / Changes",
          body: (
            <p>
              আমরা সময়ে সময়ে এই শর্তাবলী update করতে পারি। বড় পরিবর্তন হলে website-এ notice দেওয়া
              হবে। update-এর পর service ব্যবহার চালিয়ে গেলে নতুন শর্তাবলী গ্রহণ করা হয়েছে বলে ধরা হবে।
            </p>
          ),
        },
      ]}
    />
  );
}
