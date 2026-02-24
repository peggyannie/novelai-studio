"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Loader2, Sparkles, CheckCircle2, BookOpen } from "lucide-react";
import { createProject, generateBible, Project, CreateProjectRequest, BibleGenerateRequest } from "@/lib/api";

interface ProjectWizardProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: (project: Project) => void;
}

type Step = "BASIC_SETTINGS" | "BIBLE_INPUT" | "GENERATING" | "COMPLETE";

export function ProjectWizard({ open, onOpenChange, onSuccess }: ProjectWizardProps) {
    const router = useRouter();
    const [step, setStep] = useState<Step>("BASIC_SETTINGS");
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(false);

    const [basicData, setBasicData] = useState<CreateProjectRequest>({
        title: "",
        genre: "xuanhuan",
        target_words: 1000000,
        description: "",
    });

    const [bibleData, setBibleData] = useState<BibleGenerateRequest>({
        protagonist: "",
        cheat: "",
        power_system: "",
    });

    const [taskId, setTaskId] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const [progressMessage, setProgressMessage] = useState("正在沟通位面意志...");

    // Reset wizard when opened/closed
    useEffect(() => {
        if (open) {
            setStep("BASIC_SETTINGS");
            setProject(null);
            setBasicData({ title: "", genre: "xuanhuan", target_words: 1000000, description: "" });
            setBibleData({ protagonist: "", cheat: "", power_system: "" });
            setProgress(0);
            setTaskId(null);
        }
    }, [open]);

    // Polling logic
    useEffect(() => {
        if (step !== "GENERATING" || !taskId || !project) return;

        const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/projects/${project.id}/generate-bible/status?task_id=${taskId}`;

        let lastReportedProgress = 0;
        const evtSource = new EventSource(url);

        evtSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                // Only bump progress forward, never completely backtrack magically
                if (data.progress > lastReportedProgress) {
                    setProgress(data.progress);
                    lastReportedProgress = data.progress;
                }

                if (data.message) {
                    setProgressMessage(data.message);
                }

                if (data.error) {
                    toast.error(`推演失败: ${data.error}`);
                    evtSource.close();
                    setStep("BIBLE_INPUT");
                } else if (data.completed || data.progress >= 100) {
                    toast.success("创世向导：世界线推演完成！");
                    evtSource.close();
                    setStep("COMPLETE");
                }
            } catch (err) {
                console.error("Failed to parse SSE", err);
            }
        };

        evtSource.onerror = (err) => {
            console.error("EventSource failed:", err);
            evtSource.close();
            // In case the connection breaks, retry or fail
        };

        return () => evtSource.close();
    }, [step, taskId, project]);

    const handleCreateProject = async () => {
        if (!basicData.title.trim()) {
            toast.error("请输入书名");
            return;
        }

        try {
            setLoading(true);
            const created = await createProject(basicData);
            setProject(created);
            onSuccess(created);
            setStep("BIBLE_INPUT");
        } catch (error) {
            toast.error("作品创建失败");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateBible = async () => {
        if (!project) return;
        if (!bibleData.protagonist || !bibleData.cheat || !bibleData.power_system) {
            toast.error("请完善主角、金手指和升级体系的设定！");
            return;
        }

        try {
            setLoading(true);
            const res = await generateBible(project.id, bibleData);
            setTaskId(res.task_id);
            setStep("GENERATING");
        } catch (error) {
            toast.error("启动创世引擎失败");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleFinish = () => {
        onOpenChange(false);
        if (project) {
            router.push(`/project/${project.id}`);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => {
            // Prevent closing while generating
            if (step === "GENERATING") return;
            onOpenChange(v);
        }}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        {step === "BASIC_SETTINGS" && <><BookOpen className="w-5 h-5 text-primary" /> 新建作品基石</>}
                        {step === "BIBLE_INPUT" && <><Sparkles className="w-5 h-5 text-purple-500" /> AI 创世向导</>}
                        {step === "GENERATING" && <><Loader2 className="w-5 h-5 animate-spin text-blue-500" /> 正在推演世界线</>}
                        {step === "COMPLETE" && <><CheckCircle2 className="w-5 h-5 text-green-500" /> 创世大成！</>}
                    </DialogTitle>
                    <DialogDescription>
                        {step === "BASIC_SETTINGS" && "第一步：确定小说的核心元数据。"}
                        {step === "BIBLE_INPUT" && "第二步：设定最核心的基干数据，AI 将自动裂变世界观！"}
                        {step === "GENERATING" && "请耐心等待，大语言模型正在为你裂变海量设定..."}
                        {step === "COMPLETE" && "所有的关键角色、法宝武技、大境界体系均已注入到设定库中。"}
                    </DialogDescription>
                </DialogHeader>

                {/* Step 1: Basic Info */}
                {step === "BASIC_SETTINGS" && (
                    <div className="grid gap-6 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">书名 <span className="text-red-500">*</span></Label>
                            <Input
                                id="title"
                                value={basicData.title}
                                placeholder="例如：斗破苍穹"
                                onChange={(e) => setBasicData({ ...basicData, title: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">作品简介 / 核心构思</Label>
                            <Textarea
                                id="description"
                                value={basicData.description}
                                placeholder="在这里简述这部小说的主要卖点、开局剧情或你脑海中的核心灵感..."
                                onChange={(e) => setBasicData({ ...basicData, description: e.target.value })}
                                className="h-20"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="genre">网文主分类</Label>
                                <Select
                                    value={basicData.genre}
                                    onValueChange={(value) => setBasicData({ ...basicData, genre: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="选择类型" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="xuanhuan">传统玄幻</SelectItem>
                                        <SelectItem value="urban_superpower">都市异能</SelectItem>
                                        <SelectItem value="xianxia">古典仙侠</SelectItem>
                                        <SelectItem value="sci_fi_mecha">科幻机甲</SelectItem>
                                        <SelectItem value="wuxia">高武世界</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="target">原定完结字数</Label>
                                <Input
                                    id="target"
                                    type="number"
                                    value={basicData.target_words}
                                    onChange={(e) => setBasicData({ ...basicData, target_words: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2: Bible Prompt Collection */}
                {step === "BIBLE_INPUT" && (
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="protagonist">一句话主角人设</Label>
                            <Textarea
                                id="protagonist"
                                placeholder="例如：林动，一个没落家族的平凡少年，性格坚韧不拔，对敌人心狠手辣对亲人极度护短..."
                                value={bibleData.protagonist}
                                onChange={(e) => setBibleData({ ...bibleData, protagonist: e.target.value })}
                                className="h-20"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="cheat">核心金手指/系统</Label>
                            <Textarea
                                id="cheat"
                                placeholder="例如：祖石，内部自成空间，能够提纯丹药杂质、完善残缺武学，其中还寄宿着一只天妖貂..."
                                value={bibleData.cheat}
                                onChange={(e) => setBibleData({ ...bibleData, cheat: e.target.value })}
                                className="h-20"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="power_system">力量/境界升级体系</Label>
                            <Textarea
                                id="power_system"
                                placeholder="淬体九重，然后凝聚阴阳二气晋升地元境、天元境，最后阴阳交泰结成元丹..."
                                value={bibleData.power_system}
                                onChange={(e) => setBibleData({ ...bibleData, power_system: e.target.value })}
                                className="h-20"
                            />
                        </div>
                    </div>
                )}

                {/* Step 3: SSE Generating */}
                {step === "GENERATING" && (
                    <div className="py-12 flex flex-col items-center justify-center space-y-8">
                        <Progress value={progress} className="w-[80%] h-3 transition-all duration-500 ease-in-out" />
                        <div className="flex flex-col items-center">
                            <p className="text-sm font-medium animate-pulse text-muted-foreground">{progressMessage}</p>
                            <p className="text-xs text-muted-foreground mt-2">{progress}%</p>
                        </div>
                    </div>
                )}

                {/* Step 4: Complete */}
                {step === "COMPLETE" && (
                    <div className="py-8 flex flex-col items-center justify-center space-y-4 text-center">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-500 mb-4">
                            <CheckCircle2 className="w-10 h-10" />
                        </div>
                        <h3 className="text-xl font-bold">小说基座建立成功！</h3>
                        <p className="text-sm text-muted-foreground px-8">
                            《{basicData.title}》的底层法则、重要配角、神器大纲已存入右侧设定库(Lorebook)中，你可以随时去修改丰富。接下来，你可以自由分配精力去推演大纲了。
                        </p>
                    </div>
                )}

                <DialogFooter>
                    {step === "BASIC_SETTINGS" && (
                        <Button onClick={handleCreateProject} disabled={loading} className="w-full">
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            建立项目文档
                        </Button>
                    )}
                    {step === "BIBLE_INPUT" && (
                        <div className="flex w-full gap-3">
                            <Button variant="outline" onClick={handleFinish} className="flex-1">
                                跳过自动生成，直接进入
                            </Button>
                            <Button onClick={handleGenerateBible} disabled={loading} className="flex-1 bg-purple-600 hover:bg-purple-700">
                                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                                AI一键推演世界观
                            </Button>
                        </div>
                    )}
                    {step === "COMPLETE" && (
                        <Button onClick={handleFinish} className="w-full bg-green-600 hover:bg-green-700">
                            进入写作空间
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
