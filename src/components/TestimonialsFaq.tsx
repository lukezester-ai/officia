import { Star, ChevronDown, HelpCircle } from "lucide-react";

const testimonials = [
  {
    quote: "Officia промени изцяло начина, по който управляваме счетоводството си. Всичко е автоматизирано и спестяваме десетки часове всеки месец.",
    name: "Мария Иванова",
    role: "Главен счетоводител, TechCorp",
    avatar: "M"
  },
  {
    quote: "AI асистентът е невероятен. Просто качвам фактурите и той извлича всички данни без грешка. Горещо препоръчвам!",
    name: "Иван Димитров",
    role: "Управител, BuildM",
    avatar: "И"
  },
  {
    quote: "След преминаването към Officia, комуникацията с банката и отчитането на ДДС станаха детска игра. Интерфейсът е модерен и интуитивен.",
    name: "Петя Георгиева",
    role: "Финансов директор, SoftSolutions",
    avatar: "П"
  }
];

const faqs = [
  {
    question: "Съвместим ли е с НАП?",
    answer: "Абсолютно! Officia генерира всички необходими ДДС дневници и справки-декларации във формат, готов за директно подаване в портала на НАП."
  },
  {
    question: "Мога ли да импортирам от друга програма?",
    answer: "Да, поддържаме импорт на начални салда, номенклатури и контрагенти чрез Excel/CSV файлове, за да направим миграцията ви максимално лесна."
  },
  {
    question: "Как работи AI асистентът за документи?",
    answer: "AI асистентът анализира вашите PDF или сканирани фактури, разпознава ключови данни като суми, дати и контрагенти, и автоматично подготвя счетоводните записи."
  },
  {
    question: "Мога ли да използвам Officia за множество фирми?",
    answer: "Да, системата поддържа мулти-тенант архитектура. Можете лесно да превключвате между различни фирми (работни пространства) от един и същи профил."
  },
  {
    question: "Сигурни ли са данните ми?",
    answer: "Използваме Enterprise-grade сигурност с криптиране на данните в покой и при пренос, ежедневни бекъпи и стриктен контрол на достъпа чрез Clerk."
  },
  {
    question: "Има ли безплатен тестов период?",
    answer: "Да, предлагаме 14-дневен безплатен пробен период, в който можете да тествате всички функционалности на платформата без обвързване."
  }
];

export default function TestimonialsFaq() {
  return (
    <section className="py-24 px-6 bg-zinc-950 border-y border-white/5 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Testimonials */}
        <div className="mb-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Какво казват клиентите ни</h2>
            <p className="text-zinc-400 max-w-2xl mx-auto">Над 500+ български фирми вече се доверяват на Officia за своето счетоводство и управление на бизнеса.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-white/3 border border-white/8 rounded-2xl p-6 hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-1 mb-4 text-amber-400">
                  {[...Array(5)].map((_, j) => <Star key={j} size={16} fill="currentColor" />)}
                </div>
                <p className="text-zinc-300 text-sm leading-relaxed mb-6">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center font-bold text-white shadow-lg">
                    {t.avatar}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{t.name}</div>
                    <div className="text-xs text-zinc-500">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <HelpCircle size={24} className="text-indigo-400" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Често задавани въпроси</h2>
            <p className="text-zinc-400">Отговори на най-популярните въпроси за платформата.</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <details key={i} className="group bg-white/3 border border-white/8 rounded-2xl overflow-hidden [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex items-center justify-between cursor-pointer p-6 font-medium text-white hover:bg-white/5 transition-colors">
                  {faq.question}
                  <ChevronDown size={18} className="text-zinc-500 transition-transform group-open:rotate-180" />
                </summary>
                <div className="px-6 pb-6 text-sm text-zinc-400 leading-relaxed">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
