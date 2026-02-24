"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    Project, getProject,
    LoreItem, getLoreItems, createLoreItem, updateLoreItem, deleteLoreItem, createLoreItemAI,
    CreateLoreItemRequest
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ChevronLeft, Plus, Search, Trash2, Edit2, Users, MapPin, Sword, Shield, Box, Sparkles, Loader2 } from "lucide-react";

const CATEGORY_MAP: Record<string, { label: string; icon: any }> = {
    character: { label: "角色", icon: Users },
    realm: { label: "境界", icon: Sparkles },
    technique: { label: "功法", icon: Sword },
    faction: { label: "势力", icon: Shield },
    item: { label: "道具", icon: Box },
    location: { label: "地点", icon: MapPin },
    other: { label: "其他", icon: Search },
};

export default function LoreLibraryPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const resolvedParams = use(params);
    const projectId = parseInt(resolvedParams.id);

    const [project, setProject] = useState<Project | null>(null);
    const [loreItems, setLoreItems] = useState<LoreItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("all");

    // Form State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<LoreItem | null>(null);
    const [newItem, setNewItem] = useState<CreateLoreItemRequest>({
        category: "character",
        name: "",
        description: "",
        content: "",
        attributes: {},
    });

    // AI Generation State
    const [isAiGenerateOpen, setIsAiGenerateOpen] = useState(false);
    const [aiPrompt, setAiPrompt] = useState("");
    const [generating, setGenerating] = useState(false);
    const [aiCategory, setAiCategory] = useState("character");

    const fetchData = async () => {
        try {
            setLoading(true);
            const [projData, loreData] = await Promise.all([
                getProject(projectId),
                getLoreItems(projectId)
            ]);
            setProject(projData);
            setLoreItems(loreData);
        } catch (error) {
            toast.error("加载数据失败");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!isNaN(projectId)) {
            fetchData();
        }
    }, [projectId]);

    const handleCreateOrUpdate = async () => {
        try {
            if (editingItem) {
                const updated = await updateLoreItem(editingItem.id, newItem);
                setLoreItems(loreItems.map(item => item.id === updated.id ? updated : item));
                toast.success("设定更新成功");
            } else {
                const created = await createLoreItem(projectId, newItem);
                setLoreItems([...loreItems, created]);
                toast.success("设定创建成功");
            }
            setIsCreateOpen(false);
            resetForm();
        } catch (error) {
            toast.error("操作失败");
            console.error(error);
        }
    };

    const handleAiGenerate = async () => {
        try {
            setGenerating(true);
            const created = await createLoreItemAI(projectId, {
                category: aiCategory,
                prompt: aiPrompt
            });
            setLoreItems([...loreItems, created]);
            toast.success("AI 设定生成成功");
            setIsAiGenerateOpen(false);
            setAiPrompt("");
        } catch (error) {
            toast.error("生成失败，请重试");
            console.error(error);
        } finally {
            setGenerating(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("确定要删除这项设定吗？")) return;
        try {
            await deleteLoreItem(id);
            setLoreItems(loreItems.filter(item => item.id !== id));
            toast.success("设定已删除");
        } catch (error) {
            toast.error("删除失败");
        }
    };

    const resetForm = () => {
        setNewItem({
            category: "character",
            name: "",
            description: "",
            content: "",
            attributes: {},
        });
        setEditingItem(null);
    };

    const handleEdit = (item: LoreItem) => {
        setEditingItem(item);
        setNewItem({
            category: item.category,
            name: item.name,
            description: item.description || "",
            content: item.content || "",
            attributes: item.attributes || {},
        });
        setIsCreateOpen(true);
    };

    const filteredItems = activeTab === "all"
        ? loreItems
        : loreItems.filter(item => item.category === activeTab);

    if (loading) return <div className="container mx-auto p-6 flex justify-center py-20">加载中...</div>;
    if (!project) return <div className="container mx-auto p-6 text-center">未找到作品</div>;

    return (
        <div className="container mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href={`/project/${projectId}`}>
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div className="flex-1">
                    <h1 className="text-3xl font-bold tracking-tight">{project.title} - 设定库</h1>
                    <p className="text-muted-foreground text-sm">管理作品的世界观、角色和各种专有设定。</p>
                </div>
                <div className="flex gap-2">
                    <Dialog open={isAiGenerateOpen} onOpenChange={setIsAiGenerateOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline">
                                <Sparkles className="mr-2 h-4 w-4" /> AI 生成
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>AI 设定生成</DialogTitle>
                                <DialogDescription>
                                    输入您的想法，让 AI 为您生成完整的设定详情。
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="space-y-2">
                                    <Label>分类</Label>
                                    <Select value={aiCategory} onValueChange={setAiCategory}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(CATEGORY_MAP).map(([key, { label }]) => (
                                                <SelectItem key={key} value={key}>{label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>生成指令</Label>
                                    <Textarea
                                        placeholder="例如：生成一个性格孤僻但剑术高超的老人，隐居在雪山..."
                                        value={aiPrompt}
                                        onChange={(e) => setAiPrompt(e.target.value)}
                                        rows={4}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsAiGenerateOpen(false)}>取消</Button>
                                <Button onClick={handleAiGenerate} disabled={generating}>
                                    {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                    开始生成
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                    <Dialog open={isCreateOpen} onOpenChange={(open) => {
                        setIsCreateOpen(open);
                        if (!open) resetForm();
                    }}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" /> 新增设定
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[600px]">
                            <DialogHeader>
                                <DialogTitle>{editingItem ? "编辑设定" : "新增设定"}</DialogTitle>
                                <DialogDescription>
                                    请填写设定的详细信息。AI 会参考这些内容进行创作。
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="category" className="text-right">分类</Label>
                                    <Select
                                        value={newItem.category}
                                        onValueChange={(val) => setNewItem({ ...newItem, category: val })}
                                    >
                                        <SelectTrigger className="col-span-3">
                                            <SelectValue placeholder="选择分类" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(CATEGORY_MAP).map(([key, { label }]) => (
                                                <SelectItem key={key} value={key}>{label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="name" className="text-right">名称</Label>
                                    <Input
                                        id="name"
                                        value={newItem.name}
                                        onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                                        className="col-span-3"
                                        placeholder="例如：林枫、天火诀、青山村"
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="description" className="text-right">简述</Label>
                                    <Input
                                        id="description"
                                        value={newItem.description}
                                        onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                                        className="col-span-3"
                                        placeholder="一句话介绍"
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-start gap-4">
                                    <Label htmlFor="content" className="text-right pt-2">详细详情</Label>
                                    <Textarea
                                        id="content"
                                        value={newItem.content}
                                        onChange={(e) => setNewItem({ ...newItem, content: e.target.value })}
                                        className="col-span-3 min-h-[100px]"
                                        placeholder="详细的背景故事、性格、特征等..."
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>取消</Button>
                                <Button onClick={handleCreateOrUpdate}>{editingItem ? "更新" : "创建"}</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-4 lg:grid-cols-8 h-auto p-1 bg-muted/50">
                    <TabsTrigger value="all">全部</TabsTrigger>
                    {Object.entries(CATEGORY_MAP).map(([key, { label }]) => (
                        <TabsTrigger key={key} value={key}>{label}</TabsTrigger>
                    ))}
                </TabsList>

                <TabsContent value={activeTab} className="mt-6">
                    {filteredItems.length === 0 ? (
                        <Card className="border-dashed py-20">
                            <CardContent className="flex flex-col items-center justify-center text-muted-foreground">
                                <p>暂无此类设定</p>
                                <Button variant="link" onClick={() => setIsCreateOpen(true)}>立即创建</Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredItems.map((item) => {
                                const CategoryIcon = CATEGORY_MAP[item.category]?.icon || Search;
                                return (
                                    <Card key={item.id} className="group overflow-hidden hover:border-primary/50 transition-colors">
                                        <CardHeader className="pb-3 border-b bg-muted/20">
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-2 rounded-md bg-background border shadow-sm group-hover:text-primary">
                                                        <CategoryIcon className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <CardTitle className="text-lg">{item.name}</CardTitle>
                                                        <CardDescription className="text-xs">
                                                            {CATEGORY_MAP[item.category]?.label}
                                                        </CardDescription>
                                                    </div>
                                                </div>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(item)}>
                                                        <Edit2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(item.id)}>
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="pt-4 text-sm text-muted-foreground line-clamp-3">
                                            {item.description || "暂无描述"}
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div >
    );
}
