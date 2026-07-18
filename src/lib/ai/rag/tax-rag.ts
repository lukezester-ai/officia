// @ts-nocheck
import { TAX_KNOWLEDGE_BASE, TaxLawArticle } from './knowledge-base';

/**
 * ЕПИК 4: Дълбок AI Данъчен Съветник (RAG Searcher)
 * Търсачка, която анализира потребителския въпрос и намира релевантни правни членове.
 * За MVP версията използваме базово Keyword Match-ване, вместо векторни ембединги.
 */

export function findRelevantTaxLaws(query: string): TaxLawArticle[] {
  const normalizedQuery = query.toLowerCase();
  
  // Резултати, сортирани по "релевантност" (брой срещнати ключови думи)
  const scoredArticles = TAX_KNOWLEDGE_BASE.map(article => {
    let score = 0;
    
    // Директно споменаване на члена (напр. "чл. 97а")
    if (normalizedQuery.includes(article.article.toLowerCase())) {
      score += 10;
    }
    
    // Търсене по ключови думи
    for (const keyword of article.keywords) {
      if (normalizedQuery.includes(keyword.toLowerCase())) {
        score += 1;
      }
    }
    
    return { article, score };
  });

  // Филтрираме само тези, които имат поне 1 съвпадение, и сортираме по резултат
  const relevant = scoredArticles
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(item => item.article);
    
  // Връщаме топ 2 най-релевантни закона, за да не препълваме контекста
  return relevant.slice(0, 2);
}

/**
 * Генерира системния промпт с инжектиран контекст (ако има такъв)
 */
export function buildRagSystemPrompt(systemBase: string, relevantLaws: TaxLawArticle[]): string {
  if (relevantLaws.length === 0) return systemBase;
  
  let contextStr = '<context>\nСледната информация представлява официални извадки от Българското законодателство. ТИ СИ ДЛЪЖЕН да я използваш, за да отговориш на въпроса. НЕ ХАЛЮЦИНИРАЙ ЗАКОНИ, които не са в този контекст.\n\n';
  
  for (const law of relevantLaws) {
    contextStr += `[${law.law}] ${law.article} - ${law.title}\n`;
    contextStr += `${law.content}\n\n`;
  }
  contextStr += '</context>\n\n';
  contextStr += 'Инструкция: Анализирай казуса на потребителя спрямо горепосочения правен <context>. Цитирай конкретните членове в отговора си и обясни ясно на потребителя какво трябва да направи.';

  return `${systemBase}\n\n${contextStr}`;
}
