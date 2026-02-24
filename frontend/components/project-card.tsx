import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge"; // Need to check if badge exists, if not use span or install it
import { Button } from "@/components/ui/button";
import { Project } from "@/lib/api";
import Link from "next/link";
import { BookOpen, Edit, Trash2 } from "lucide-react";

interface ProjectCardProps {
    project: Project;
    onDelete?: (id: number) => void;
}

const STATUS_MAP: Record<string, string> = {
    serializing: "连载中",
    completed: "已完结",
    paused: "暂停中",
};

const GENRE_MAP: Record<string, string> = {
    xuanhuan: "玄幻",
    urban_superpower: "都市异能",
    xianxia: "仙侠",
    sci_fi_mecha: "科幻机甲",
};

export function ProjectCard({ project, onDelete }: ProjectCardProps) {
    return (
        <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <CardTitle className="text-xl font-bold truncate pr-4" title={project.title}>
                        {project.title}
                    </CardTitle>
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-primary/10 text-primary capitalize">
                        {STATUS_MAP[project.status] || project.status}
                    </span>
                </div>
                <p className="text-sm text-muted-foreground capitalize">
                    {GENRE_MAP[project.genre] || project.genre}
                </p>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col gap-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">目标字数：</span>
                        <span>{project.target_words.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">创建时间：</span>
                        <span>{new Date(project.created_at).toLocaleDateString()}</span>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
                <Button variant="ghost" size="icon" asChild>
                    <Link href={`/project/${project.id}`}>
                        <Edit className="h-4 w-4" />
                    </Link>
                </Button>
                {onDelete && (
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => onDelete(project.id)}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}
