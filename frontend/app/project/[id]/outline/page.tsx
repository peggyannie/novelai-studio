"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input"; // Add Input
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Sparkles, BookOpen, ChevronRight, ChevronDown, CheckCircle2, ChevronLeft, Pencil, Save, X, FileUp } from "lucide-react";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import api, { Project, Outline, OutlineContent, OutlineVolume, OutlineChapter, updateOutline, applyOutlineToProject } from "@/lib/api";



export default function OutlinePage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const resolvedParams = use(params);
    const projectId = parseInt(resolvedParams.id);

    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [outline, setOutline] = useState<Outline | null>(null);
    const [project, setProject] = useState<Project | null>(null);
    const [expandedVolumes, setExpandedVolumes] = useState<Record<number, boolean>>({});

    // Generation state
    const [isGenerateOpen, setIsGenerateOpen] = useState(false);
    const [prompt, setPrompt] = useState("");

    // Edit state
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState<OutlineContent | null>(null);
    const [saving, setSaving] = useState(false);
    const [applying, setApplying] = useState(false);

    useEffect(() => {
        if (!isNaN(projectId)) {
            fetchData();
        }
    }, [projectId]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [projRes, outlineRes] = await Promise.allSettled([
                api.get(`/projects/${projectId}`),
                api.get(`/outline/${projectId}`)
            ]);

            if (projRes.status === "fulfilled") {
                setProject(projRes.value.data);
            }

            if (outlineRes.status === "fulfilled") {
                setOutline(outlineRes.value.data);
                // Expand all volumes by default
                const initialExpanded: Record<number, boolean> = {};
                outlineRes.value.data.content.volumes.forEach((v: OutlineVolume, idx: number) => {
                    initialExpanded[idx] = true;
                });
                setExpandedVolumes(initialExpanded);
            }
        } catch (error) {
            console.error("Error fetching data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        try {
            setGenerating(true);
            setIsGenerateOpen(false); // Close dialog immediately

            const response = await api.post("/outline/generate", {
                project_id: projectId,
                prompt: prompt
            });

            setOutline(response.data);
            toast.success("大纲生成成功！");

            // Expand all
            const initialExpanded: Record<number, boolean> = {};
            response.data.content.volumes.forEach((v: OutlineVolume, idx: number) => {
                initialExpanded[idx] = true;
            });
            setExpandedVolumes(initialExpanded);

        } catch (error) {
            toast.error("大纲生成失败，请稍后重试");
            console.error(error);
        } finally {
            setGenerating(false);
        }
    };

    const toggleVolume = (idx: number) => {
        setExpandedVolumes(prev => ({
            ...prev,
            [idx]: !prev[idx]
        }));
    };

    const handleEditToggle = () => {
        if (isEditing) {
            // Cancel editing
            setIsEditing(false);
            setEditedContent(null);
        } else {
            // Start editing
            if (outline) {
                setEditedContent(JSON.parse(JSON.stringify(outline.content))); // Deep copy
                setIsEditing(true);
            }
        }
    };

    const handleSave = async () => {
        if (!editedContent || !outline) return;
        try {
            setSaving(true);
            const updated = await updateOutline(projectId, { content: editedContent });
            setOutline(updated);
            setIsEditing(false);
            setEditedContent(null);
            toast.success("大纲保存成功");
        } catch (error) {
            console.error(error);
            toast.error("保存失败");
        } finally {
            setSaving(false);
        }
    };

    const handleApply = async () => {
        if (!confirm("确定要将大纲应用到作品目录吗？这将创建新的卷及章节。")) return;
        try {
            setApplying(true);
            await applyOutlineToProject(projectId);
            toast.success("应用成功，请前往作品目录查看");
        } catch (error) {
            console.error(error);
            toast.error("应用失败");
        } finally {
            setApplying(false);
        }
    };

    const updateVolume = (idx: number, field: keyof OutlineVolume, value: any) => {
        if (!editedContent) return;
        const newVolumes = [...editedContent.volumes];
        newVolumes[idx] = { ...newVolumes[idx], [field]: value };
        setEditedContent({ ...editedContent, volumes: newVolumes });
    };

    const updateChapter = (volIdx: number, chIdx: number, field: keyof OutlineChapter, value: any) => {
        if (!editedContent) return;
        const newVolumes = [...editedContent.volumes];
        const newChapters = [...newVolumes[volIdx].chapters];
        newChapters[chIdx] = { ...newChapters[chIdx], [field]: value };
        newVolumes[volIdx] = { ...newVolumes[volIdx], chapters: newChapters };
        setEditedContent({ ...editedContent, volumes: newVolumes });
    };

    if (loading) {
        return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    if (!project) {
        return <div className="text-center py-20">未找到相关作品</div>;
    }

    return (
        <div className="container mx-auto p-6 max-w-5xl space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href={`/project/${projectId}`}>
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div className="flex-1">
                    <h1 className="text-3xl font-bold tracking-tight">作品大纲</h1>
                    <p className="text-muted-foreground mt-1">
                        AI 辅助生成的大纲结构，包含分卷规划与关键章节剧情。
                    </p>
                </div>
                <div className="flex gap-2">
                    <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
                        <DialogTrigger asChild>
                            <Button
                                size="lg"
                                className={!outline ? "animate-pulse" : ""}
                                disabled={generating}
                            >
                                {generating ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        正在构思中...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="mr-2 h-4 w-4" />
                                        {outline ? "重新生成" : "AI 一键生成"}
                                    </>
                                )}
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{outline ? "重新生成大纲" : "生成作品大纲"}</DialogTitle>
                                <DialogDescription>
                                    AI 将根据作品标题、类型和简介生成新的大纲。您可以添加额外指令来控制生成方向。
                                </DialogDescription>
                            </DialogHeader>
                            <div className="py-4 space-y-4">
                                <div className="space-y-2">
                                    <Label>作品信息</Label>
                                    <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                                        <p><strong>标题:</strong> {project.title}</p>
                                        <p><strong>类型:</strong> {project.genre}</p>
                                        <p><strong>目标字数:</strong> {project.target_words}字</p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="prompt">生成指令 (可选)</Label>
                                    <Textarea
                                        id="prompt"
                                        placeholder="例如：希望第一卷节奏快一点，主角要经历一次重大挫折..."
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        rows={4}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsGenerateOpen(false)}>取消</Button>
                                <Button onClick={handleGenerate} disabled={generating}>
                                    {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                    开始生成
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {outline && (
                        <>
                            {isEditing ? (
                                <>
                                    <Button variant="outline" onClick={handleEditToggle} disabled={saving}>
                                        <X className="mr-2 h-4 w-4" /> 取消
                                    </Button>
                                    <Button onClick={handleSave} disabled={saving}>
                                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                        保存修改
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button variant="outline" onClick={handleEditToggle}>
                                        <Pencil className="mr-2 h-4 w-4" /> 编辑大纲
                                    </Button>
                                    <Button variant="outline" onClick={handleApply} disabled={applying}>
                                        {applying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
                                        应用到作品
                                    </Button>
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>

            {!outline ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-20 space-y-4">
                        <div className="p-4 bg-primary/10 rounded-full">
                            <BookOpen className="h-12 w-12 text-primary" />
                        </div>
                        <div className="text-center space-y-2">
                            <h3 className="text-xl font-semibold">暂无大纲</h3>
                            <p className="text-muted-foreground max-w-md mx-auto">
                                该作品还没有大纲。点击右上角的“AI 一键生成”按钮，让 AI 根据您的作品设定自动规划全书结构。
                            </p>
                            <Button variant="outline" onClick={() => setIsGenerateOpen(true)}>
                                立即生成
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-6">
                    {outline.content.volumes.map((volume, volIdx) => (
                        <Card key={volIdx} className="overflow-hidden">
                            <CardHeader
                                className="bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors py-4"
                                onClick={() => toggleVolume(volIdx)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 flex-1 mr-4">
                                        {expandedVolumes[volIdx] ? (
                                            <ChevronDown className="h-5 w-5 text-muted-foreground flex-none" />
                                        ) : (
                                            <ChevronRight className="h-5 w-5 text-muted-foreground flex-none" />
                                        )}
                                        {isEditing ? (
                                            <div className="flex-1 flex gap-2 items-center" onClick={(e) => e.stopPropagation()}>
                                                <span className="text-sm font-medium whitespace-nowrap">第 {volume.order_no} 卷</span>
                                                <Input
                                                    value={(editedContent?.volumes[volIdx] || volume).title}
                                                    onChange={(e) => updateVolume(volIdx, "title", e.target.value)}
                                                    className="h-8"
                                                />
                                            </div>
                                        ) : (
                                            <CardTitle className="text-lg">
                                                第 {volume.order_no} 卷：{volume.title}
                                            </CardTitle>
                                        )}
                                        {!isEditing && (
                                            <Badge variant="outline" className="ml-2">
                                                {volume.chapters.length} 章
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </CardHeader>
                            {expandedVolumes[volIdx] && (
                                <CardContent className="pt-6 grid gap-4">
                                    {volume.chapters.map((chapter, chIdx) => (
                                        <div key={chIdx} className="flex gap-4 p-4 rounded-lg border bg-card hover:shadow-sm transition-all">
                                            <div className="flex-none pt-1">
                                                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                                    {chapter.order_no}
                                                </div>
                                            </div>
                                            <div className="space-y-1 flex-1">
                                                {isEditing ? (
                                                    <div className="space-y-2">
                                                        <Input
                                                            value={(editedContent?.volumes[volIdx].chapters[chIdx] || chapter).title}
                                                            onChange={(e) => updateChapter(volIdx, chIdx, "title", e.target.value)}
                                                            className="font-semibold"
                                                        />
                                                        <Textarea
                                                            value={(editedContent?.volumes[volIdx].chapters[chIdx] || chapter).summary}
                                                            onChange={(e) => updateChapter(volIdx, chIdx, "summary", e.target.value)}
                                                            className="text-sm"
                                                            rows={2}
                                                        />
                                                    </div>
                                                ) : (
                                                    <>
                                                        <h4 className="font-semibold text-base flex items-center gap-2">
                                                            {chapter.title}
                                                        </h4>
                                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                                            {chapter.summary}
                                                        </p>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                            )}
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
