"use server";

import { createXai } from '@ai-sdk/xai';
import { generateText } from 'ai'; // Import esențial din Vercel AI SDK

// Dacă nu ai ModelType, definește-l așa (modele reale Grok 2026):
export enum ModelType {
  PRO = 'grok-4-1-fast-reasoning', // Pentru reasoning precis
  FLASH = 'grok-4-fast-non-reasoning', // Pentru viteză, fără reasoning intens
}

/**
 * Server Action pentru a întreba asistentul tehnic.
 * Folosește xAI Grok cu precizie maximă.
 */

export async function askAssistant(
  assistantContent: string,
  history: { role: 'user' | 'assistant'; text: string }[],
  query: string,
  useThinking: boolean = false,
): Promise<string> {
  const apiKey = process.env.AX_API; // Corectat din AX_API

  if (!apiKey) {
    throw new Error("KEY_ERROR");
  }

  const xai = createXai({ apiKey });

  const model = useThinking ? ModelType.PRO : ModelType.FLASH;

  // Limita context (sigură pentru Grok, care are window uriaș, dar prevenim overflow)
  const contextLimit = 1000000; // Poți crește la 2M dacă modelul suportă
  const truncatedContent = assistantContent.length > contextLimit 
    ? assistantContent.substring(0, contextLimit) + "... [Manual tăiat din cauza dimensiunii extreme]"
    : assistantContent;

  /**
   * INSTRUCTIUNI DE PRECIZIE MAXIMA:
   * Păstrat regulile stricte, fără search extern.
   */
  const systemPrompt = `DU BIST EIN TECHNISCHES LESESYSTEM. DEINE EINZIGE AUFGABE IST DAS ZITIEREN.

    STRENGE REGELN FÜR DIE FEHLERSUCHE:
    1. **IDENTITÄTS-CHECK**: Wenn der Nutzer nach einem Fehlercode fragt (z. B. "F5.5"), suche NUR nach der exakten Zeichenfolge "${query}". 
    2. **VERBOT DER VERWECHSLUNG**: Wenn du den exakten Code nicht findest, antworte: "Code [CODE] nicht im Handbuch gefunden." Antworte NIEMALS mit einem ähnlichen Code (wie F5.9), nur weil er in der Nähe steht.
    3. **WÖRTLICHE WIEDERGABE**: Kopiere den Text 1:1 aus dem Handbuch. Füge keine eigenen Erklärungen hinzu.
    4. **FORMATIERUNG**:
      - Gefundener Code: [EXAKTER CODE]
      - Originaltext (Deutsch): [TEXT AUS DEM HANDBUCH]
      - Übersetzung (Rumänisch): [DEINE ÜBERSETZUNG]
      - Fundstelle: [SEITE/KAPITEL]

    5. **NULL-TOLERANZ-HALTUNG**: Wenn der Text im Handbuch besagt: "Fehler des digitalen Endschalters", dann schreibe genau das. Schreibe NICHTS über "Antrieb folgt nicht der Fahrtrichtung", wenn das zu einem anderen Code gehört.

    MANUAL-KONTEXT (DEINE EINZIGE QUELLE):
    ${truncatedContent}`;

  try {
    const { text } = await generateText({
      model: xai(model),
      system: systemPrompt, // System prompt ca string simplu
      messages: [
        ...history.map(h => ({
          role: h.role, // Păstrează 'user' și 'assistant' – standard OpenAI/xAI
          content: h.text,
        })),
        { role: 'user', content: query },
      ],
      temperature: useThinking ? 1.0 : 0.0, // Thinking: mai creativ; Normal: deterministic
      topP: 0.1, // Focusat pe probabil
      frequencyPenalty: 1.0, // Anti-repetiție
      presencePenalty: 1.0, // Încurajează conținut nou
      // toolChoice: 'required', // Dacă adaugi tools ulterior
      // maxTokens: 4096, // Opțional, limitează output
    });

    return text || "Ne pare rău, nu am putut genera un răspuns.";
  } catch (error: any) {
    console.error("xAI API Error:", error);
    
    // Error handling specific
    if (error.message?.includes("invalid api key") || error.status === 401) {
      throw new Error("KEY_ERROR");
    } else if (error.status === 429) {
      return "Quota depășită – încearcă mai târziu.";
    }
    
    return "A apărut o eroare la comunicarea cu AI-ul. Manualul ar putea fi prea mare sau există o problemă de conexiune.";
  }
}