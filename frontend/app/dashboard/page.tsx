"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Project, getProjects, createProject, deleteProject, CreateProjectRequest, WritingStats, getWritingStats } from "@/lib/api";
import { ProjectCard } from "@/components/project-card";
import { Button } from "@/components/ui/button";
import { ProjectWizard } from "@/components/project-wizard";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
// Removing old input/select imports since they are inside ProjectWizard now
import { toast } from "sonner";
import { Plus, BookOpen, FileText, Type, CalendarDays } from "lucide-react";
import { UserNav } from "@/components/user-nav";

export default function DashboardPage() {
    const router = useRouter();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState<number | null>(null);
    const [stats, setStats] = useState<WritingStats | null>(null);

    const fetchProjects = async () => {
        try {
            setLoading(true);
            const data = await getProjects();
            setProjects(data);
        } catch (error) {
            toast.error("Failed to load projects");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
        getWritingStats().then(setStats).catch(console.error);
    }, []);


    const handleDeleteProject = (id: number) => {
        setProjectToDelete(id);
    };

    const confirmDelete = async () => {
        if (!projectToDelete) return;
        try {
            await deleteProject(projectToDelete);
            toast.success("作品已删除");
            setProjects(projects.filter((p) => p.id !== projectToDelete));
        } catch (error) {
            toast.error("删除作品失败");
            console.error(error);
        } finally {
            setProjectToDelete(null);
        }
    };

    return (
        <div className="container mx-auto p-6 space-y-8">

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                        { label: "作品数", value: stats.total_projects, icon: BookOpen, color: "text-purple-500" },
                        { label: "总章节", value: stats.total_chapters, icon: FileText, color: "text-blue-500" },
                        { label: "总字数", value: stats.total_words.toLocaleString(), icon: Type, color: "text-green-500" },
                        { label: "今日字数", value: stats.today_words.toLocaleString(), icon: CalendarDays, color: "text-orange-500" },
                    ].map((s) => (
                        <div key={s.label} className="border rounded-xl p-4 bg-card">
                            <div className="flex items-center gap-2 mb-1">
                                <s.icon className={`h-4 w-4 ${s.color}`} />
                                <span className="text-xs text-muted-foreground">{s.label}</span>
                            </div>
                            <p className="text-2xl font-bold">{s.value}</p>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">我的作品</h1>
                    <p className="text-muted-foreground">管理您的网文作品。</p>
                </div>
                <div className="flex items-center gap-4">
                    <Button onClick={() => setIsCreateOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" /> 创建作品
                    </Button>
                    <ProjectWizard
                        open={isCreateOpen}
                        onOpenChange={setIsCreateOpen}
                        onSuccess={(created) => setProjects([...projects, created])}
                    />
                    <UserNav />
                </div>
            </div>

            {
                loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-40 bg-muted animate-pulse rounded-lg" />
                        ))}
                    </div>
                ) : projects.length === 0 ? (
                    <div className="text-center py-20 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                        <p>还没有作品。创建您的第一部作品吧！</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {projects.map((project) => (
                            <ProjectCard
                                key={project.id}
                                project={project}
                                onDelete={handleDeleteProject}
                            />
                        ))}
                    </div>
                )
            }

            <AlertDialog open={!!projectToDelete} onOpenChange={(open) => !open && setProjectToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>确定要删除这部作品吗？</AlertDialogTitle>
                        <AlertDialogDescription>
                            此操作无法撤销。这将永久删除您的作品及其所有章节内容。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            删除
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div >
    );
}
