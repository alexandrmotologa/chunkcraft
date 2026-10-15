import { GoldenQuery } from './metrics.js';

/**
 * Synthesizes realistic golden evaluation queries directly from document structure and sections.
 */
export function generateGoldenQueries(documentText: string, maxQueries: number = 5): GoldenQuery[] {
  const queries: GoldenQuery[] = [];
  const lines = documentText.split('\n');

  interface ExtractedSection {
    title: string;
    body: string[];
  }

  const sections: ExtractedSection[] = [];
  let currentSection: ExtractedSection | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) {
      if (currentSection && currentSection.body.length > 0) {
        sections.push(currentSection);
      }
      const title = trimmed.replace(/^#+\s*/, '').replace(/[:\-_]/g, ' ').trim();
      currentSection = { title, body: [] };
    } else if (currentSection && trimmed.length > 20) {
      // Ignore markdown links, tables or code fences for query formulation
      if (!trimmed.startsWith('|') && !trimmed.startsWith('```') && !trimmed.startsWith('http')) {
        currentSection.body.push(trimmed);
      }
    }
  }

  if (currentSection && currentSection.body.length > 0) {
    sections.push(currentSection);
  }

  // If no markdown headings found, split by double newlines into large paragraphs
  if (sections.length === 0) {
    const paragraphs = documentText.split(/\n\s*\n/).filter(p => p.trim().length > 50);
    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i].trim();
      const firstSentence = p.split(/[.!?]/)[0] || 'Section ' + (i + 1);
      sections.push({
        title: firstSentence.slice(0, 50),
        body: [p]
      });
    }
  }

  const selectedSections = sections.slice(0, maxQueries);

  for (let i = 0; i < selectedSections.length; i++) {
    const sec = selectedSections[i];
    const fullBody = sec.body.join(' ');
    const sentences = fullBody.split(/(?<=[.!?])\s+/).filter(s => s.length > 25);

    // Extract notable keywords (length > 4, non-stopwords)
    const words = (sec.title + ' ' + fullBody)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 4 && !isStopWord(w));

    const uniqueKeywords = Array.from(new Set(words)).slice(0, 6);

    // Take a distinctive 4-8 word snippet from the body as expectedMatchingSubstrings
    let snippet = '';
    if (sentences.length > 0) {
      const targetSentence = sentences[0];
      const sentenceWords = targetSentence.split(/\s+/);
      if (sentenceWords.length >= 6) {
        snippet = sentenceWords.slice(1, 6).join(' ');
      } else {
        snippet = targetSentence;
      }
    }

    const queryTemplates = [
      `What are the requirements and specifications for ${sec.title}?`,
      `How does the system implement ${sec.title}?`,
      `Explain the protocol and architecture behind ${sec.title}.`,
      `What details are outlined regarding ${sec.title}?`
    ];

    const formulatedQuery = queryTemplates[i % queryTemplates.length];

    queries.push({
      id: `synth_q${String(i + 1).padStart(2, '0')}`,
      query: formulatedQuery,
      relevantKeywords: uniqueKeywords,
      expectedMatchingSubstrings: snippet ? [snippet] : undefined
    });
  }

  return queries;
}

function isStopWord(word: string): boolean {
  const common = new Set([
    'this', 'that', 'with', 'from', 'have', 'were', 'which', 'their', 'there',
    'about', 'would', 'could', 'should', 'these', 'those', 'where', 'after',
    'before', 'between', 'under', 'while', 'using', 'through', 'system', 'must'
  ]);
  return common.has(word);
}
