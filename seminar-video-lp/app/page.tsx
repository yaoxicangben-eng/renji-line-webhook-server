import Image from "next/image";
import { headers } from "next/headers";
import { CountdownTimer } from "./components/CountdownTimer";
import { SeminarVideo } from "./components/SeminarVideo";
import lpConfig from "../content/lp-config.json";
import {
  isExpiredAt,
  seminarHeaderNames,
  type SeminarDeadlineState,
} from "../lib/deadline";
import {
  emptyVideoProgress,
  getSeminarVideoProgress,
} from "../lib/supabase-progress";
import { resolveStripePaymentLink } from "../lib/payment";

type ViewMode = "before" | "after" | "expired";

type PageProps = {
  searchParams?: Promise<{
    view?: string;
  }>;
};

export const dynamic = "force-dynamic";

function resolveViewMode(value?: string): ViewMode {
  if (value === "after" || value === "expired") {
    return value;
  }

  return "before";
}

function ImageBanner({
  src,
  alt,
  width,
  height,
  priority = false,
  className = "",
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
  className?: string;
}) {
  return (
    <section
      className={`mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 ${className}`}
    >
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        sizes="(max-width: 1024px) 100vw, 1024px"
        className="block h-auto w-full border border-white/70 shadow-panel"
        priority={priority}
      />
    </section>
  );
}

function ApplyButton({
  href,
  className = "",
  id,
}: {
  href: string;
  className?: string;
  id?: string;
}) {
  return (
    <a
      id={id}
      href={href}
      className={`mx-auto flex min-h-14 w-full max-w-md items-center justify-center bg-leaf px-6 py-4 text-center text-base font-black text-white shadow-action transition hover:bg-leafDark focus:outline-none focus:ring-4 focus:ring-leaf/25 sm:min-h-16 sm:text-lg ${className}`}
    >
      {lpConfig.payment.buttonLabel}
    </a>
  );
}

function Notice() {
  return (
    <section className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8">
      <div className="border-l-4 border-leaf bg-white px-5 py-4 shadow-panel">
        <p className="text-xs font-bold tracking-[0.14em] text-leafDark">
          {lpConfig.notice.title}
        </p>
        {lpConfig.notice.body.map((line, index) => (
          <p
            key={`${index}-${line}`}
            className={`${index === 0 ? "mt-3 font-bold text-ink" : "mt-2 text-slate-600"} text-base leading-7`}
          >
            {line}
          </p>
        ))}
      </div>
    </section>
  );
}

function ProductInfo() {
  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <p className="text-sm font-bold tracking-[0.16em] text-leafDark">
            {lpConfig.product.eyebrow}
          </p>
          <h2 className="mt-3 text-2xl font-black leading-tight text-ink sm:text-3xl">
            {lpConfig.product.name}
          </h2>
          <p className="mt-5 text-base leading-8 text-slate-600">
            {lpConfig.product.description}
          </p>
        </div>
        <div className="border border-line bg-white p-6 shadow-panel">
          <p className="text-sm font-bold text-slate-500">受講価格</p>
          <p className="mt-3 text-4xl font-black leading-none text-leafDark sm:text-5xl">
            {lpConfig.product.price}
          </p>
          <p className="mt-3 text-sm font-bold text-slate-500">
            {lpConfig.product.priceNote}
          </p>
        </div>
      </div>
    </section>
  );
}

