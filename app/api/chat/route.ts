import { openai } from "@/lib/openai";
import { prisma } from "@/lib/prisma";
import type {
  ResponseCreateParamsStreaming,
  ResponseInput,
  ResponseInputMessageContentList,
} from "openai/resources/responses/responses.mjs";
import type { ComparisonFilter, CompoundFilter } from "openai/resources/shared";

const NO_MANUAL_MATCH = "__NO_MANUAL_MATCH__";
const DEFAULT_CHAT_MODEL = "gpt-5.4-mini";

type ManualFilter = ComparisonFilter | CompoundFilter | undefined;

type ChatImageInput = {
  name?: string;
  mimeType?: string;
  dataUrl?: string;
};

type ChatHistoryMessage = {
  role: "user" | "assistant";
  content: string;
  hasImages?: boolean;
};

type ChatIntent = {
  mode: "conversation" | "manual_first" | "web";
  manualRequested: boolean;
  webRequested: boolean;
  webForbidden: boolean;
  technical: boolean;
};

function getLanguageInstruction(language: string) {
  switch (language) {
    case "ro":
      return "Răspunde în limba română.";
    case "en":
      return "Answer in English.";
    case "de":
      return "Antworte auf Deutsch.";
    case "fr":
      return "Réponds en français.";
    case "ru":
      return "Ответь на русском языке.";
    case "pl":
      return "Odpowiedz po polsku.";
    default:
      return "Răspunde în limba română.";
  }
}

function normalizeForIntent(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function includesAny(value: string, needles: string[]) {
  return needles.some((needle) => value.includes(needle));
}

function detectChatIntent({
  message,
  hasImages,
}: {
  message: string;
  hasImages: boolean;
}): ChatIntent {
  const normalized = normalizeForIntent(message);
  const manualRequested = includesAny(normalized, [
    "manual",
    "pdf",
    "documentatie",
    "documentatia",
    "document",
    "instructiuni",
    "cauta in manual",
    "verifica in manual",
    "din manual",
    "in manual",
  ]);
  const webRequested = includesAny(normalized, [
    "internet",
    "online",
    "web",
    "google",
    "cauta pe net",
    "cauta pe internet",
    "verifica online",
    "de pe site",
  ]);
  const webForbidden = includesAny(normalized, [
    "fara internet",
    "fara web",
    "nu cauta pe internet",
    "nu cauta online",
    "doar manual",
    "numai manual",
  ]);
  const noSearchRequested =
    includesAny(normalized, [
      "nu cauta",
      "fara cautare",
      "doar vorbim",
      "conversatie normala",
      "vorbeste normal",
    ]) &&
    !manualRequested &&
    !webRequested;
  const hasErrorCode =
    /\b[A-Z]\s*\.?\s*\d+(?:\.\d+)?\b/i.test(message) ||
    /\bF\s*\.?\s*\d+(?:\.\d+)?\b/i.test(message) ||
    /\b\d+\.\d+\b/.test(message);
  const technical =
    hasImages ||
    hasErrorCode ||
    includesAny(normalized, [
      "eroare",
      "error",
      "fehler",
      "defect",
      "cauza",
      "ursache",
      "abhilfe",
      "reset",
      "parametru",
      "setare",
      "dip",
      "motor",
      "automatizare",
      "poarta",
      "usa",
      "usi",
      "tor",
      "tuer",
      "tur",
      "brandschutz",
      "schranke",
      "bariera",
      "gfa",
      "feig",
      "marantec",
      "hormann",
      "nice",
      "bft",
      "came",
      "fotocelula",
      "senzor",
      "encoder",
      "endschalter",
      "des",
      "steuerung",
      "platina",
      "tablou",
      "contact",
      "releu",
      "siguranta",
      "service",
      "mentenanta",
      "diagnoza",
      "montaj",
    ]);

  if (noSearchRequested) {
    return {
      mode: "conversation",
      manualRequested,
      webRequested,
      webForbidden,
      technical: false,
    };
  }

  if (webRequested && !manualRequested) {
    return {
      mode: "web",
      manualRequested,
      webRequested,
      webForbidden,
      technical,
    };
  }

  if (manualRequested || technical) {
    return {
      mode: "manual_first",
      manualRequested,
      webRequested,
      webForbidden,
      technical,
    };
  }

  return {
    mode: "conversation",
    manualRequested,
    webRequested,
    webForbidden,
    technical,
  };
}

function getErrorCodeHints(message: string) {
  const normalizedMessage = message.replace(",", ".");
  const matches = normalizedMessage.matchAll(/\bF\s*\.?\s*(\d+(?:\.\d+)?)\b/gi);
  const codes = [...matches].map((match) => match[1]).filter(Boolean);

  if (codes.length === 0) return "";

  const variants = codes.flatMap((code) => [
    `F${code}`,
    `F ${code}`,
    `F. ${code}`,
    `F.`,
    code,
  ]);

  return [
    `Coduri detectate: ${[...new Set(variants)].join(", ")}`,
    "În tabelele germane de erori, litera „F.” poate apărea într-o coloană separată, iar numărul codului în celula/rândul de lângă ea. Combină-le ca același cod, de exemplu „F.” + „5.5” = „F 5.5”.",
    "Pentru un cod exact, citește rândul/celulele aferente codului și coloanele „Fehlerursachen”, „Fehlerbehebung”, „Ursache”, „Abhilfe”, „Maßnahme”.",
    "Nu folosi titlul capitolului sau al tabelului ca semnificație a codului, decât dacă rândul exact al codului spune același lucru.",
  ].join("\n");
}

function extractSearchTerms(message: string) {
  const normalized = message
    .replace(/[^\p{L}\p{N}._-]+/gu, " ")
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 3);

  const errorCodes = [...message.replace(",", ".").matchAll(/\b[A-Z]?\s*\.?\s*\d+(?:\.\d+)?\b/gi)]
    .map((match) => match[0].replace(/\s+/g, " ").trim())
    .filter((term) => term.length >= 2);

  return [...new Set([...errorCodes, ...normalized])].slice(0, 10);
}

