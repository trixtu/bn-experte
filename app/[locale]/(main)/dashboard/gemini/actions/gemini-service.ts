"use server";

import { ModelType } from "@/types";
import { GenerateContentConfig, GoogleGenAI } from "@google/genai";


/**
 * În Next.js Server Actions, exportăm direct funcții, nu clase.
 */
export async function askAssistant(
  assistantContent: string,
  history: { role: 'user' | 'assistant'; text: string }[],
  query: string,
  useThinking: boolean = false,
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("KEY_ERROR");
  }

  const ai = new GoogleGenAI({ apiKey });
  // const model = useThinking ? ModelType.PRO : ModelType.FLASH;
  const model = useThinking ? ModelType.PRO : ModelType.FLASH;
  
  // Limita de 1.000.000 caractere este igură pentru Gemini 3 în 2026.
  const contextLimit = 1000000;
  const truncatedContent = assistantContent.length > contextLimit 
    ? assistantContent.substring(0, contextLimit) + "... [Manual tăiat din cauza dimensiunii extreme]"
    : assistantContent;

   /**
   * INSTRUCTIUNI DE PRECIZIE MAXIMA:
   * Am adăugat reguli de "Citare Directă" și am eliminat Google Search 
   * pentru a nu amesteca datele din manual cu datele de pe internet.
   */
  
  // Structura corectă pentru Gemini 3 SDK
  const systemInstruction = `DU BIST EIN TECHNISCHES LESESYSTEM. DEINE EINZIGE AUFGABE IST DAS ZITIEREN.

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

  const config:GenerateContentConfig = {
    systemInstruction:systemInstruction,
    temperature: useThinking ? 1.0 : 0.0, // Thinking mode necesită temperatură mai mare
    topP: 0.1,
    topK: 1
  };

  if (useThinking) {
    config.thinkingConfig = { includeThoughts: true };
  }

  try {
    const response = await ai.models.generateContent({
      model: model, // Gemini 3 acceptă systemInstruction la nivel de root
      contents: [
        ...history.map(h => ({
          role: h.role === 'user' ? 'user' : 'model',
          parts: [{ text: h.text }]
        })),
        { role: 'user', parts: [{ text: query }] }
      ],
      config: config,
    });

    return response.text || "Ne pare rău, nu am putut genera un răspuns.";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    // Verificăm erorile specifice de Key sau Quota
    if (error.message?.includes("Requested entity was not found") || error.status === 404) {
      throw new Error("KEY_ERROR");
    }
    
    return "A apărut o eroare la comunicarea cu AI-ul. Manualul ar putea fi prea mare sau există o problemă de conexiune.";
  }
}
