"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import {
    Project,
    Volume,
    Chapter,
    getProject,
    generateBible,
    generateBibleInputs,
    createVolume,
    createChapter,
    updateProject,
    updateVolume,
    updateChapter,
    deleteVolume,
    deleteChapter,
    CreateVolumeRequest,
    CreateChapterRequest,
    UpdateProjectRequest,
    exportProjectTxt,
    reorderChapters,
    BibleGenerateRequest,
    ReorderItem,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Plus, MoreVertical, Edit, Trash2, FileText, ChevronLeft, BookOpen, Settings, Download, ChevronUp, ChevronDown, Sparkles, Loader2 } from "lucide-react";
import Link from "next/link";
import { UserNav } from "@/components/user-nav";

const STATUS_MAP: Record<string, string> = {
    serializing: "连载中",
    completed: "已完结",
    paused: "暂停中",
};

const CHAPTER_STATUS_MAP: Record<string, string> = {
    draft: "草稿",
    published: "已发布",
};

const GENRE_MAP: Record<string, string> = {
    xuanhuan: "玄幻",
    urban_superpower: "都市异能",
    xianxia: "仙侠",
    sci_fi_mecha: "科幻机甲",
};

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const resolvedParams = use(params);
    const projectId = parseInt(resolvedParams.id);

    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);

    // Create State
    const [isCreateVolumeOpen, setIsCreateVolumeOpen] = useState(false);
    const [newVolume, setNewVolume] = useState<CreateVolumeRequest>({
        title: "",
        order_no: 1,
    });

    const [isCreateChapterOpen, setIsCreateChapterOpen] = useState(false);
    const [targetVolumeId, setTargetVolumeId] = useState<number | null>(null);
    const [newChapter, setNewChapter] = useState<CreateChapterRequest>({
        title: "",
        order_no: 1,
        content: "",
    });

    // Edit Project State
    const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
    const [editProjectData, setEditProjectData] = useState<UpdateProjectRequest>({});
    // AI Bible State (moved from creation flow to detail page)
    const [isBibleOpen, setIsBibleOpen] = useState(false);
    const [aiGenerating, setAiGenerating] = useState(false);
    const [isBibleSubmitting, setIsBibleSubmitting] = useState(false);
    const [bibleTaskId, setBibleTaskId] = useState<string | null>(null);
    const [bibleProgress, setBibleProgress] = useState(0);
    const [bibleProgressMessage, setBibleProgressMessage] = useState("正在沟通位面意志...");
    const [bibleData, setBibleData] = useState<BibleGenerateRequest>({
        protagonist: "",
        cheat: "",
        power_system: "",
    });

    const fetchProject = async () => {
        try {
            setLoading(true);
            const data = await getProject(projectId);
            setProject(data);
            // Sort volumes by order_no
            if (data.volumes) {
                data.volumes.sort((a, b) => a.order_no - b.order_no);
                // Sort chapters within volumes
                data.volumes.forEach(v => {
                    if (v.chapters) {
                        v.chapters.sort((a, b) => a.order_no - b.order_no);
                    }
                });
            }
        } catch (error) {
            toast.error("无法加载作品详情");
            console.error(error);
            router.push("/dashboard");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!isNaN(projectId)) {
            fetchProject();
        }
    }, [projectId]);

    useEffect(() => {
        if (!isBibleOpen || !bibleTaskId) return;

        const url = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/projects/${projectId}/generate-bible/status?task_id=${bibleTaskId}`;
        let lastReportedProgress = 0;
        const evtSource = new EventSource(url);

        evtSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (typeof data.progress === "number" && data.progress > lastReportedProgress) {
                    setBibleProgress(data.progress);
                    lastReportedProgress = data.progress;
                }
                if (data.message) {
                    setBibleProgressMessage(data.message);
                }

                if (data.error) {
                    toast.error(`推演失败: ${data.error}`);
                    setBibleTaskId(null);
                    setIsBibleSubmitting(false);
                    evtSource.close();
                    return;
                }

                if (data.completed || data.progress >= 100) {
                    toast.success("世界观推演完成，已写入设定库");
                    setBibleTaskId(null);
                    setIsBibleSubmitting(false);
                    setIsBibleOpen(false);
                    evtSource.close();
                }
            } catch (err) {
                console.error("Failed to parse SSE", err);
            }
        };

        evtSource.onerror = () => {
            evtSource.close();
        };

        return () => evtSource.close();
    }, [isBibleOpen, bibleTaskId, projectId]);

    const handleCreateVolume = async () => {
        if (!project) return;
        try {
            await createVolume(project.id, newVolume);
            toast.success("分卷创建成功");
            setIsCreateVolumeOpen(false);
            setNewVolume({ title: "", order_no: (project.volumes?.length || 0) + 1 });
            fetchProject(); // Refresh data
        } catch (error) {
            toast.error("创建分卷失败");
            console.error(error);
        }
    };

    const handleCreateChapter = async () => {
        if (!targetVolumeId) return;
        try {
            await createChapter(targetVolumeId, newChapter);
            toast.success("章节创建成功");
            setIsCreateChapterOpen(false);
            // Reset for next
            setNewChapter({ title: "", order_no: 1, content: "" });
            fetchProject(); // Refresh data
        } catch (error) {
            toast.error("创建章节失败");
            console.error(error);
        }
    };

    const handleUpdateProject = async () => {
        if (!project) return;
        try {
            await updateProject(project.id, editProjectData);
            toast.success("作品信息已更新");
            setIsEditProjectOpen(false);
            fetchProject();
        } catch (error) {
            toast.error("更新失败");
        }
    };

    const openEditProject = () => {
        if (!project) return;
        setEditProjectData({
            title: project.title,
            genre: project.genre,
            status: project.status,
            target_words: project.target_words,
            update_frequency: project.update_frequency || "",
        });
        setIsEditProjectOpen(true);
    };

    const handleDeleteVolume = async (id: number) => {
        if (!confirm("确定删除该分卷及其所有章节吗？")) return;
        try {
            await deleteVolume(id);
            toast.success("分卷已删除");
            fetchProject();
        } catch (error) {
            toast.error("删除分卷失败");
        }
    };

    const handleDeleteChapter = async (id: number) => {
        if (!confirm("确定删除该章节吗？")) return;
        try {
            await deleteChapter(id);
            toast.success("章节已删除");
            fetchProject();
        } catch (error) {
            toast.error("删除章节失败");
        }
    };

    const openBibleDialog = () => {
        setBibleTaskId(null);
        setBibleProgress(0);
        setBibleProgressMessage("正在沟通位面意志...");
        setBibleData({
            protagonist: "",
            cheat: "",
            power_system: "",
        });
        setIsBibleOpen(true);
    };

    const handleAutoGenerateInputs = async () => {
        if (!project) return;
        try {
            setAiGenerating(true);
            const autoData = await generateBibleInputs({
                title: project.title,
                genre: project.genre,
                target_words: project.target_words,
                description: project.description || "",
            });
            setBibleData(autoData);
            toast.success("灵感裂变完成，可直接推演或继续修改");
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "AI 灵感推演失败");
        } finally {
            setAiGenerating(false);
        }
    };

    const handleGenerateBible = async () => {
        if (!project) return;
        if (!bibleData.protagonist || !bibleData.cheat || !bibleData.power_system) {
            toast.error("请完善主角、金手指和升级体系设定");
            return;
        }

        try {
            setIsBibleSubmitting(true);
            const res = await generateBible(project.id, bibleData);
            setBibleTaskId(res.task_id);
            setBibleProgress(1);
            setBibleProgressMessage("创世引擎已启动...");
        } catch (error) {
            setIsBibleSubmitting(false);
            toast.error("启动世界观推演失败");
            console.error(error);
        }
    };

    if (loading) {
        return <div className="container mx-auto p-6 flex justify-center py-20">加载中...</div>;
    }

    if (!project) {
        return <div className="container mx-auto p-6 text-center">未找到作品</div>;
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/dashboard">
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold tracking-tight">{project.title}</h1>
                        <Badge variant="outline" className="capitalize">{STATUS_MAP[project.status] || project.status}</Badge>
                        <Badge variant="secondary" className="capitalize">{GENRE_MAP[project.genre] || project.genre}</Badge>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="default" onClick={openBibleDialog}>
                        <Sparkles className="mr-2 h-4 w-4" /> AI推演世界观
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href={`/project/${projectId}/outline`}>
                            <FileText className="mr-2 h-4 w-4" /> 大纲
                        </Link>
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href={`/project/${projectId}/lore`}>
                            <BookOpen className="mr-2 h-4 w-4" /> 设定库
                        </Link>
                    </Button>
                    <Button variant="outline" size="icon" onClick={openEditProject} title="修改作品信息">
                        <Settings className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={async () => {
                        try {
                            await exportProjectTxt(projectId);
                            toast.success("导出成功");
                        } catch (e) {
                            toast.error("导出失败");
                        }
                    }} title="导出TXT">
                        <Download className="h-4 w-4" />
                    </Button>
                    {/* Add Volume Button */}
                    <Dialog open={isCreateVolumeOpen} onOpenChange={setIsCreateVolumeOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" /> 添加分卷
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>新建分卷</DialogTitle>
                                <DialogDescription>管理分卷与章节结构。</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="vol-title" className="text-right">卷名</Label>
                                    <Input
                                        id="vol-title"
                                        value={newVolume.title}
                                        onChange={(e) => setNewVolume({ ...newVolume, title: e.target.value })}
                                        className="col-span-3"
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="vol-order" className="text-right">序号</Label>
                                    <Input
                                        id="vol-order"
                                        type="number"
                                        value={newVolume.order_no}
                                        onChange={(e) => setNewVolume({ ...newVolume, order_no: parseInt(e.target.value) })}
                                        className="col-span-3"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleCreateVolume}>创建</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                    <UserNav />
                </div>

                {/* Edit Project Dialog */}
                <Dialog open={isEditProjectOpen} onOpenChange={setIsEditProjectOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>修改作品信息</DialogTitle>
                            <DialogDescription>更新作品的基本资料。</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-title" className="text-right">书名</Label>
                                <Input
                                    id="edit-title"
                                    value={editProjectData.title || ""}
                                    onChange={(e) => setEditProjectData({ ...editProjectData, title: e.target.value })}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-genre" className="text-right">类型</Label>
                                <Select
                                    value={editProjectData.genre}
                                    onValueChange={(val) => setEditProjectData({ ...editProjectData, genre: val })}
                                >
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="选择类型" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="xuanhuan">玄幻</SelectItem>
                                        <SelectItem value="urban_superpower">都市异能</SelectItem>
                                        <SelectItem value="xianxia">仙侠</SelectItem>
                                        <SelectItem value="sci_fi_mecha">科幻机甲</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-status" className="text-right">状态</Label>
                                <Select
                                    value={editProjectData.status}
                                    onValueChange={(val) => setEditProjectData({ ...editProjectData, status: val })}
                                >
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="选择状态" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="serializing">连载中</SelectItem>
                                        <SelectItem value="paused">暂停中</SelectItem>
                                        <SelectItem value="completed">已完结</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-target" className="text-right">目标字数</Label>
                                <Input
                                    id="edit-target"
                                    type="number"
                                    value={editProjectData.target_words || 0}
                                    onChange={(e) => setEditProjectData({ ...editProjectData, target_words: parseInt(e.target.value) })}
                                    className="col-span-3"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleUpdateProject}>保存修改</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Structure Tree */}
            <div className="border rounded-lg p-4 bg-card">
                <Accordion type="multiple" className="w-full">
                    {project.volumes?.map((volume) => (
                        <AccordionItem value={`vol-${volume.id}`} key={volume.id}>
                            <div className="flex items-center justify-between pr-4 hover:bg-muted/50 rounded-md">
                                <AccordionTrigger className="flex-1 px-4 hover:no-underline">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold">{volume.title}</span>
                                        <span className="text-xs text-muted-foreground ml-2">
                                            {volume.chapters?.length || 0} 章
                                        </span>
                                    </div>
                                </AccordionTrigger>
                                <div className="flex gap-2 isolate z-10">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setTargetVolumeId(volume.id);
                                            setNewChapter(prev => ({
                                                ...prev,
                                                order_no: (volume.chapters?.length || 0) + 1
                                            }));
                                            setIsCreateChapterOpen(true);
                                        }}
                                    >
                                        <Plus className="h-4 w-4 mr-1" /> 章节
                                    </Button>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => { /* Edit Volume */ }}>
                                                <Edit className="mr-2 h-4 w-4" /> 重命名
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteVolume(volume.id)}>
                                                <Trash2 className="mr-2 h-4 w-4" /> 删除
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                            <AccordionContent className="pl-4 border-l ml-6">
                                <div className="flex flex-col gap-1">
                                    {volume.chapters && volume.chapters.length > 0 ? (
                                        volume.chapters.map((chapter, chapterIndex) => (
                                            <div
                                                key={chapter.id}
                                                className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                                    <span>{chapter.title}</span>
                                                    <Badge variant="outline" className="text-xs h-5 px-1 font-normal">
                                                        {CHAPTER_STATUS_MAP[chapter.status] || chapter.status}
                                                    </Badge>
                                                    <span className="text-xs text-muted-foreground">
                                                        {chapter.word_count} 字
                                                    </span>
                                                </div>
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                                    {chapterIndex > 0 && (
                                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={async () => {
                                                            const chapters = volume.chapters!;
                                                            const items: ReorderItem[] = chapters.map((c, i) => ({ id: c.id, order_no: c.order_no }));
                                                            const temp = items[chapterIndex].order_no;
                                                            items[chapterIndex].order_no = items[chapterIndex - 1].order_no;
                                                            items[chapterIndex - 1].order_no = temp;
                                                            await reorderChapters(items);
                                                            fetchProject();
                                                        }}>
                                                            <ChevronUp className="h-3.5 w-3.5" />
                                                        </Button>
                                                    )}
                                                    {chapterIndex < (volume.chapters?.length || 0) - 1 && (
                                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={async () => {
                                                            const chapters = volume.chapters!;
                                                            const items: ReorderItem[] = chapters.map((c, i) => ({ id: c.id, order_no: c.order_no }));
                                                            const temp = items[chapterIndex].order_no;
                                                            items[chapterIndex].order_no = items[chapterIndex + 1].order_no;
                                                            items[chapterIndex + 1].order_no = temp;
                                                            await reorderChapters(items);
                                                            fetchProject();
                                                        }}>
                                                            <ChevronDown className="h-3.5 w-3.5" />
                                                        </Button>
                                                    )}
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                                                        {/* Link to editor */}
                                                        <Link href={`/project/${project.id}/chapter/${chapter.id}`}>
                                                            <Edit className="h-3.5 w-3.5" />
                                                        </Link>
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-destructive hover:text-destructive"
                                                        onClick={() => handleDeleteChapter(chapter.id)}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-sm text-muted-foreground py-2 italic text-center border-dashed border rounded">
                                            暂无章节，请添加。
                                        </div>
                                    )}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
                {!project.volumes?.length && (
                    <div className="text-center py-10 text-muted-foreground">
                        暂无分卷。请先创建分卷。
                    </div>
                )}
            </div>

            {/* Create Chapter Dialog */}
            <Dialog open={isCreateChapterOpen} onOpenChange={setIsCreateChapterOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>新建章节</DialogTitle>
                        <DialogDescription>开始新的一章。</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="ch-title" className="text-right">章节名</Label>
                            <Input
                                id="ch-title"
                                value={newChapter.title}
                                onChange={(e) => setNewChapter({ ...newChapter, title: e.target.value })}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="ch-order" className="text-right">序号</Label>
                            <Input
                                id="ch-order"
                                type="number"
                                value={newChapter.order_no}
                                onChange={(e) => setNewChapter({ ...newChapter, order_no: parseInt(e.target.value) })}
                                className="col-span-3"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleCreateChapter}>创建</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* AI Bible Dialog */}
            <Dialog open={isBibleOpen} onOpenChange={(open) => !isBibleSubmitting && setIsBibleOpen(open)}>
                <DialogContent className="sm:max-w-[700px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center justify-between">
                            <span className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-purple-500" /> AI 创世向导</span>
                            <Button
                                variant="secondary"
                                size="sm"
                                className="h-8 gap-1.5 mr-6 text-purple-600 bg-purple-100 hover:bg-purple-200"
                                onClick={handleAutoGenerateInputs}
                                disabled={aiGenerating || isBibleSubmitting}
                            >
                                {aiGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                <span className="text-xs">AI 一键构思</span>
                            </Button>
                        </DialogTitle>
                        <DialogDescription>
                            根据你的核心设定，自动生成并推演角色、金手指和境界体系，写入设定库。
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="bible-protagonist">一句话主角人设</Label>
                            <Textarea
                                id="bible-protagonist"
                                placeholder="例如：林动，一个没落家族的平凡少年，性格坚韧不拔..."
                                value={bibleData.protagonist}
                                onChange={(e) => setBibleData({ ...bibleData, protagonist: e.target.value })}
                                className="h-24"
                                disabled={aiGenerating || isBibleSubmitting}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="bible-cheat">核心金手指/系统</Label>
                            <Textarea
                                id="bible-cheat"
                                placeholder="例如：祖石，内部自成空间，能够提纯丹药杂质..."
                                value={bibleData.cheat}
                                onChange={(e) => setBibleData({ ...bibleData, cheat: e.target.value })}
                                className="h-24"
                                disabled={aiGenerating || isBibleSubmitting}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="bible-power">力量/境界升级体系</Label>
                            <Textarea
                                id="bible-power"
                                placeholder="例如：淬体九重，然后凝聚阴阳二气晋升地元境..."
                                value={bibleData.power_system}
                                onChange={(e) => setBibleData({ ...bibleData, power_system: e.target.value })}
                                className="h-24"
                                disabled={aiGenerating || isBibleSubmitting}
                            />
                        </div>
                    </div>

                    {isBibleSubmitting && (
                        <div className="space-y-2 pt-2">
                            <Progress value={bibleProgress} className="h-2" />
                            <p className="text-xs text-muted-foreground">{bibleProgressMessage} {bibleProgress}%</p>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsBibleOpen(false)} disabled={isBibleSubmitting}>
                            暂不推演
                        </Button>
                        <Button onClick={handleGenerateBible} disabled={isBibleSubmitting || aiGenerating}>
                            {isBibleSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                            AI一键推演世界观
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
