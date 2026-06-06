import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getServerSession } from "@/lib/get-session";
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  CreditCard,
  Gauge,
  KeyRound,
  ReceiptText,
  TrendingUp,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import { unauthorized } from "next/navigation";

export const metadata: Metadata = {
  title: "Billing",
};

export const dynamic = "force-dynamic";

const OPENAI_BASE_URL = "https://api.openai.com/v1";

type CostResult = {
  amount?: {
    currency?: string;
    value?: number | string;
  };
  line_item?: string | null;
  project_id?: string | null;
  quantity?: number | null;
};

type UsageResult = {
  input_tokens?: number;
  input_cached_tokens?: number;
  output_tokens?: number;
  num_model_requests?: number;
  model?: string | null;
};

type UsageBucket<T> = {
  start_time: number;
  end_time: number;
  results?: T[];
  result?: T[];
};

type OpenAIPage<T> = {
  data?: UsageBucket<T>[];
  has_more?: boolean;
  next_page?: string | null;
};

type LineItemSummary = {
  name: string;
  amount: number;
  quantity: number | null;
};

type ModelUsageSummary = {
  model: string;
  requests: number;
  inputTokens: number;
  cachedTokens: number;
  outputTokens: number;
};

type BillingData =
  | {
      status: "ready";
      creditLimit: number | null;
      currency: string;
      totalCost: number;
      remainingCredit: number | null;
      usagePercent: number | null;
      dailyCosts: Array<{ date: string; amount: number }>;
      lineItems: LineItemSummary[];
      modelUsage: ModelUsageSummary[];
      periodStart: Date;
      periodEnd: Date;
    }
  | {
      status: "missing_key" | "missing_scope" | "error";
      creditLimit: number | null;
      currency: string;
      message: string;
      periodStart: Date;
      periodEnd: Date;
    };

export default async function BillingPage() {
  const session = await getServerSession();
  const user = session?.user;

  if (!user) unauthorized();

  if (user.role !== "admin" && user.role !== "owner") {
    return <BillingAccessDenied />;
  }

  const billing = await loadBillingData();

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-3 py-4 sm:px-5 lg:px-8">
      <section className="rounded-lg border bg-background px-4 py-4 shadow-xs sm:px-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-md border bg-muted">
              <CreditCard className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold tracking-normal sm:text-2xl">
                  Billing
                </h1>
                <Badge variant="secondary">
                  {formatDate(billing.periodStart)} -{" "}
                  {formatDate(billing.periodEnd)}
                </Badge>
              </div>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Buget setat manual, costuri OpenAI raportate de API și consum
                pe servicii.
              </p>
            </div>
          </div>

          <Button asChild variant="outline" className="justify-center">
            <a
              href="https://platform.openai.com/usage"
              target="_blank"
              rel="noreferrer"
            >
              OpenAI Usage
              <ArrowUpRight className="size-4" />
            </a>
          </Button>
        </div>
      </section>

      {billing.status !== "ready" && <BillingSetupNotice billing={billing} />}

      <BillingOverview billing={billing} />

      <BillingClarification billing={billing} />

      {billing.status === "ready" && (
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
          <DailyCostsPanel
            dailyCosts={billing.dailyCosts}
            currency={billing.currency}
          />
          <LineItemsPanel
            lineItems={billing.lineItems}
            currency={billing.currency}
          />
          <ModelUsagePanel modelUsage={billing.modelUsage} />
        </section>
      )}
    </main>
  );
}