function BenefitCards() {
  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-2 sm:px-6 lg:px-8">
      <h2 className="text-2xl font-black text-ink">特典</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {lpConfig.product.benefits.map((benefit) => (
          <article
            key={benefit.title}
            className="rounded-lg border border-line bg-white p-5 shadow-panel"
          >
            <h3 className="text-base font-black leading-6 text-ink">
              {benefit.title}
            </h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              {benefit.text}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function Faq() {
  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <h2 className="text-2xl font-black text-ink">よくある質問</h2>
      <div className="mt-5 divide-y divide-line border-y border-line bg-white shadow-panel">
        {lpConfig.product.faq.map((faq) => (
          <details key={faq.question} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-5 px-5 py-5 text-left text-base font-black text-ink">
              <span>{faq.question}</span>
              <span className="text-2xl leading-none text-leafDark group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="px-5 pb-5 text-sm leading-7 text-slate-600">
              {faq.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}

function StickyApplyButton({ href }: { href: string }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/35 bg-white/90 px-4 py-2 shadow-[0_-10px_30px_rgba(22,30,45,0.12)] backdrop-blur supports-[padding:max(0px)]:pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <ApplyButton href={href} className="min-h-12 max-w-lg py-2 text-sm sm:text-base" />
    </div>
  );
}

function ExpiredView() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 text-center">
      <div>
        <p className="text-3xl font-black text-ink sm:text-4xl">
          {lpConfig.expired.title}
        </p>
        <p className="mt-4 text-base font-bold text-slate-600">
          {lpConfig.expired.message}
        </p>
      </div>
    </main>
  );
}

async function getDeadlineState(): Promise<SeminarDeadlineState> {
  const requestHeaders = await headers();
  const now = new Date();
  const serverNow = now.toISOString();
  const viewerId = requestHeaders.get(seminarHeaderNames.viewerId) ?? "";
  const startedAt = requestHeaders.get(seminarHeaderNames.startedAt) ?? serverNow;
  const expiresAt =
    requestHeaders.get(seminarHeaderNames.expiresAt) ??
    new Date(now.getTime() + lpConfig.timing.accessDurationMinutes * 60 * 1000).toISOString();

  return {
    viewerId,
    startedAt,
    expiresAt,
    isExpired: isExpiredAt(expiresAt, now),
    serverNow,
  };
}

async function getInitialVideoProgress(viewerId: string) {
  try {
    return await getSeminarVideoProgress(viewerId, lpConfig.mux.videoId);
  } catch {
    return emptyVideoProgress(viewerId, lpConfig.mux.videoId);
  }
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const viewMode = resolveViewMode(params?.view);
  const deadline = await getDeadlineState();

  if (viewMode === "expired" || deadline.isExpired) {
    return <ExpiredView />;
  }

  const videoProgress = await getInitialVideoProgress(deadline.viewerId);
  const isAfter = viewMode === "after" || videoProgress.salesUnlocked;
  const stripePaymentLink = resolveStripePaymentLink(lpConfig.payment);

  if (isAfter && stripePaymentLink === "" && process.env.NODE_ENV === "production") {
    throw new Error("Stripe Payment Linkが未設定です。STRIPE_PAYMENT_LINKまたはcontent/lp-config.jsonに設定してください。");
  }

  return (
    <main className={isAfter ? "pb-28" : "pb-10"}>
      <CountdownTimer expiresAt={deadline.expiresAt} serverNow={deadline.serverNow} />
      <ImageBanner
        src={lpConfig.images.beforeVideo.src}
        alt={lpConfig.images.beforeVideo.alt}
        width={lpConfig.images.beforeVideo.width}
        height={lpConfig.images.beforeVideo.height}
        priority
        className="pt-5"
      />
      <SeminarVideo
        initialMaxWatchedSeconds={videoProgress.maxWatchedSeconds}
        initialSalesUnlocked={videoProgress.salesUnlocked}
        playbackId={lpConfig.mux.playbackId}
        placeholderTitle={lpConfig.mux.placeholderTitle}
      />
      <ImageBanner
        src={lpConfig.images.afterVideo.src}
        alt={lpConfig.images.afterVideo.alt}
        width={lpConfig.images.afterVideo.width}
        height={lpConfig.images.afterVideo.height}
        className="pb-6"
      />

      {isAfter ? (
        <>
          <section className="mx-auto w-full max-w-4xl px-4 pb-6 sm:px-6 lg:px-8">
            <ApplyButton href={stripePaymentLink} id="application" />
          </section>
          <Notice />
          <ProductInfo />
          <BenefitCards />
          <Faq />
          <section className="mx-auto w-full max-w-4xl px-4 pb-8 sm:px-6 lg:px-8">
            <ApplyButton href={stripePaymentLink} />
          </section>
          <StickyApplyButton href={stripePaymentLink} />
        </>
      ) : null}
    </main>
  );
}
