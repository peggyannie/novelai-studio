"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { BookOpen } from "lucide-react";
import { createProject, Project, CreateProjectRequest } from "@/lib/api";

interface ProjectWizardProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: (project: Project) => void;
}

export function ProjectWizard({ open, onOpenChange, onSuccess }: ProjectWizardProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [basicData, setBasicData] = useState<CreateProjectRequest>({
        title: "",
        genre: "xuanhuan",
        target_words: 1000000,
        description: "",
    });

    useEffect(() => {
        if (!open) return;
        setBasicData({ title: "", genre: "xuanhuan", target_words: 1000000, description: "" });
    }, [open]);

    const handleCreateProject = async () => {
        if (!basicData.title.trim()) {
            toast.error("请输入书名");
            return;
        }

        try {
            setLoading(true);
            const created = await createProject(basicData);
            onSuccess(created);
            onOpenChange(false);
            toast.success("作品创建成功，可在详情页继续 AI 推演世界观");
            router.push(`/project/${created.id}`);
        } catch (error) {
            toast.error("作品创建失败");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <BookOpen className="w-5 h-5 text-primary" /> 新建作品基石
                    </DialogTitle>
                    <DialogDescription>
                        先完成作品基础信息。AI 一键生成世界观已迁移到作品详情页。
                    </DialogDescription>
                </DialogHeader>

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

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                        取消
                    </Button>
                    <Button onClick={handleCreateProject} disabled={loading}>
                        {loading ? "创建中..." : "创建并进入作品"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