async function loadBillingData(): Promise<BillingData> {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = now;
  const startTime = toUnixSeconds(periodStart);
  const endTime = toUnixSeconds(periodEnd);
  const configuredCurrency = normalizeCurrency(
    process.env.OPENAI_BILLING_CURRENCY,
  );
  const creditLimit = parseCreditLimit(process.env.OPENAI_BILLING_CREDIT_LIMIT);
  const adminKey = process.env.OPENAI_ADMIN_KEY;

  if (!adminKey) {
    return {
      status: "missing_key",
      creditLimit,
      currency: configuredCurrency,
      message:
        "Lipsește OPENAI_ADMIN_KEY. Billing-ul OpenAI nu poate fi citit cu OPENAI_API_KEY normală.",
      periodStart,
      periodEnd,
    };
  }

  try {
    const [costsPage, usagePage] = await Promise.all([
      fetchOpenAIAdminPage<CostResult>(adminKey, "/organization/costs", {
        start_time: startTime,
        end_time: endTime,
        bucket_width: "1d",
        limit: 31,
        "group_by[]": "line_item",
      }),
      fetchOpenAIAdminPage<UsageResult>(
        adminKey,
        "/organization/usage/completions",
        {
          start_time: startTime,
          end_time: endTime,
          bucket_width: "1d",
          limit: 31,
          "group_by[]": "model",
        },
      ).catch(() => null),
    ]);

    const costBuckets = costsPage.data ?? [];
    const firstCurrency =
      costBuckets
        .flatMap((bucket) => bucket.results ?? bucket.result ?? [])
        .find((result) => result.amount?.currency)?.amount?.currency ??
      configuredCurrency;
    const currency = normalizeCurrency(firstCurrency);
    const dailyCosts = costBuckets.map((bucket) => ({
      date: formatDate(new Date(bucket.start_time * 1000)),
      amount: sumCosts(bucket.results ?? bucket.result ?? []),
    }));
    const totalCost = dailyCosts.reduce((total, day) => total + day.amount, 0);
    const lineItems = summarizeLineItems(costBuckets);
    const modelUsage = usagePage ? summarizeModelUsage(usagePage.data ?? []) : [];
    const remainingCredit =
      creditLimit === null ? null : Math.max(creditLimit - totalCost, 0);
    const usagePercent =
      creditLimit && creditLimit > 0
        ? Math.min((totalCost / creditLimit) * 100, 100)
        : null;

    return {
      status: "ready",
      creditLimit,
      currency,
      totalCost,
      remainingCredit,
      usagePercent,
      dailyCosts,
      lineItems,
      modelUsage,
      periodStart,
      periodEnd,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Costurile OpenAI nu au putut fi citite.";

    return {
      status: message.includes("api.usage.read") ? "missing_scope" : "error",
      creditLimit,
      currency: configuredCurrency,
      message,
      periodStart,
      periodEnd,
    };
  }
}

async function fetchOpenAIAdminPage<T>(
  apiKey: string,
  path: string,
  params: Record<string, string | number>,
) {
  const buckets: UsageBucket<T>[] = [];
  let nextPage: string | null | undefined;
  let hasMore = true;
  let pageCount = 0;

  while (hasMore && pageCount < 5) {
    const url = new URL(`${OPENAI_BASE_URL}${path}`);

    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });

    if (nextPage) {
      url.searchParams.set("page", nextPage);
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(createBillingErrorMessage(response.status, errorText));
    }

    const page = (await response.json()) as OpenAIPage<T>;
    buckets.push(...(page.data ?? []));
    nextPage = page.next_page;
    hasMore = Boolean(page.has_more && nextPage);
    pageCount += 1;
  }

  return {
    data: buckets,
    has_more: false,
    next_page: null,
  } satisfies OpenAIPage<T>;
}

function BillingOverview({ billing }: { billing: BillingData }) {
  const totalCost = billing.status === "ready" ? billing.totalCost : 0;
  const remainingCredit =
    billing.status === "ready" ? billing.remainingCredit : null;
  const usagePercent = billing.status === "ready" ? billing.usagePercent : null;

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <BillingStat
        icon={Wallet}
        label="Buget setat"
        value={
          billing.creditLimit === null
            ? "Neconfigurat"
            : formatMoney(billing.creditLimit, billing.currency)
        }
        helper="Din OPENAI_BILLING_CREDIT_LIMIT, nu sold real OpenAI"
      />
      <BillingStat
        icon={ReceiptText}
        label="Cost folosit"
        value={formatMoney(totalCost, billing.currency)}
        helper="Raportat de OpenAI Costs API"
      />
      <BillingStat
        icon={Gauge}
        label="Rămas din buget"
        value={
          remainingCredit === null
            ? "Neconfigurat"
            : formatMoney(remainingCredit, billing.currency)
        }
        helper={
          usagePercent === null
            ? "Configurează limita pentru calcul"
            : `${usagePercent.toFixed(1)}% consumat`
        }
        tone={
          usagePercent !== null && usagePercent >= 85 ? "warning" : "default"
        }
      />
      <BillingStat
        icon={TrendingUp}
        label="Servicii active"
        value={
          billing.status === "ready"
            ? billing.lineItems.length.toString()
            : billing.status === "missing_key"
              ? "Cheie"
              : billing.status === "missing_scope"
                ? "Scope"
              : "Eroare"
        }
        helper={
          billing.status === "ready"
            ? "Line items cu cost în perioada curentă"
            : "Datele reale apar după configurare"
        }
        tone={billing.status === "ready" ? "default" : "warning"}
      />
    </section>
  );
}

