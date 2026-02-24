"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles, ShieldCheck, History, Download, PenTool, BookOpen } from "lucide-react";

const features = [
  {
    icon: PenTool,
    title: "AI 智能续写",
    desc: "基于上下文与设定，AI 自动生成连贯的章节内容，支持实时流式输出。",
  },
  {
    icon: ShieldCheck,
    title: "一致性检查 & 修复",
    desc: "AI 检测与设定库的矛盾，一键生成修复方案，预览后应用。",
  },
  {
    icon: History,
    title: "版本快照",
    desc: "随时创建章节快照，误操作可一键回滚到任意历史版本。",
  },
  {
    icon: BookOpen,
    title: "设定百科",
    desc: "角色、功法、境界、势力——所有设定集中管理，AI 写作时自动引用。",
  },
  {
    icon: Sparkles,
    title: "大纲生成",
    desc: "输入灵感，AI 自动生成分卷与章节大纲，一键导入项目结构。",
  },
  {
    icon: Download,
    title: "一键导出",
    desc: "将作品导出为 TXT 文件，方便投稿或离线阅读。",
  },
];

export default function LandingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) {
        router.replace("/dashboard");
        return;
      }
    }
    setChecking(false);
  }, [router]);

  if (checking) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          NovelAI Studio · 笔阵
        </span>
        <div className="flex gap-3">
          <Button variant="ghost" size="sm" asChild className="text-zinc-300 hover:text-white">
            <Link href="/login">登录</Link>
          </Button>
          <Button size="sm" asChild className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 border-0">
            <Link href="/register">免费注册</Link>
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center text-center px-6 pt-24 pb-20 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-8 text-sm text-zinc-300">
          <Sparkles className="h-4 w-4 text-purple-400" />
          AI 驱动的网文创作工具
        </div>
        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight leading-tight mb-6">
          <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
            让 AI 成为你的
          </span>
          <br />
          最强笔友
        </h1>
        <p className="text-lg sm:text-xl text-zinc-400 max-w-2xl mb-10 leading-relaxed">
          从大纲构思到章节创作，从设定管理到一致性校验——
          NovelAI Studio 为男频网文作者打造全流程 AI 写作伴侣。
        </p>
        <div className="flex gap-4">
          <Button size="lg" asChild className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 border-0 text-base px-8 h-12">
            <Link href="/register">开始创作</Link>
          </Button>
          <Button size="lg" variant="outline" asChild className="border-zinc-700 text-zinc-300 hover:bg-white/5 text-base px-8 h-12">
            <Link href="/login">已有账号</Link>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-4">核心功能</h2>
        <p className="text-zinc-400 text-center mb-14 max-w-xl mx-auto">
          一站式覆盖网文创作的每个环节
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 hover:border-purple-500/50 hover:bg-zinc-800/50 transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600/20 to-pink-600/20 flex items-center justify-center mb-4 group-hover:from-purple-600/30 group-hover:to-pink-600/30 transition-colors">
                <f.icon className="h-5 w-5 text-purple-400" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <div className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-800 p-12">
          <h2 className="text-3xl font-bold mb-4">准备好开始创作了吗？</h2>
          <p className="text-zinc-400 mb-8 max-w-lg mx-auto">
            注册即可免费体验所有功能，让 AI 帮你写出下一部爆款网文。
          </p>
          <Button size="lg" asChild className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 border-0 text-base px-10 h-12">
            <Link href="/register">免费注册，立即体验</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-8 text-center text-sm text-zinc-500">
        <p>© 2026 NovelAI Studio · AI 网文创作工具</p>
      </footer>
    </div>
  );
}
