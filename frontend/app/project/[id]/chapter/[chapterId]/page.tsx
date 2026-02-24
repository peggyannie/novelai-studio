"use client";

import { use, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import api, { Chapter, getChapter, updateChapter, aiContinue, aiRewrite, aiContinueStream, Snapshot, createSnapshot, getSnapshots, rollbackSnapshot, deleteSnapshot, fixConsistencyIssue } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Save, Sparkles, Wand2, ChevronLeft, History, RotateCcw, Trash2, Eye, Check, X } from "lucide-react";
import Link from "next/link";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { ConsistencyIssue, checkConsistency } from "@/lib/api";

export default function ChapterEditorPage({ params }: { params: Promise<{ id: string; chapterId: string }> }) {
    const router = useRouter();
    const resolvedParams = use(params);
    const projectId = parseInt(resolvedParams.id);
    const chapterId = parseInt(resolvedParams.chapterId);

    const [chapter, setChapter] = useState<Chapter | null>(null);
    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [aiGenerating, setAiGenerating] = useState(false);
    const [consistencyIssues, setConsistencyIssues] = useState<ConsistencyIssue[]>([]);
    const [checkingConsistency, setCheckingConsistency] = useState(false);
    const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
    const [loadingSnapshots, setLoadingSnapshots] = useState(false);
    const [versionSheetOpen, setVersionSheetOpen] = useState(false);
    // Fix workflow state
    const [issueStates, setIssueStates] = useState<Record<number, 'pending' | 'fixing' | 'preview' | 'fixed' | 'ignored'>>({});
    const [fixPreviews, setFixPreviews] = useState<Record<number, { original: string; fixed: string }>>({});
    const [snapshotCreatedForFix, setSnapshotCreatedForFix] = useState(false);

    // Auto-save timer
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!isNaN(chapterId)) {
            fetchChapter();
        }
        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        };
    }, [chapterId]);

    const fetchChapter = async () => {
        try {
            setLoading(true);
            const data = await getChapter(chapterId);
            setChapter(data);
            setContent(data.content || "");
        } catch (error) {
            toast.error("无法加载章节内容");
            console.error(error);
            router.push(`/project/${projectId}`);
        } finally {
            setLoading(false);
        }
    };

    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newContent = e.target.value;
        setContent(newContent);

        // Debounced Auto-save
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
            handleSave(newContent, true);
        }, 3000); // Auto-save after 3s of inactivity
    };

    const handleSave = async (currentContent: string, silent = false) => {
        if (!chapter) return;
        try {
            setSaving(true);
            await updateChapter(chapter.id, { content: currentContent });
            if (!silent) toast.success("已保存");
        } catch (error) {
            if (!silent) toast.error("保存失败");
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    const handleAiContinue = async () => {
        if (!chapter) return;
        setAiGenerating(true);
        // Take up to last 2000 chars as context
        const context = content.slice(-2000);

        // Append with a newline if needed
        let currentText = content;
        if (!currentText.endsWith("\n") && currentText.length > 0) {
            currentText += "\n";
            setContent(currentText);
        }

        await aiContinueStream(
            projectId,
            chapterId,
            context,
            (chunk) => {
                currentText += chunk;
                setContent(currentText);
            },
            () => {
                handleSave(currentText, true);
                toast.success("AI 续写完成");
                setAiGenerating(false);
            },
            (error) => {
                toast.error("AI 续写失败");
                console.error(error);
                setAiGenerating(false);
            }
        );
    };

    // Simplified rewrite for V1: Replace selected text or just append if complicated
    // For specific rewrite UI, we'd need a more complex text editor to handle selection ranges robustly.
    // For this MVP with Textarea, we'll demonstrate a "Rewrite Selection" via prompt if possible,
    // but typically textarea selection handling is manual.
    // Let's implement a simple "Rewrite Last Paragraph" button for now or keep it simple.

    // Actually, getting selection from Ref is possible
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleAiRewriteSelection = async (instruction: string) => {
        if (!textareaRef.current) return;
        const start = textareaRef.current.selectionStart;
        const end = textareaRef.current.selectionEnd;

        if (start === end) {
            toast.error("请先选择一段文本");
            return;
        }

        const selectedText = content.substring(start, end);
        if (selectedText.length > 500) {
            toast.error("选中的文本过长，建议分段重写");
            return;
        }

        try {
            setAiGenerating(true);
            const rewritten = await aiRewrite(projectId, selectedText, instruction);

            // Replace text
            const newContent = content.substring(0, start) + rewritten + content.substring(end);
            setContent(newContent);
            handleSave(newContent, true);
            toast.success("AI 重写完成");
        } catch (error) {
            toast.error("重写失败");
        } finally {
            setAiGenerating(false);
        }
    };

    const handleCheckConsistency = async () => {
        if (!chapter) return;
        setCheckingConsistency(true);
        setIssueStates({});
        setFixPreviews({});
        setSnapshotCreatedForFix(false);
        try {
            const issues = await checkConsistency(chapter.id);
            setConsistencyIssues(issues);
            // Initialize all issues as pending
            const states: Record<number, 'pending'> = {};
            issues.forEach((_, i) => { states[i] = 'pending'; });
            setIssueStates(states);
            if (issues.length === 0) {
                toast.success("未发现明显一致性问题");
            } else {
                toast.warning(`发现了 ${issues.length} 个潜在问题`);
            }
        } catch (error) {
            toast.error("检查失败");
            console.error(error);
        } finally {
            setCheckingConsistency(false);
        }
    };

    const handleGenerateFix = async (index: number) => {
        if (!chapter) return;
        const issue = consistencyIssues[index];
        if (!issue.quote || !issue.suggestion) {
            toast.error("该问题缺少引用或建议，无法生成修复");
            return;
        }
        setIssueStates(prev => ({ ...prev, [index]: 'fixing' }));
        try {
            const result = await fixConsistencyIssue(chapter.id, issue.quote, issue.description, issue.suggestion);
            setFixPreviews(prev => ({ ...prev, [index]: { original: result.original_text, fixed: result.fixed_text } }));
            setIssueStates(prev => ({ ...prev, [index]: 'preview' }));
        } catch (error) {
            toast.error("生成修复失败");
            setIssueStates(prev => ({ ...prev, [index]: 'pending' }));
        }
    };

    const handleApplyFix = async (index: number) => {
        if (!chapter) return;
        const preview = fixPreviews[index];
        if (!preview) return;

        // Auto-create snapshot before first fix
        if (!snapshotCreatedForFix) {
            try {
                await handleSave(content, true);
                await createSnapshot(chapter.id, `修复前自动快照 - ${new Date().toLocaleString('zh-CN')}`);
                setSnapshotCreatedForFix(true);
            } catch (e) {
                console.error('Auto-snapshot failed:', e);
            }
        }

        // Replace in editor content
        const newContent = content.replace(preview.original, preview.fixed);
        if (newContent === content) {
            toast.error("未能在正文中匹配到原文，可能已被修改");
            return;
        }
        setContent(newContent);
        await handleSave(newContent, true);
        setIssueStates(prev => ({ ...prev, [index]: 'fixed' }));
        toast.success("修复已应用");
    };

    const handleIgnoreIssue = (index: number) => {
        setIssueStates(prev => ({ ...prev, [index]: 'ignored' }));
    };

    // --- Version Control ---
    const fetchSnapshots = async () => {
        if (!chapter) return;
        setLoadingSnapshots(true);
        try {
            const data = await getSnapshots(chapter.id);
            setSnapshots(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingSnapshots(false);
        }
    };

    const handleCreateSnapshot = async () => {
        if (!chapter) return;
        try {
            await handleSave(content, true);
            await createSnapshot(chapter.id, `手动快照 - ${new Date().toLocaleString('zh-CN')}`);
            toast.success("快照已创建");
            fetchSnapshots();
        } catch (error) {
            toast.error("创建快照失败");
        }
    };

    const handleRollback = async (snapshotId: number) => {
        try {
            await rollbackSnapshot(snapshotId);
            await fetchChapter();
            toast.success("已回滚到该版本");
        } catch (error) {
            toast.error("回滚失败");
        }
    };

    const handleDeleteSnapshot = async (snapshotId: number) => {
        try {
            await deleteSnapshot(snapshotId);
            setSnapshots(prev => prev.filter(s => s.id !== snapshotId));
            toast.success("快照已删除");
        } catch (error) {
            toast.error("删除失败");
        }
    };

    if (loading) {
        return <div className="flex justify-center h-screen items-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!chapter) return null;

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-background">
            {/* Toolbar */}
            <header className="flex-none border-b p-3 flex items-center justify-between bg-card z-10">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href={`/project/${projectId}`}>
                            <ChevronLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="font-semibold text-lg">{chapter.title}</h1>
                        <p className="text-xs text-muted-foreground flex items-center gap-2">
                            {content.length} 字
                            {saving ? <span className="text-primary flex items-center"><Loader2 className="h-3 w-3 animate-spin mr-1" /> 正在保存...</span> : <span>已保存</span>}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleSave(content)} disabled={saving}>
                        <Save className="mr-2 h-4 w-4" /> 保存
                    </Button>

                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="outline" size="sm">
                                <AlertCircle className="mr-2 h-4 w-4" /> 一致性检查
                            </Button>
                        </SheetTrigger>
                        <SheetContent className="w-[400px] sm:w-[540px]">
                            <SheetHeader>
                                <SheetTitle>一致性检查</SheetTitle>
                                <SheetDescription>
                                    AI 将分析当前章节与设定集/大纲的冲突。
                                </SheetDescription>
                            </SheetHeader>
                            <div className="py-4">
                                <Button
                                    onClick={handleCheckConsistency}
                                    disabled={checkingConsistency}
                                    className="w-full mb-4"
                                >
                                    {checkingConsistency ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                    开始检查
                                </Button>

                                <ScrollArea className="h-[calc(100vh-200px)]">
                                    {consistencyIssues.length === 0 && !checkingConsistency ? (
                                        <div className="text-center text-muted-foreground py-10">
                                            <CheckCircle2 className="h-10 w-10 mx-auto mb-2 opacity-50" />
                                            <p>暂无问题报告</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {consistencyIssues.map((issue, index) => {
                                                const state = issueStates[index] || 'pending';
                                                const preview = fixPreviews[index];
                                                return (
                                                    <div key={index} className={`border rounded-lg p-3 transition-colors ${state === 'fixed' ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' :
                                                        state === 'ignored' ? 'bg-muted/20 opacity-60' : 'bg-muted/30'
                                                        }`}>
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-sm font-semibold capitalize bg-primary/10 text-primary px-2 py-0.5 rounded">
                                                                {issue.type}
                                                            </span>
                                                            {state === 'fixed' && <span className="text-xs text-green-600 flex items-center"><Check className="h-3 w-3 mr-1" />已修复</span>}
                                                            {state === 'ignored' && <span className="text-xs text-muted-foreground">已忽略</span>}
                                                        </div>
                                                        <p className="text-sm font-medium mb-1">{issue.description}</p>
                                                        {issue.quote && (
                                                            <blockquote className="border-l-2 pl-2 italic text-muted-foreground text-xs my-2">
                                                                "{issue.quote}"
                                                            </blockquote>
                                                        )}
                                                        {issue.suggestion && (
                                                            <div className="text-xs text-green-600 bg-green-50 dark:bg-green-950/30 p-2 rounded mt-2">
                                                                💡 建议: {issue.suggestion}
                                                            </div>
                                                        )}

                                                        {/* Fix Preview: Before/After */}
                                                        {state === 'preview' && preview && (
                                                            <div className="mt-3 space-y-2 border-t pt-3">
                                                                <p className="text-xs font-semibold text-muted-foreground">修复预览</p>
                                                                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded p-2">
                                                                    <p className="text-xs text-red-700 dark:text-red-400 line-through">{preview.original}</p>
                                                                </div>
                                                                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded p-2">
                                                                    <p className="text-xs text-green-700 dark:text-green-400">{preview.fixed}</p>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Action Buttons */}
                                                        {state !== 'fixed' && state !== 'ignored' && (
                                                            <div className="flex gap-2 mt-3">
                                                                {state === 'pending' && issue.quote && issue.suggestion && (
                                                                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handleGenerateFix(index)}>
                                                                        <Wand2 className="mr-1 h-3 w-3" /> 生成修复
                                                                    </Button>
                                                                )}
                                                                {state === 'fixing' && (
                                                                    <Button variant="outline" size="sm" className="flex-1" disabled>
                                                                        <Loader2 className="mr-1 h-3 w-3 animate-spin" /> 生成中...
                                                                    </Button>
                                                                )}
                                                                {state === 'preview' && (
                                                                    <>
                                                                        <Button size="sm" className="flex-1" onClick={() => handleApplyFix(index)}>
                                                                            <Check className="mr-1 h-3 w-3" /> 应用修复
                                                                        </Button>
                                                                        <Button variant="outline" size="sm" onClick={() => handleGenerateFix(index)}>
                                                                            <RotateCcw className="h-3 w-3" />
                                                                        </Button>
                                                                    </>
                                                                )}
                                                                <Button variant="ghost" size="sm" onClick={() => handleIgnoreIssue(index)}>
                                                                    <X className="h-3 w-3" />
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </ScrollArea>
                            </div>
                        </SheetContent>
                    </Sheet>

                    {/* Version History */}
                    <Sheet open={versionSheetOpen} onOpenChange={(open) => { setVersionSheetOpen(open); if (open) fetchSnapshots(); }}>
                        <SheetTrigger asChild>
                            <Button variant="outline" size="sm">
                                <History className="mr-2 h-4 w-4" /> 版本历史
                            </Button>
                        </SheetTrigger>
                        <SheetContent className="w-[400px] sm:w-[540px]">
                            <SheetHeader>
                                <SheetTitle>版本历史</SheetTitle>
                                <SheetDescription>管理章节的历史快照，可随时回滚。</SheetDescription>
                            </SheetHeader>
                            <div className="py-4">
                                <Button onClick={handleCreateSnapshot} className="w-full mb-4">
                                    <Save className="mr-2 h-4 w-4" /> 创建快照
                                </Button>
                                <ScrollArea className="h-[calc(100vh-200px)]">
                                    {loadingSnapshots ? (
                                        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
                                    ) : snapshots.length === 0 ? (
                                        <div className="text-center text-muted-foreground py-10">
                                            <History className="h-10 w-10 mx-auto mb-2 opacity-50" />
                                            <p>暂无快照</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {snapshots.map((snap) => (
                                                <div key={snap.id} className="border rounded-lg p-3 bg-muted/30">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-sm font-medium truncate max-w-[280px]">
                                                            {snap.label || `快照 #${snap.id}`}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {snap.word_count} 字
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mb-2">
                                                        {new Date(snap.created_at).toLocaleString('zh-CN')}
                                                    </p>
                                                    <div className="flex gap-2">
                                                        <Button variant="outline" size="sm" className="flex-1" onClick={() => handleRollback(snap.id)}>
                                                            <RotateCcw className="mr-1 h-3 w-3" /> 回滚
                                                        </Button>
                                                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDeleteSnapshot(snap.id)}>
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </ScrollArea>
                            </div>
                        </SheetContent>
                    </Sheet>

                    {/* AI Actions */}
                    <div className="h-6 w-px bg-border mx-2" />

                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" disabled={aiGenerating}>
                                <Wand2 className="mr-2 h-4 w-4" /> 润色重写
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80" align="end">
                            <div className="space-y-4">
                                <h4 className="font-medium leading-none">AI 润色选中文本</h4>
                                <p className="text-sm text-muted-foreground">请先在编辑器中选中一段文字。</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <Button variant="secondary" size="sm" disabled={aiGenerating} onClick={() => handleAiRewriteSelection("使描写更生动、更有画面感")}>
                                        🎨 增加画面感
                                    </Button>
                                    <Button variant="secondary" size="sm" disabled={aiGenerating} onClick={() => handleAiRewriteSelection("增加幽默感，让文字更有趣")}>
                                        🤣 更加幽默
                                    </Button>
                                    <Button variant="secondary" size="sm" disabled={aiGenerating} onClick={() => handleAiRewriteSelection("优化措辞，使语言更通顺精炼")}>
                                        📝 优化措辞
                                    </Button>
                                    <Button variant="secondary" size="sm" disabled={aiGenerating} onClick={() => handleAiRewriteSelection("增加戏剧张力和冲突感")}>
                                        🔥 增加冲突
                                    </Button>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>

                    <Button
                        size="sm"
                        onClick={handleAiContinue}
                        disabled={aiGenerating}
                        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0"
                    >
                        {aiGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                        AI 续写
                    </Button>
                </div>
            </header>

            {/* Editor Area */}
            <div className="flex-1 overflow-hidden relative">
                <div className="absolute inset-0 flex justify-center">
                    <div className="w-full max-w-4xl h-full p-6 md:p-12 overflow-y-auto">
                        <textarea
                            ref={textareaRef}
                            value={content}
                            onChange={handleContentChange}
                            placeholder="开始创作..."
                            className="w-full h-full resize-none bg-transparent border-0 focus:ring-0 p-0 text-lg leading-relaxed outline-none font-serif placeholder:text-muted-foreground/30"
                            spellCheck={false}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