function BillingClarification({ billing }: { billing: BillingData }) {
  return (
    <section className="rounded-lg border bg-muted/25 p-4 text-sm text-muted-foreground">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-medium text-foreground">Cum sunt calculate costurile</p>
          <p className="mt-1">
            Costul folosit vine din OpenAI Costs API. Bugetul este valoarea
            setată în <code>OPENAI_BILLING_CREDIT_LIMIT</code>, iar rămasul se
            calculează local: buget setat minus cost folosit.
          </p>
          <p className="mt-1">
            OpenAI poate raporta costurile cu întârziere, deci ultimele mesaje
            din chat pot apărea după câteva minute sau mai târziu.
          </p>
        </div>
        {billing.status === "ready" && (
          <Badge variant="outline" className="w-fit shrink-0">
            Actualizat la {formatDateTime(billing.periodEnd)}
          </Badge>
        )}
      </div>
    </section>
  );
}

function BillingStat({
  icon: Icon,
  label,
  value,
  helper,
  tone = "default",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  helper: string;
  tone?: "default" | "warning";
}) {
  return (
    <div className="rounded-lg border bg-background p-4 shadow-xs">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Icon className="size-4" />
          {label}
        </div>
        {tone === "warning" ? (
          <AlertCircle className="size-4 text-amber-600" />
        ) : (
          <CheckCircle2 className="size-4 text-emerald-600" />
        )}
      </div>
      <p className="mt-3 truncate text-2xl font-semibold tracking-normal">
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
    </div>
  );
}

