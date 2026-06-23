"use client";
// @ts-nocheck

import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowLeft, CheckCircle, Shield, Zap, Users } from "lucide-react";
import { motion } from "framer-motion";

export default function RegisterPage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" },
    },
  };

  const featureVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: { delay: 0.3 + i * 0.1, duration: 0.5 },
    }),
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex">
      {/* Left Side - Marketing */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(at_50%_30%,rgba(59,130,246,0.18),transparent)]" />

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Link href="/" className="flex items-center gap-3 mb-12 group">
            <motion.div
              whileHover={{ rotate: 12, scale: 1.1 }}
              className="w-10 h-10 bg-gradient-to-br from-blue-500 to-violet-600 rounded-2xl flex items-center justify-center"
            >
              <span className="font-bold text-3xl">O</span>
            </motion.div>
            <span className="font-semibold text-3xl tracking-tight">Officia</span>
          </Link>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.7 }}
            className="text-5xl font-bold tracking-tighter leading-tight mb-8"
          >
            Автоматизирай бизнеса си.<br />
            <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
              Още днес.
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-xl text-zinc-400 max-w-md mb-10"
          >
            Присъедини се към стотици български фирми, които вече използват Officia.
          </motion.p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {[
            { icon: <Zap className="w-6 h-6" />, text: "AI анализ на фактури и договори" },
            { icon: <CheckCircle className="w-6 h-6" />, text: "Автоматично ДДС и счетоводство" },
            { icon: <Users className="w-6 h-6" />, text: "Управление на контрагенти и служители" },
            { icon: <Shield className="w-6 h-6" />, text: "Банкова синхронизация + AI съпоставяне" },
          ].map((item, index) => (
            <motion.div
              key={index}
              custom={index}
              variants={featureVariants}
              className="flex items-start gap-4 group"
            >
              <motion.div
                whileHover={{ scale: 1.2, rotate: 5 }}
                className="mt-1 text-blue-400 transition-colors group-hover:text-blue-300"
              >
                {item.icon}
              </motion.div>
              <p className="text-lg">{item.text}</p>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-sm text-zinc-500"
        >
          © 2026 Officia • Сигурно и GDPR съвместимо
        </motion.div>
      </div>

      {/* Right Side - Registration Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          {/* Mobile Header */}
          <div className="lg:hidden flex justify-between items-center mb-10">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-violet-600 rounded-xl flex items-center justify-center">
                <span className="font-bold text-2xl">O</span>
              </div>
              <span className="font-semibold text-2xl">Officia</span>
            </Link>
            <Link href="/">
              <ArrowLeft className="w-6 h-6 text-zinc-400" />
            </Link>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-10 text-center lg:text-left"
          >
            <h1 className="text-4xl font-bold tracking-tight mb-3">Създай акаунт</h1>
            <p className="text-zinc-400 text-lg">
              Започни безплатно • 14 дни пълен достъп
            </p>
          </motion.div>

          {/* Clerk Sign Up with animation wrapper */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="bg-zinc-900/70 border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur-xl"
          >
            <SignUp 
              appearance={{
                elements: {
                  rootBox: "w-full",
                  card: "bg-transparent shadow-none p-0 w-full",
                  headerTitle: "hidden",
                  headerSubtitle: "hidden",
                  
                  formButtonPrimary: 
                    "bg-gradient-to-r from-blue-600 via-violet-600 to-fuchsia-600 hover:brightness-110 text-white font-semibold py-7 text-base rounded-2xl transition",
                  
                  formFieldInput: 
                    "bg-zinc-950 border border-white/20 focus:border-blue-500 text-white rounded-2xl py-7 px-5 text-base",
                  
                  formFieldLabel: "text-zinc-300",
                  footerActionLink: "text-blue-400 hover:text-blue-300 text-sm",
                  
                  socialButtonsBlockButton: 
                    "border border-white/20 hover:bg-white/5 rounded-2xl py-6 text-white",
                  
                  dividerLine: "bg-white/10",
                  dividerText: "text-zinc-500",
                },
              }}
              signInUrl="/sign-in"
              forceRedirectUrl="/dashboard"
            />
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-center text-xs text-zinc-500 mt-8 px-4"
          >
            Създавайки акаунт, приемаш нашите{" "}
            <Link href="/terms" className="text-blue-400 hover:underline">
              Общи условия
            </Link>{" "}
            и{" "}
            <Link href="/privacy" className="text-blue-400 hover:underline">
              Политика за поверителност
            </Link>
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
