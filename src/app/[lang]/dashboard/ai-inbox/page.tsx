import InboxClient from "./InboxClient";

export default function AIInboxPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">AI Inbox</h1>
        <p className="text-slate-500 dark:text-slate-400">
          Списък с аномалии, измами и грешки, засечени от AI Надзорника (Watchdog).
        </p>
      </div>
      
      <InboxClient />
    </div>
  );
}
