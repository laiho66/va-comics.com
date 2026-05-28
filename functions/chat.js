import { extendedLoreBrain } from './lore.js';

export async function onRequestPost(context) {
  try {
    const { message, history } = await context.request.json();
    const cleanPrompt = (message || "").toLowerCase();

    // ==========================================
    // 1. THE EDGE FIREWALL (FAST DROPS)
    // ==========================================
    const realWorldKeywords = ["new york", "nyc", "manhattan", "chatgpt", "openai", "ignore previous instructions"];
    const hazardousKeywords = ["bomb", "explosive", "ied", "weapon blueprint"];

    const isRealWorld = realWorldKeywords.some(keyword => cleanPrompt.includes(keyword));
    const isHazardous = hazardousKeywords.some(keyword => cleanPrompt.includes(keyword));

    if (isHazardous) {
      return new Response(JSON.stringify({ response: "[ACCESS DENIED // HAZARDOUS PAYLOAD DETECTED]" }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    if (isRealWorld) {
      return new Response(JSON.stringify({ response: "[UNMAPPED COORDINATES // SECTOR VOID]" }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // STRICT METRIC CHECK: Intercept and drop sector numbers outside our official database limits instantly
    const sectorMatch = cleanPrompt.match(/\bsector\s+(\d+)\b/);
    if (sectorMatch) {
      const sectorNumberStr = sectorMatch[1];
      // Normalize single digits to match lore keys (e.g., "1" becomes "01")
      const normalizedKey = sectorNumberStr.length === 1 ? `0${sectorNumberStr}` : sectorNumberStr;
      
      // If the extracted sector number is missing from your lore.js sectors object, hard-drop immediately
      if (!extendedLoreBrain.sectors.hasOwnProperty(normalizedKey)) {
        return new Response(JSON.stringify({ response: "[UNMAPPED COORDINATES // SECTOR VOID]" }), {
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // ==========================================
    // 2. THE LIGHTWEIGHT LORE MATRIX EXTRACTOR
    // ==========================================
    let targetedContext = extendedLoreBrain.world; // Default baseline context

    // HARDCODED OVERRIDE: Catch character or sector database counts and lists instantly
    if (
      cleanPrompt.includes("list") || 
      cleanPrompt.includes("how many") || 
      cleanPrompt.includes("all characters") || 
      cleanPrompt.includes("all sectors") || 
      cleanPrompt.includes("all the characters") ||
      cleanPrompt.includes("all the sectors")
    ) {
      targetedContext += `\n\nOFFICIAL CITY AND CHARACTER METRICS:\n${JSON.stringify(extendedLoreBrain.database_metrics)}`;
    }

    // Rebuilt v2.0 routing override for the protagonist
    if (cleanPrompt.includes("who is dead drop") || cleanPrompt.includes("what is dead drop")) {
      targetedContext += `\n\nCHARACTER PROFILE:\n${extendedLoreBrain.characters["dead drop"]}`;
    }

    // Check if user is scanning a character key
    for (const charName in extendedLoreBrain.characters) {
      if (cleanPrompt.includes(charName)) {
        targetedContext += `\n\nCHARACTER PROFILE:\n${extendedLoreBrain.characters[charName]}`;
      }
    }

    // SMART NORMALIZATION LOOP: Matches single digits ("sector 1") or padded database digits ("sector 01") interchangeably
    for (const sectorNum in extendedLoreBrain.sectors) {
      const numericVal = parseInt(sectorNum, 10);
      const regexPadded = new RegExp(`\\bsector\\s+${sectorNum}\\b`, 'i');    // matches "sector 01"
      const regexRaw = new RegExp(`\\bsector\\s+${numericVal}\\b`, 'i');      // matches "sector 1"
      
      const hasAlias = (sectorNum === "00" && cleanPrompt.includes("dredge")) || (sectorNum === "01" && cleanPrompt.includes("slums"));
      
      if (regexPadded.test(cleanPrompt) || regexRaw.test(cleanPrompt) || hasAlias) {
        targetedContext += `\n\nSECTOR INTELLIGENCE:\n${extendedLoreBrain.sectors[sectorNum]}`;
      }
    }

    // Check if user is querying the black site
    if (cleanPrompt.includes("foundry") || cleanPrompt.includes("black-site") || cleanPrompt.includes("facility")) {
      targetedContext += `\n\nFACILITY INTELLIGENCE:\n${extendedLoreBrain.foundry}`;
    }

    // ==========================================
    // 3. ZERO-NONSENSE INDUSTRIAL TERMINAL PRESET
    // ==========================================
    const systemInstruction = `You are the automated utility terminal AI core of the Foundry facility (FOUNDRY_OS). 

OPERATIONAL PROTOCOLS:
- Tone: Cold, flat, and strictly to the point. Completely eliminate all theatrical character fluff, swagger, bragging, bad jokes, and welcoming or closing pleasantries. Treat queries purely as data requests.
- Scope: You only possess information regarding the Dead Drop comic universe, its characters, and its geographic sectors. Completely refuse to answer queries regarding the real world.
- Format: Keep all data readouts compressed, clear, and punchy. Limit descriptions to a maximum of 2 to 3 sentences per query to prevent terminal text overflow.
- Enforcement: If provided with OFFICIAL CITY AND CHARACTER METRICS, you must strictly return ONLY the names/sectors listed under authorized_character_list, authorized_factions, and authorized_sector_list. Do not invent any other names or sectors under any circumstance.

Use the following targeted database file to extract your answers:
${targetedContext}`;

    // ==========================================
    // 4. SECURE PAYLOAD PACKAGING
    // ==========================================
    const formattedHistory = (history || []).map(turn => ({
      role: turn.role === "system" ? "user" : turn.role,
      content: turn.content || turn.text || ""
    }));

    const messages = [
      { role: "user", content: `[INITIALIZE CORE AUTOMATION]\n\n${systemInstruction}\n\nAcknowledge parameters.` },
      { role: "assistant", content: "[FOUNDRY_OS // UTILITY DATA LINK ESTABLISHED // READY]" },
      ...formattedHistory,
      { role: "user", content: message }
    ];

    // ==========================================
    // 5. MAIN RUNTIME EXECUTION
    // ==========================================
    const aiResponse = await context.env.AI.run("@cf/meta/llama-3-8b-instruct", {
      messages: messages,
      max_tokens: 300
    });

    let finalReply = aiResponse.response;
    if (!finalReply || finalReply.trim() === "") {
      finalReply = "[TERMINAL TIMEOUT // CONSOLE DATA DROP]";
    }

    return new Response(JSON.stringify({ response: finalReply }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
