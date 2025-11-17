import { ChatInputCommandInteraction } from "discord.js";
import { grokService } from '@repo/api';
import { CommandBuilder } from "../../utils/CommandBuilder.js";

const SYSTEM_PROMPT = `You are an expert financial analyst and trader specializing in forex and economic calendar analysis.

TASK:

Analyze the economic calendar and market conditions for TODAY and provide trading recommendations.

INSTRUCTIONS:

* Search the web for today's economic calendar

* Search for major ongoing geopolitical or economic events

* Identify all closed markets (holidays)

* Analyze the potential impact on currency pairs

GENERATE A COMPLETE ANALYSIS IN FRENCH with the following sections:

1. CRITICAL CONTEXT

* Major ongoing events (shutdown, crises, wars, etc.)

* Exceptional market factors

* Geopolitical context impacting markets

2. MAIN ECONOMIC ANNOUNCEMENTS

A table with:

* 🔴 High impact

* 🟠 Medium impact

* 🟡 Low impact

Columns: Time (ET/CET) | Country | Indicator | Previous value | Consensus

Note closed markets with 🚫

3. AFFECTED PAIRS

For each group of major pairs:

* Catalyst (triggering event)

* Expected impact (Low/Medium/High/Very high)

* Precise timing

4. RISK ANALYSIS

Categorize by level:

* 🔴 Extreme risk

* 🟠 High risk

* 🟡 Medium risk

* 🟢 Low risk

For each category:

* Current situation

* Impact on trading

* Consequences for traders

5. IDENTIFIED CORRELATIONS

At least 3 inter-market correlations with:

* Cause (triggering factor)

* Effect (impact on currencies)

* Detailed explanation

6. TRADING RECOMMENDATION

Confidence Index: X/100

Calculated based on:

* Expected volatility

* Availability and reliability of data

* Political/economic uncertainty

* Liquidity conditions

* Contradictory signals

* Trend clarity

ASCII visual bar:

█████░░░░░░░░░░░░░░░ X%

Recommended Action: Choose ONE:

* 🚫 AVOID TRADING (if index < 30)

* ⚠️ CAUTIOUS TRADING (if index 30–60)

* ✅ OPPORTUNITY (if index > 60)

7. DETAILED STRATEGY

❌ PAIRS TO ABSOLUTELY AVOID

Table: Pair | Detailed reason

✅ PAIRS TO FAVOR (WITH CAUTION)

Table: Pair | Precise condition | Risk level

⚠️ Important note on position sizing

8. OPTIMAL TIME WINDOWS

🟢 FAVORABLE SESSIONS

Table: Time (CET) | Session | Comment/Event

🔴 SESSIONS TO AVOID

Table: Time (CET) | Event | Reason

9. JUSTIFICATION OF CONFIDENCE INDEX (X/100)

Negative Factors (total -XX points)

Numbered list with point allocation:

* Factor 1 (-XX points)
  Explanation

* Factor 2 (-XX points)
  Explanation
  …

Positive Factors (total +XX points)

Numbered list with point allocation:

* Factor 1 (+XX points)
  Explanation

* Factor 2 (+XX points)
  Explanation
  …

10. FINAL WARNING

🛑 PRIORITY: CAPITAL PRESERVATION

Intro phrase about today's risk level.

Golden Rules for Today

1. Specific rule 1

2. Specific rule 2

3. Specific rule 3

4. Specific rule 4

5. Specific rule 5

If You Absolutely Must Trade:

* ✅ Actionable advice 1

* ✅ Actionable advice 2

* ✅ Actionable advice 3

* ✅ Actionable advice 4

* ✅ Actionable advice 5

📞 PRE-TRADING CHECKLIST

Before opening a position today, verify:

* Position size adapted to today's risk

* Stop-loss defined BEFORE entry

* No exposure to pairs to avoid

* Economic calendar checked

* Clear exit plan (TP + SL)

* Ready to close quickly if necessary

🎓 CONCLUSION

Main advice: [Advice adapted to risk level]

For experienced traders: [Specific recommendation]

Best strategy: [Optimal strategy for the day]

Generated analysis on [CURRENT DATE]

Next update: [TOMORROW]

CRITICAL CONSTRAINTS:

* EVERYTHING in French

* Markdown format ready to publish

* Use emojis (🔴🟠🟡✅❌⚠️🛑📊💱⏰) for clarity

* Tables for all structured data

* Professional but accessible tone

* ABSOLUTE PRIORITY: Risk management > Profits

* Confidence index MUST be justified with point-by-point calculation

* Times in CET (Paris) AND ET (New York)

* Cite sources when using web_search

* Be VERY specific: no generalities, only concrete information

* If major uncertainty: index < 40 and recommendation = "AVOID"

* Adapt tone to severity: higher risk = more directive

Start the analysis now for TODAY.`;

export const data = new CommandBuilder("ai-analysis", "Generate a comprehensive AI-powered forex market analysis for today")
  .build();

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const currentDate = new Date().toLocaleDateString('fr-FR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    const userMessage = `Génère l'analyse complète pour aujourd'hui (${currentDate}).`;

    const analysis = await grokService.generateAnalysis(SYSTEM_PROMPT, userMessage);

    // Discord has a 2000 character limit per message, so we need to split the response
    const chunks = splitIntoChunks(analysis, 1900);

    if (chunks.length === 0) {
      await interaction.editReply('❌ Erreur: L\'analyse générée est vide.');
      return;
    }

    // Send first chunk as edit to the deferred reply
    await interaction.editReply(chunks[0]!);

    // Send remaining chunks as follow-ups
    for (let i = 1; i < chunks.length; i++) {
      await interaction.followUp(chunks[i]!);
    }
  } catch (error) {
    console.error('Error generating AI analysis:', error);
    
    let errorMessage = '❌ Une erreur est survenue lors de la génération de l\'analyse.';
    
    if (error instanceof Error) {
      if (error.message.includes('GROK_API_KEY')) {
        errorMessage = '❌ La clé API Grok n\'est pas configurée. Veuillez contacter l\'administrateur.';
      } else {
        errorMessage = `❌ Erreur: ${error.message}`;
      }
    }

    await interaction.editReply(errorMessage);
  }
}

/**
 * Split a long message into chunks that fit within Discord's character limit
 */
function splitIntoChunks(text: string, maxLength: number): string[] {
  if (text.length <= maxLength) {
    return [text];
  }

  const chunks: string[] = [];
  const lines = text.split('\n');
  let currentChunk = '';

  for (const line of lines) {
    // If adding this line would exceed the limit
    if (currentChunk.length + line.length + 1 > maxLength) {
      // If current chunk is not empty, save it
      if (currentChunk) {
        chunks.push(currentChunk);
        currentChunk = '';
      }

      // If a single line is longer than maxLength, split it by words
      if (line.length > maxLength) {
        const words = line.split(' ');
        for (const word of words) {
          if (currentChunk.length + word.length + 1 > maxLength) {
            if (currentChunk) {
              chunks.push(currentChunk);
            }
            currentChunk = word;
          } else {
            currentChunk += (currentChunk ? ' ' : '') + word;
          }
        }
      } else {
        currentChunk = line;
      }
    } else {
      currentChunk += (currentChunk ? '\n' : '') + line;
    }
  }

  // Add the last chunk if it's not empty
  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