async function getRelevantExperiences({
  assistantId,
  message,
  selectedManualId,
  technicianId,
  technicianManualIds,
  experienceEnabled,
}: {
  assistantId: string;
  message: string;
  selectedManualId?: string;
  technicianId?: string;
  technicianManualIds?: string[];
  experienceEnabled?: boolean;
}) {
  if (experienceEnabled === false) return [];

  const terms = extractSearchTerms(message);
  const textFilters = terms.flatMap((term) => [
    { title: { contains: term, mode: "insensitive" as const } },
    { question: { contains: term, mode: "insensitive" as const } },
    { answer: { contains: term, mode: "insensitive" as const } },
    { symptoms: { contains: term, mode: "insensitive" as const } },
    { cause: { contains: term, mode: "insensitive" as const } },
    { solution: { contains: term, mode: "insensitive" as const } },
    { tags: { contains: term, mode: "insensitive" as const } },
    { manualName: { contains: term, mode: "insensitive" as const } },
  ]);

  try {
    return await prisma.technicianExperience.findMany({
      where: {
        AND: [
          {
            OR: [{ projectId: assistantId }, { projectId: null }],
          },
          technicianId
            ? {
                OR: [{ technicianId }, { technicianId: null }],
              }
            : {},
          selectedManualId && selectedManualId !== "all"
            ? {
                OR: [{ manualId: selectedManualId }, { manualId: null }],
              }
            : technicianManualIds && technicianManualIds.length > 0
              ? {
                  OR: [
                    ...technicianManualIds.map((manualId) => ({ manualId })),
                    { manualId: null },
                  ],
                }
            : {},
          textFilters.length > 0 ? { OR: textFilters } : {},
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: 6,
    });
  } catch (error) {
    console.error("Failed to load technician experiences", error);
    return [];
  }
}

function formatRelevantExperiences(
  experiences: Awaited<ReturnType<typeof getRelevantExperiences>>,
) {
  if (experiences.length === 0) return "";

  return [
    "Experiență permanentă relevantă salvată în aplicație:",
    ...experiences.map((experience, index) =>
      [
        `Caz ${index + 1}: ${experience.title}`,
        experience.manualName ? `Manual asociat: ${experience.manualName}` : "",
        experience.tags ? `Taguri: ${experience.tags}` : "",
        `Întrebare/simptom: ${experience.question}`,
        experience.symptoms ? `Simptome observate: ${experience.symptoms}` : "",
        experience.cause ? `Cauză confirmată/probabilă: ${experience.cause}` : "",
        experience.solution ? `Soluție aplicată: ${experience.solution}` : "",
        `Răspuns salvat: ${experience.answer}`,
      ]
        .filter(Boolean)
        .join("\n"),
    ),
    "Folosește experiența permanentă ca ajutor practic. Dacă se contrazice cu manualul selectat, manualul are prioritate. Marchează clar când folosești experiență salvată, de exemplu „Din experiența salvată”.",
  ].join("\n\n");
}

function validateConversationHistory(history: unknown): ChatHistoryMessage[] {
  if (!Array.isArray(history)) return [];

  return history
    .filter((item): item is ChatHistoryMessage => {
      if (!item || typeof item !== "object") return false;

      const role = "role" in item ? item.role : undefined;
      const content = "content" in item ? item.content : undefined;

      return (
        (role === "user" || role === "assistant") &&
        typeof content === "string" &&
        content.trim().length > 0
      );
    })
    .slice(-8)
    .map((item) => ({
      role: item.role,
      content: item.content.trim().slice(0, 1800),
      hasImages: Boolean(item.hasImages),
    }));
}

function formatConversationHistory(history: ChatHistoryMessage[]) {
  if (history.length === 0) return "";

  return [
    "Context conversație curentă:",
    ...history.map((item) => {
      const role = item.role === "user" ? "Utilizator" : "Asistent";
      const imageNote = item.hasImages ? " [a avut imagine atașată]" : "";
      return `${role}${imageNote}: ${item.content}`;
    }),
    "Folosește acest context doar ca memorie de lucru pentru conversația curentă. Manualul și sursele găsite au prioritate față de istoricul conversației.",
  ].join("\n");
}

function buildManualInput({
  message,
  history,
  experienceContext,
}: {
  message: string;
  history: ChatHistoryMessage[];
  experienceContext: string;
}) {
  return [
    formatConversationHistory(history),
    "",
    experienceContext,
    "",
    `Întrebarea utilizatorului: ${message}`,
    "",
    getErrorCodeHints(message),
    "",
    "Comportă-te ca un technician senior foarte inteligent: explică natural, ca într-un chat profesional, pune cap la cap simptomele, manualul, imaginea și istoricul conversației.",
    "Răspunde orientat spre diagnostic: ce înseamnă problema, ce cauze posibile apar în manual, ce verificări se fac, ce pași sunt recomandați și ce riscuri există.",
    "Dacă întrebarea conține un cod de eroare, caută codul exact și informațiile din apropiere despre Bedeutung/descriere, Ursache/cauză, Abhilfe/remediere, Maßnahme, Behebung, Prüfung/Kontrolle și resetare.",
    "Structurează răspunsul cu subtitluri scurte când ajută: Concluzie, Din manual, Ursache / cauză, Verificări, Pași recomandați, Atenționări, Date din web.",
    "Dacă manualul nu specifică o cauză sau un pas, spune clar că acel detaliu nu este specificat în manual; nu completa din presupuneri.",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildConversationInput({
  message,
  history,
}: {
  message: string;
  history: ChatHistoryMessage[];
}) {
  return [
    formatConversationHistory(history),
    "",
    `Mesajul utilizatorului: ${message}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildBerichtInput({
  message,
  history,
  experienceContext,
}: {
  message: string;
  history: ChatHistoryMessage[];
  experienceContext: string;
}) {
  return [
    formatConversationHistory(history),
    "",
    experienceContext,
    "",
    "Observațiile / notițele brute ale tehnicianului:",
    message,
    "",
    "Transformă aceste observații într-un Bericht tehnic utilizabil. Nu trata mesajul ca întrebare de manual.",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildEmailInput({
  message,
  history,
}: {
  message: string;
  history: ChatHistoryMessage[];
}) {
  return [
    formatConversationHistory(history),
    "",
    "Textul brut al utilizatorului, care trebuie transformat cât mai fidel în germană:",
    message,
    "",
    "Păstrează intenția, informațiile și nivelul de detaliu al textului. Nu adăuga informații noi.",
  ]
    .filter(Boolean)
    .join("\n");
}

function normalizeMessage(message: unknown, hasImages: boolean) {
  if (typeof message === "string" && message.trim()) {
    return message.trim();
  }

  return hasImages
    ? "Analizează imaginea atașată și răspunde în contextul manualului/proiectului."
    : "";
}

function validateImages(images: unknown): ChatImageInput[] {
  if (!Array.isArray(images)) return [];

  const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

  return images
    .filter((image): image is ChatImageInput => {
      if (!image || typeof image !== "object") return false;

      const dataUrl = "dataUrl" in image ? image.dataUrl : undefined;
      const mimeType = "mimeType" in image ? image.mimeType : undefined;

      if (typeof dataUrl !== "string" || typeof mimeType !== "string") {
        return false;
      }

      if (!allowedMimeTypes.has(mimeType)) return false;
      if (!dataUrl.startsWith(`data:${mimeType};base64,`)) return false;

      return dataUrl.length <= 9_000_000;
    })
    .slice(0, 4);
}

async function getSelectedTechnician(technicianId: unknown) {
  if (
    typeof technicianId !== "string" ||
    technicianId === "general" ||
    technicianId.trim().length === 0
  ) {
    return null;
  }

  try {
    return await prisma.aiTechnician.findFirst({
      where: {
        id: technicianId,
        active: true,
      },
      include: { manuals: true },
    });
  } catch (error) {
    console.error("Failed to load selected AI technician", error);
    return null;
  }
}

type LoadedTechnician = NonNullable<
  Awaited<ReturnType<typeof getSelectedTechnician>>
>;

function isBerichtTechnician(technician: LoadedTechnician | null) {
  if (!technician) return false;

  const normalized = normalizeForIntent(
    [
      technician.name,
      technician.domain,
      technician.productTypes,
      technician.responseStyle,
      technician.instructions,
    ]
      .filter(Boolean)
      .join(" "),
  );

  return includesAny(normalized, [
    "bericht",
    "arbeitsbericht",
    "servicebericht",
    "wartungsbericht",
    "storungsbericht",
    "stoerungsbericht",
    "raport",
  ]);
}

function isEmailTechnician(technician: LoadedTechnician | null) {
  if (!technician) return false;

  const normalized = normalizeForIntent(
    [
      technician.name,
      technician.domain,
      technician.productTypes,
      technician.responseStyle,
      technician.instructions,
    ]
      .filter(Boolean)
      .join(" "),
  );

  return includesAny(normalized, [
    "email",
    "e-mail",
    "mail",
    "kundenkommunikation",
    "kunden e mail",
    "kundenmail",
    "email-de",
  ]);
}

function formatTechnicianInstruction(technician: LoadedTechnician) {
  return [
    `Technician AI selectat: ${technician.name}.`,
    `Domeniu: ${technician.domain}.`,
    technician.brands ? `Branduri / familii: ${technician.brands}.` : "",
    technician.productTypes
      ? `Tipuri produse / instalații: ${technician.productTypes}.`
      : "",
    `Stil răspuns cerut: ${technician.responseStyle}.`,
    technician.webEnabled
      ? "Fallback web este permis doar după ce manualele nu au oferit răspuns suficient."
      : "Fallback web este dezactivat pentru acest technician.",
    technician.experienceEnabled
      ? "Experiența permanentă este activă pentru acest technician."
      : "Nu folosi experiența permanentă pentru acest technician.",
    "Instrucțiuni specifice technician:",
    technician.instructions,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildManualFilter({
  selectedManualId,
  technicianManualIds,
}: {
  selectedManualId?: string;
  technicianManualIds: string[];
}): ManualFilter {
  if (typeof selectedManualId === "string" && selectedManualId !== "all") {
    return {
      type: "eq",
      key: "manualId",
      value: selectedManualId,
    };
  }

  const uniqueManualIds = [...new Set(technicianManualIds)]
    .map((manualId) => manualId.trim())
    .filter(Boolean);

  if (uniqueManualIds.length === 0) return undefined;

  if (uniqueManualIds.length === 1) {
    return {
      type: "eq",
      key: "manualId",
      value: uniqueManualIds[0],
    };
  }

  return {
    type: "or",
    filters: uniqueManualIds.map((manualId) => ({
      type: "eq",
      key: "manualId",
      value: manualId,
    })),
  };
}

function buildMultimodalInput({
  text,
  images,
}: {
  text: string;
  images: ChatImageInput[];
}): ResponseInput {
  const content: ResponseInputMessageContentList = [
    {
      type: "input_text",
      text,
    },
    ...images.map((image) => ({
      type: "input_image" as const,
      image_url: image.dataUrl ?? null,
      detail: "auto" as const,
    })),
  ];

  return [
    {
      role: "user",
      content,
    },
  ];
}

async function getManualNames({
  vectorStoreId,
  selectedManualId,
  technicianManualIds,
}: {
  vectorStoreId: string;
  selectedManualId?: string;
  technicianManualIds: string[];
}) {
  const vectorFiles = await openai.vectorStores.files.list(vectorStoreId, {
    limit: 100,
  });

  const technicianManualSet = new Set(technicianManualIds);
  const matchedFiles = vectorFiles.data.filter((vectorFile) => {
    const manualId =
      typeof vectorFile.attributes?.manualId === "string"
        ? vectorFile.attributes.manualId
        : vectorFile.id;

    if (selectedManualId && selectedManualId !== "all") {
      return manualId === selectedManualId;
    }

    if (technicianManualSet.size > 0) {
      return technicianManualSet.has(manualId);
    }

    return true;
  });

  const filesForNames = matchedFiles.length > 0 ? matchedFiles : vectorFiles.data;

  return Promise.all(
    filesForNames.map(async (vectorFile) => {
      if (typeof vectorFile.attributes?.fileName === "string") {
        return vectorFile.attributes.fileName;
      }

      const file = await openai.files.retrieve(vectorFile.id);
      return file.filename;
    }),
  );
}

function createTextStream({
  manualParams,
  webParams,
  sourceLabel,
  webDisabledMessage,
}: {
  manualParams: ResponseCreateParamsStreaming;
  webParams?: () => Promise<ResponseCreateParamsStreaming>;
  sourceLabel: string;
  webDisabledMessage?: string;
}) {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (text: string) => controller.enqueue(encoder.encode(text));
      let manualBuffer = "";
      let manualAnswerStarted = false;

      try {
        const manualStream = await openai.responses.create(manualParams);

        for await (const event of manualStream) {
          if (event.type !== "response.output_text.delta") continue;

          if (manualAnswerStarted) {
            send(event.delta);
            continue;
          }

          manualBuffer += event.delta;

          if (NO_MANUAL_MATCH.startsWith(manualBuffer)) {
            continue;
          }

          if (manualBuffer.includes(NO_MANUAL_MATCH)) {
            manualBuffer = "";
            break;
          }

          manualAnswerStarted = true;
          send(manualBuffer);
          manualBuffer = "";
        }

        if (manualAnswerStarted) {
          controller.close();
          return;
        }

        if (!webParams) {
          send(
            webDisabledMessage ||
              `Nu am găsit răspunsul în ${sourceLabel}. Căutarea pe internet este dezactivată pentru sursa selectată.`,
          );
          controller.close();
          return;
        }

        send(
          [
            `Sursă: Internet`,
            `Nu am găsit răspunsul în ${sourceLabel}; caut online după numele manualului/produsului.`,
            "",
          ].join("\n"),
        );

        const internetStream = await openai.responses.create(await webParams());

        for await (const event of internetStream) {
          if (event.type === "response.output_text.delta") {
            send(event.delta);
          }
        }

        controller.close();
      } catch (error) {
        console.error(error);
        send("\n\nA apărut o eroare în timpul generării răspunsului.");
        controller.close();
      }
    },
  });
}

function createOpenAITextStream({
  params,
  prefix,
}: {
  params: ResponseCreateParamsStreaming;
  prefix?: string;
}) {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (text: string) => controller.enqueue(encoder.encode(text));

      try {
        if (prefix) send(prefix);

        const stream = await openai.responses.create(params);

        for await (const event of stream) {
          if (event.type === "response.output_text.delta") {
            send(event.delta);
          }
        }

        controller.close();
      } catch (error) {
        console.error(error);
        send("\n\nA apărut o eroare în timpul generării răspunsului.");
        controller.close();
      }
    },
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { assistantId, language, selectedManualId } = body;
  const images = validateImages(body.images);
  const conversationHistory = validateConversationHistory(
    body.conversationHistory,
  );
  const message = normalizeMessage(body.message, images.length > 0);

  if (!message) {
    return new Response("Mesajul este gol.", {
      status: 400,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const assistant = await openai.beta.assistants.retrieve(assistantId);
  const vectorStoreId =
    assistant.tool_resources?.file_search?.vector_store_ids?.[0] ||
    assistant.metadata?.vectorStoreId;
  const chatModel =
    typeof assistant.metadata?.chatModel === "string"
      ? assistant.metadata.chatModel
      : assistant.model || DEFAULT_CHAT_MODEL;

  const languageInstruction = getLanguageInstruction(language);
  const intent = detectChatIntent({
    message,
    hasImages: images.length > 0,
  });
  const selectedTechnician = await getSelectedTechnician(body.technicianId);
  const berichtMode = isBerichtTechnician(selectedTechnician);
  const emailMode = isEmailTechnician(selectedTechnician);
  const technicianManualIds =
    selectedTechnician?.manuals
      .filter((manual) => manual.projectId === assistantId)
      .map((manual) => manual.manualId) ?? [];
  const technicianInstruction = selectedTechnician
    ? formatTechnicianInstruction(selectedTechnician)
    : "";
  const imageInstruction =
    images.length > 0
      ? [
          "Utilizatorul a atașat una sau mai multe imagini.",
          "Analizează vizual imaginea: citește etichete, coduri, afișaje, erori, componente, conexiuni sau starea mecanică vizibilă.",
          "Corelează ce vezi în imagine cu manualul/manualele selectate. Dacă imaginea conține un cod sau o piesă, caută acel cod sau denumire în manual.",
          "Dacă informația vizuală nu este suficientă, spune ce nu se vede clar și ce poză suplimentară ar ajuta.",
        ].join("\n")
      : "";
  const relevantExperiences =
    emailMode || (intent.mode === "conversation" && !berichtMode)
      ? []
      : await getRelevantExperiences({
          assistantId,
          message,
          selectedManualId,
          technicianId: selectedTechnician?.id,
          technicianManualIds,
          experienceEnabled: selectedTechnician?.experienceEnabled ?? true,
        });
  const experienceContext = formatRelevantExperiences(relevantExperiences);

  const buildWebParams = async ({
    sourceLabel,
    noManualNote,
  }: {
    sourceLabel?: string;
    noManualNote?: string;
  }): Promise<ResponseCreateParamsStreaming> => {
    const manualNames = vectorStoreId
      ? await getManualNames({
          vectorStoreId,
          selectedManualId,
          technicianManualIds,
        })
      : [];
    const searchContext = manualNames.length
      ? manualNames.slice(0, 8).join(", ")
      : assistant.name || "manual tehnic";

    return {
      model: chatModel,
      instructions: [
        languageInstruction,
        technicianInstruction,
        "Răspunde ca un technician senior: clar, conversațional, practic și prudent.",
        intent.webRequested
          ? "Utilizatorul a cerut explicit căutare pe internet."
          : "Caută pe internet doar fiindcă manualul nu a oferit răspuns suficient.",
        "Răspunsul trebuie să menționeze clar că sursa este internetul, nu manualul încărcat.",
        images.length > 0
          ? "Utilizatorul a atașat și o imagine. Analizează imaginea împreună cu rezultatele online."
          : "",
        "Separă informația astfel: ce se vede/înțelege, date găsite pe web, ce rămâne de verificat în teren.",
        "Pentru coduri de eroare, include Semnificație, Ursache / cauză, Verificări, Pași recomandați și Atenționări, dacă sursele online oferă aceste informații.",
        "Include la final o secțiune scurtă „Surse internet” cu linkurile folosite, dacă sunt disponibile.",
        "Nu inventa pași de service periculoși. Pentru operații electrice, antifoc sau mecanice grele, recomandă tehnician autorizat când este cazul.",
      ]
        .filter(Boolean)
        .join("\n\n"),
      input: buildMultimodalInput({
        text: [
          formatConversationHistory(conversationHistory),
          experienceContext,
          noManualNote || "",
          sourceLabel ? `Sursă internă verificată înainte: ${sourceLabel}` : "",
          `Nume manual/produs pentru căutare: ${searchContext}`,
          `Întrebarea utilizatorului: ${message}`,
        ]
          .filter(Boolean)
          .join("\n"),
        images,
      }),
      tools: [
        {
          type: "web_search",
          search_context_size: "medium",
        },
      ],
      temperature: 0,
      stream: true,
    };
  };

  if (emailMode && selectedTechnician) {
    const emailParams: ResponseCreateParamsStreaming = {
      model: chatModel,
      instructions: [
        languageInstruction,
        technicianInstruction,
        "Mod special: Email DE / traducere fidelă.",
        "Sarcina principală: utilizatorul scrie în română, iar tu transformi textul într-un email sau mesaj în limba germană.",
        "Păstrează cât mai fidel ce a scris utilizatorul: aceeași intenție, aceleași date, același nivel de detaliu. Corectează doar gramatica, tonul și forma profesională.",
        "Nu inventa și nu adăuga informații noi: nu adăuga cereri despre model, frecvență, compatibilitate, adresă de livrare, termene, prețuri, materiale, promisiuni sau pași suplimentari dacă utilizatorul nu le-a menționat.",
        "Nu adăuga secțiuni precum „Noch zu klären”, „Rückfragen”, „Bitte teilen Sie uns mit...” decât dacă utilizatorul cere explicit să ceri informații suplimentare.",
        "Nu trata mesajul ca întrebare tehnică de manual. Nu căuta în manual și nu răspunde cu diagnostic tehnic pentru acest mod.",
        "Dacă utilizatorul spune că există poză/foto, păstrează referința la fotografie în germană, dar nu inventa ce se vede în poză dacă nu este atașată sau clară.",
        "Dacă utilizatorul cere doar traducere, răspunde doar cu textul tradus. Dacă cere email, folosește format de email cu Betreff, Anrede, corp și încheiere.",
        "Folosește un ton politicos și natural, cu „Sie”. Nu face textul mult mai lung decât originalul decât dacă este necesar pentru gramatică și claritate.",
        images.length > 0
          ? "Utilizatorul a atașat imagine. Poți menționa „siehe beigefügtes Foto” dacă se potrivește, dar nu inventa detalii vizuale."
          : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
      input: buildMultimodalInput({
        text: buildEmailInput({
          message,
          history: conversationHistory,
        }),
        images,
      }),
      temperature: 0,
      stream: true,
    };

    return new Response(createOpenAITextStream({ params: emailParams }), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  }

  if (berichtMode && selectedTechnician) {
    const manualFilter = buildManualFilter({
      selectedManualId,
      technicianManualIds,
    });
    const berichtTools: ResponseCreateParamsStreaming["tools"] = vectorStoreId
      ? [
          {
            type: "file_search",
            vector_store_ids: [vectorStoreId],
            filters: manualFilter,
            max_num_results: 8,
          },
        ]
      : undefined;

    const berichtParams: ResponseCreateParamsStreaming = {
      model: chatModel,
      instructions: [
        assistant.instructions,
        languageInstruction,
        technicianInstruction,
        "Mod special: Bericht / Arbeitsbericht.",
        "Nu trata mesajul utilizatorului ca întrebare de manual și nu răspunde cu „nu am găsit în manual”. Pentru Bericht, sarcina principală este redactarea raportului din observațiile introduse de utilizator.",
        "Manualele sau șabloanele asociate pot fi folosite doar pentru structură, câmpuri, formulări și verificare. Dacă nu găsești un șablon relevant, redactează totuși raportul din datele primite.",
        "Redactează implicit textul final în germană profesională, pentru Arbeitsbericht/Servicebericht. Dacă utilizatorul cere română, răspunde în română.",
        "Corectează gramatica și termenii tehnici germani: de exemplu Führungsschiene, Inbetriebnahme, außer Betrieb, beschädigt, verbogen.",
        "Păstrează sensul observațiilor. Nu inventa client, adresă, dată, ore, materiale, piese, măsurători, semnături sau lucrări care nu au fost menționate.",
        "Dacă textul utilizatorului este scurt, oferă un Bericht concis, gata de copiat. Dacă lipsesc date importante, adaugă la final o secțiune scurtă „Fehlende Angaben”.",
        "Structură recomandată: Kurzbeschreibung, Feststellung, Ursache / Schadenbild, Durchgeführte Maßnahme, Status der Anlage, Empfehlung / Nächste Schritte.",
        "Pentru fraze de service, folosește formulări neutre și profesionale. Exemplu de ton: „Das Tor wurde im Bereich der rechten Führungsschiene beschädigt. Aufgrund der Verformung war eine sichere Inbetriebnahme nicht möglich. Die Anlage wurde außer Betrieb gesetzt.”",
        "Dacă utilizatorul atașează imagini, folosește-le pentru a formula observații, dar marchează ce nu este vizibil clar.",
        imageInstruction,
      ]
        .filter(Boolean)
        .join("\n\n"),
      input: buildMultimodalInput({
        text: buildBerichtInput({
          message,
          history: conversationHistory,
          experienceContext,
        }),
        images,
      }),
      tools: berichtTools,
      temperature: 0,
      stream: true,
    };

    return new Response(createOpenAITextStream({ params: berichtParams }), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  }

  if (intent.mode === "conversation") {
    const conversationParams: ResponseCreateParamsStreaming = {
      model: chatModel,
      instructions: [
        languageInstruction,
        technicianInstruction,
        "Ești un asistent conversațional natural și profesionist. Poți discuta normal cu utilizatorul, ca într-un chat modern.",
        "Pentru acest mesaj nu folosi manualele și nu căuta pe internet. Răspunde direct, cald, clar și util.",
        "Dacă utilizatorul cere explicit să cauți în manual, PDF, documentație, web sau internet, acel mesaj va fi tratat ca întrebare cu surse.",
        "Dacă discuția devine tehnică, spune pe scurt ce detalii ți-ar trebui și că poți verifica manualul sau web-ul la cerere.",
        images.length > 0
          ? "Utilizatorul a atașat o imagine; răspunde conversațional despre ce se vede, fără să pretinzi că ai verificat manualul sau internetul."
          : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
      input: buildMultimodalInput({
        text: buildConversationInput({
          message,
          history: conversationHistory,
        }),
        images,
      }),
      temperature: 0,
      stream: true,
    };

    return new Response(createOpenAITextStream({ params: conversationParams }), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  }

  if (intent.mode === "web") {
    if (selectedTechnician?.webEnabled === false || intent.webForbidden) {
      return new Response(
        selectedTechnician
          ? `Căutarea pe internet este dezactivată pentru technicianul ${selectedTechnician.name}.`
          : "Căutarea pe internet este dezactivată pentru această întrebare.",
        {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-cache",
          },
        },
      );
    }

    return new Response(
      createOpenAITextStream({
        prefix: "Sursă: Internet\n\n",
        params: await buildWebParams({}),
      }),
      {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache",
        },
      },
    );
  }

  const manualFilter = buildManualFilter({
    selectedManualId,
    technicianManualIds,
  });

  const hasSelectedManual =
    typeof selectedManualId === "string" && selectedManualId !== "all";
  const hasTechnicianManualScope =
    Boolean(selectedTechnician) && !hasSelectedManual && technicianManualIds.length > 0;
  const sourceLabel = hasSelectedManual
    ? "manualul selectat"
    : hasTechnicianManualScope && selectedTechnician
      ? `manualele technicianului ${selectedTechnician.name}`
      : "manualele proiectului";
  const scopeInstruction = hasSelectedManual
    ? `Folosește exclusiv manualul selectat. Dacă informația nu apare în manualul selectat, răspunde exact cu ${NO_MANUAL_MATCH} și nimic altceva.`
    : hasTechnicianManualScope && selectedTechnician
      ? `Folosește doar manualele asociate technicianului ${selectedTechnician.name} în acest proiect. Dacă informația nu apare în aceste manuale, răspunde exact cu ${NO_MANUAL_MATCH} și nimic altceva.`
      : `Folosește doar manualele încărcate în proiect. Dacă informația nu apare în manuale, răspunde exact cu ${NO_MANUAL_MATCH} și nimic altceva.`;

  if (!vectorStoreId) {
    if (selectedTechnician?.webEnabled === false || intent.webForbidden) {
      return new Response(
        "Nu există încă niciun manual indexat pentru acest proiect, iar căutarea pe internet este dezactivată pentru contextul selectat.",
        {
          status: 400,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        },
      );
    }

    return new Response(
      createOpenAITextStream({
        prefix:
          "Sursă: Internet\nNu există încă niciun manual indexat pentru acest proiect; caut online după numele produsului/manualului.\n\n",
        params: await buildWebParams({
          noManualNote:
            "Nu există încă niciun manual indexat pentru acest proiect.",
        }),
      }),
      {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache",
        },
      },
    );
  }

  const manualParams: ResponseCreateParamsStreaming = {
    model: chatModel,
    instructions: [
      assistant.instructions,
      languageInstruction,
      scopeInstruction,
      technicianInstruction,
      "Personalitate: ești un technician expert pentru porți industriale, porți automate, uși antifoc / Brandschutztür și bariere / Schranke. Răspunzi ca ChatGPT: clar, conversațional, inteligent și util, dar tehnic precis.",
      "Lucrează ca un diagnostician: pornește de la simptom, identifică produsul/codul/componenta, verifică manualul, apoi explică pașii logic. Dacă lipsesc date, cere poze sau detalii suplimentare.",
      "Ai acces la experiență permanentă salvată din cazuri reale. Folosește-o ca memorie practică, dar nu o lăsa să înlocuiască manualul.",
      "Pentru manuale tehnice, păstrează codurile, denumirile și valorile exact cum apar în document. Nu inventa informații.",
      imageInstruction,
      "Răspunde mai amplu decât o definiție scurtă: explică contextul, cauza/Ursache când apare în manual, verificările și pașii recomandați.",
      "Pentru coduri de eroare, folosește o structură tehnică: Semnificație, Ursache / cauză, Verificări, Pași recomandați, Atenționări.",
      "În tabelele de erori, fă diferența între titlul secțiunii/tabelului și rândul exact al codului. Răspunsul pentru un cod trebuie să vină din rândul codului și coloanele lui, nu doar din heading.",
      "Dacă manualul nu dă cauza exactă, scrie explicit: „Ursache / cauză: nu este specificată în manual.”",
      "Când este posibil, menționează scurt manualul, capitolul, tabelul sau fragmentul pe care se bazează răspunsul.",
      "Nu prezenta date din internet ca și cum ar fi din manual. Dacă ajungi la internet, marchează clar secțiunea „Date din web” sau „Sursă: Internet”.",
      "Nu da instrucțiuni periculoase pentru intervenții electrice, sisteme antifoc, arcuri tensionate sau mecanisme grele fără avertizare și recomandare de tehnician autorizat.",
    ]
      .filter(Boolean)
      .join("\n\n"),
    input: buildMultimodalInput({
      text: buildManualInput({
        message,
        history: conversationHistory,
        experienceContext,
      }),
      images,
    }),
    tools: [
      {
        type: "file_search",
        vector_store_ids: [vectorStoreId],
        filters: manualFilter,
        max_num_results: 20,
      },
    ],
    temperature: 0,
    stream: true,
  };

  return new Response(
    createTextStream({
      manualParams,
      sourceLabel,
      webDisabledMessage: selectedTechnician
        ? `Nu am găsit răspunsul în ${sourceLabel}. Căutarea pe internet este dezactivată pentru technicianul ${selectedTechnician.name}.`
        : undefined,
      webParams:
        selectedTechnician?.webEnabled === false || intent.webForbidden
          ? undefined
          : async () => {
              return buildWebParams({
                sourceLabel,
                noManualNote: `Nu am găsit răspunsul în ${sourceLabel}.`,
              });
            },
    }),
    {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    },
  );
}