function BillingSetupNotice({
  billing,
}: {
  billing: Extract<
    BillingData,
    { status: "missing_key" | "missing_scope" | "error" }
  >;
}) {
  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <KeyRound className="mt-0.5 size-5 shrink-0" />
          <div>
            <h2 className="font-semibold">Billing nu este complet conectat</h2>
            <p className="mt-1">{billing.message}</p>
            <div className="mt-3 grid gap-1 text-xs opacity-80">
              <p>
                1. Creează o cheie admin în OpenAI cu scope{" "}
                <code className="rounded bg-amber-100 px-1 py-0.5 dark:bg-amber-900/60">
                  api.usage.read
                </code>
                .
              </p>
              <p>
                2. Adaugă în <code>.env</code>:{" "}
                <code className="rounded bg-amber-100 px-1 py-0.5 dark:bg-amber-900/60">
                  OPENAI_ADMIN_KEY=...
                </code>
                .
              </p>
              <p>
                3. Pentru credit rămas setează{" "}
                <code className="rounded bg-amber-100 px-1 py-0.5 dark:bg-amber-900/60">
                  OPENAI_BILLING_CREDIT_LIMIT
                </code>
                , apoi repornește serverul.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function DailyCostsPanel({
  dailyCosts,
  currency,
}: {
  dailyCosts: Array<{ date: string; amount: number }>;
  currency: string;
}) {
  const maxAmount = Math.max(...dailyCosts.map((day) => day.amount), 0.01);
  const visibleDays = dailyCosts.filter((day) => day.amount > 0).slice(-14);

  return (
    <section className="rounded-lg border bg-background p-4 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Costuri pe zile</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ultimele zile cu consum în luna curentă.
          </p>
        </div>
        <Badge variant="outline">1d</Badge>
      </div>

      <div className="mt-5 grid gap-3">
        {visibleDays.length > 0 ? (
          visibleDays.map((day) => (
            <div key={day.date} className="grid gap-1.5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">{day.date}</span>
                <span className="font-medium">
                  {formatMoney(day.amount, currency)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-foreground"
                  style={{
                    width: `${Math.max((day.amount / maxAmount) * 100, 4)}%`,
                  }}
                />
              </div>
            </div>
          ))
        ) : (
          <EmptyPanelText text="Nu există costuri înregistrate în perioada curentă." />
        )}
      </div>
    </section>
  );
}

function LineItemsPanel({
  lineItems,
  currency,
}: {
  lineItems: LineItemSummary[];
  currency: string;
}) {
  return (
    <section className="rounded-lg border bg-background p-4 shadow-xs">
      <div>
        <h2 className="text-base font-semibold">Cost pe serviciu</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Împărțit după line item OpenAI.
        </p>
      </div>

      <div className="mt-4">
        {lineItems.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Serviciu</TableHead>
                <TableHead className="text-right">Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineItems.map((item) => (
                <TableRow key={item.name}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-right">
                    {formatMoney(item.amount, currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyPanelText text="Nu există costuri pe servicii încă." />
        )}
      </div>
    </section>
  );
}

function ModelUsagePanel({
  modelUsage,
}: {
  modelUsage: ModelUsageSummary[];
}) {
  return (
    <section className="rounded-lg border bg-background p-4 shadow-xs xl:col-span-2">
      <div>
        <h2 className="text-base font-semibold">Usage pe model</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cereri, tokeni de input, cache și output.
        </p>
      </div>

      <div className="mt-4">
        {modelUsage.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model</TableHead>
                <TableHead className="text-right">Cereri</TableHead>
                <TableHead className="text-right">Input</TableHead>
                <TableHead className="text-right">Cache</TableHead>
                <TableHead className="text-right">Output</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {modelUsage.map((item) => (
                <TableRow key={item.model}>
                  <TableCell className="font-medium">{item.model}</TableCell>
                  <TableCell className="text-right">
                    {formatCompactNumber(item.requests)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCompactNumber(item.inputTokens)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCompactNumber(item.cachedTokens)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCompactNumber(item.outputTokens)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyPanelText text="Usage-ul pe model nu este disponibil pentru perioada curentă." />
        )}
      </div>
    </section>
  );
}

function EmptyPanelText({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function BillingAccessDenied() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-3 py-8 sm:px-5">
      <section className="rounded-lg border bg-background p-6 text-center shadow-xs">
        <div className="mx-auto flex size-12 items-center justify-center rounded-md border bg-muted">
          <CreditCard className="size-5" />
        </div>
        <h1 className="mt-4 text-lg font-semibold">Billing este doar pentru admin</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Costurile și creditul OpenAI pot fi văzute doar de utilizatorii cu rol
          admin sau owner.
        </p>
      </section>
    </main>
  );
}

function summarizeLineItems(buckets: UsageBucket<CostResult>[]) {
  const totals = new Map<string, LineItemSummary>();

  buckets.forEach((bucket) => {
    (bucket.results ?? bucket.result ?? []).forEach((result) => {
      const name = result.line_item || "OpenAI API";
      const current = totals.get(name) ?? {
        name,
        amount: 0,
        quantity: null,
      };

      current.amount += parseAmountValue(result.amount?.value);
      current.quantity =
        result.quantity === null || result.quantity === undefined
          ? current.quantity
          : (current.quantity ?? 0) + result.quantity;
      totals.set(name, current);
    });
  });

  return [...totals.values()]
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}

function summarizeModelUsage(buckets: UsageBucket<UsageResult>[]) {
  const totals = new Map<string, ModelUsageSummary>();

  buckets.forEach((bucket) => {
    (bucket.results ?? bucket.result ?? []).forEach((result) => {
      const model = result.model || "Model necunoscut";
      const current = totals.get(model) ?? {
        model,
        requests: 0,
        inputTokens: 0,
        cachedTokens: 0,
        outputTokens: 0,
      };

      current.requests += result.num_model_requests ?? 0;
      current.inputTokens += result.input_tokens ?? 0;
      current.cachedTokens += result.input_cached_tokens ?? 0;
      current.outputTokens += result.output_tokens ?? 0;
      totals.set(model, current);
    });
  });

  return [...totals.values()]
    .filter(
      (item) =>
        item.requests > 0 ||
        item.inputTokens > 0 ||
        item.cachedTokens > 0 ||
        item.outputTokens > 0,
    )
    .sort((a, b) => b.requests - a.requests);
}

function sumCosts(results: CostResult[]) {
  return results.reduce(
    (total, result) => total + parseAmountValue(result.amount?.value),
    0,
  );
}

function parseAmountValue(value: number | string | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function createBillingErrorMessage(status: number, errorText: string) {
  if (status === 401) {
    return "OPENAI_ADMIN_KEY nu este validă sau a expirat. Creează o cheie admin nouă în OpenAI.";
  }

  if (
    status === 403 &&
    (errorText.includes("api.usage.read") ||
      errorText.includes("insufficient permissions"))
  ) {
    return "OPENAI_ADMIN_KEY există, dar nu are permisiunea api.usage.read. Creează o cheie admin OpenAI cu scope api.usage.read pentru pagina Billing.";
  }

  return `OpenAI billing API nu a răspuns corect (${status}). Verifică cheia admin și permisiunile contului.`;
}

function parseCreditLimit(value?: string) {
  if (!value) return null;

  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function normalizeCurrency(value?: string | null) {
  return value?.trim().toLowerCase() || "usd";
}

function toUnixSeconds(date: Date) {
  return Math.floor(date.getTime() / 1000);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatMoney(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("ro-RO", {
      style: "currency",
      currency: currency.toUpperCase(),
      maximumFractionDigits: value < 1 ? 4 : 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency.toUpperCase()}`;
  }
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("ro-RO", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}
