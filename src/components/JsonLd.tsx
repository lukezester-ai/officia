type JsonLdProps = {
  data: Record<string, unknown>;
};

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

const faqData = [
  { question: "Съвместим ли е с НАП?", answer: "Officia поддържа ДДС дневници и ZIP експорт за НАП. Директно подаване към НАП с КЕП при активирана схема." },
  { question: "Мога ли да импортирам от друга програма?", answer: "В момента има CSV обработка за банкови извлечения. Пълният внос на начални салда и контрагенти е в процес на разработка." },
  { question: "Как работи AI асистентът?", answer: "Асистентът извлича данни от качени документи чрез Claude AI — доставчик, сума, ДДС, дата — и предлага осчетоводяване с човешки преглед." },
  { question: "Мога ли да използвам Officia за множество фирми?", answer: "Да, системата поддържа разделяне на данните по фирмени пространства с превключване между тях." },
  { question: "Сигурни ли са данните ми?", answer: "Достъпът е защитен чрез Clerk с MFA, PostgreSQL база и изолирани фирмени пространства." },
  { question: "Има ли безплатен тестов период?", answer: "Да — 14 дни пълен достъп без кредитна карта. След това продължавате с план Стартер (50 фактури/месец) или по-висок." },
];

export function FaqSchema() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqData.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
          },
        })),
      }}
    />
  );
}

export function OrganizationSchema() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "Officia",
        url: "https://officiabg.com",
        logo: "https://officiabg.com/og-image.png",
        description: "AI ERP система за български фирми — счетоводство, фактури, ТРЗ, HR и банкиране на едно място.",
        areaServed: { "@type": "Country", name: "BG" },
        foundingDate: "2024",
      }}
    />
  );
}

export function SoftwareAppSchema() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "Officia",
        operatingSystem: "Web",
        applicationCategory: "BusinessApplication",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "EUR",
          description: "Starter plan — 50 фактури/месец безплатно",
        },
        description: "AI ERP за български фирми — счетоводство, фактури, ТРЗ, HR и банкиране.",
        areaServed: { "@type": "Country", name: "BG" },
      }}
    />
  );
}
