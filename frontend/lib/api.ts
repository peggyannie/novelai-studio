import axios, { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error: AxiosError) => {
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error: AxiosError) => {
        if (error.response && error.response.status === 401) {
            if (typeof window !== 'undefined') {
                localStorage.removeItem('token');
                localStorage.removeItem('refresh_token');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

// Outline Types & Functions
export interface OutlineVolume {
    title: string;
    order_no: number;
    chapters: OutlineChapter[];
}

export interface OutlineChapter {
    title: string;
    summary: string;
    order_no: number;
}

export interface OutlineContent {
    volumes: OutlineVolume[];
}

export interface Outline {
    id: number;
    project_id: number;
    title: string;
    content: OutlineContent;
    status: string;
    created_at: string;
    updated_at?: string;
}

export interface OutlineGenerateRequest {
    project_id: number;
    prompt?: string;
}

export interface OutlineUpdateRequest {
    content: OutlineContent;
}

export const getOutline = async (projectId: number): Promise<Outline> => {
    const response = await api.get(`/outline/${projectId}`);
    return response.data;
};

export const generateOutline = async (data: OutlineGenerateRequest): Promise<Outline> => {
    const response = await api.post('/outline/generate', data);
    return response.data;
};

export const updateOutline = async (projectId: number, data: OutlineUpdateRequest): Promise<Outline> => {
    const response = await api.put(`/outline/${projectId}`, data);
    return response.data;
};

export const applyOutlineToProject = async (projectId: number): Promise<void> => {
    await api.post(`/outline/${projectId}/apply`);
};



export interface User {
    id: number;
    email: string;
    is_active: boolean;
}

export const getCurrentUser = async (): Promise<User> => {
    const response = await api.get('/auth/me');
    return response.data;
};

export interface Project {
    id: number;
    title: string;
    genre: string;
    target_words: number;
    status: string;
    update_frequency?: string;
    created_at: string;
    updated_at?: string;
    volumes?: Volume[];
}

export interface Volume {
    id: number;
    project_id: number;
    title: string;
    order_no: number;
    chapters?: Chapter[];
}

export interface Chapter {
    id: number;
    project_id: number;
    volume_id: number;
    title: string;
    order_no: number;
    status: string;
    content?: string;
    word_count: number;
}

export interface LoreItem {
    id: number;
    project_id: number;
    category: string;
    name: string;
    description?: string;
    content?: string;
    first_appearance_chapter_id?: number;
    attributes?: Record<string, any>;
    created_at: string;
    updated_at?: string;
}

export interface CreateProjectRequest {
    title: string;
    genre: string;
    target_words: number;
}

export interface CreateVolumeRequest {
    title: string;
    order_no: number;
}

export interface CreateChapterRequest {
    title: string;
    order_no: number;
    content?: string;
}

export interface CreateLoreItemRequest {
    category: string;
    name: string;
    description?: string;
    content?: string;
    first_appearance_chapter_id?: number;
    attributes?: Record<string, any>;
}

export const getProjects = async (): Promise<Project[]> => {
    const response = await api.get('/projects/');
    return response.data;
};

export const getProject = async (id: number): Promise<Project> => {
    const response = await api.get(`/projects/${id}`);
    return response.data;
};

export interface UpdateProjectRequest {
    title?: string;
    genre?: string;
    status?: string;
    target_words?: number;
    update_frequency?: string;
}

export const createProject = async (data: CreateProjectRequest): Promise<Project> => {
    const response = await api.post('/projects/', data);
    return response.data;
};

export interface BibleGenerateRequest {
    protagonist: string;
    cheat: string;
    power_system: string;
}

export interface BibleGenerateResponse {
    task_id: string;
    message: string;
}

export const generateBible = async (projectId: number, data: BibleGenerateRequest): Promise<BibleGenerateResponse> => {
    const response = await api.post(`/projects/${projectId}/generate-bible`, data);
    return response.data;
};

export const updateProject = async (id: number, data: UpdateProjectRequest): Promise<Project> => {
    const response = await api.put(`/projects/${id}`, data);
    return response.data;
};

export const deleteProject = async (id: number): Promise<void> => {
    await api.delete(`/projects/${id}`);
};

export const createVolume = async (projectId: number, data: CreateVolumeRequest): Promise<Volume> => {
    const response = await api.post(`/projects/${projectId}/volumes`, data);
    return response.data;
};

export const updateVolume = async (id: number, data: Partial<CreateVolumeRequest>): Promise<Volume> => {
    const response = await api.put(`/volumes/${id}`, data);
    return response.data;
};

export const deleteVolume = async (id: number): Promise<void> => {
    await api.delete(`/volumes/${id}`);
};

export const createChapter = async (volumeId: number, data: CreateChapterRequest): Promise<Chapter> => {
    const response = await api.post(`/volumes/${volumeId}/chapters`, data);
    return response.data;
};

export const getChapter = async (id: number): Promise<Chapter> => {
    const response = await api.get(`/chapters/${id}`);
    return response.data;
};

export const updateChapter = async (id: number, data: Partial<CreateChapterRequest>): Promise<Chapter> => {
    const response = await api.put(`/chapters/${id}`, data);
    return response.data;
};

export const deleteChapter = async (id: number): Promise<void> => {
    await api.delete(`/chapters/${id}`);
};

export const getLoreItems = async (projectId: number, category?: string): Promise<LoreItem[]> => {
    const response = await api.get(`/projects/${projectId}/lore`, {
        params: { category }
    });
    return response.data;
};

export const createLoreItem = async (projectId: number, data: CreateLoreItemRequest): Promise<LoreItem> => {
    const response = await api.post(`/projects/${projectId}/lore`, data);
    return response.data;
};

export const updateLoreItem = async (id: number, data: Partial<CreateLoreItemRequest>): Promise<LoreItem> => {
    const response = await api.put(`/lore/${id}`, data);
    return response.data;
};

export interface CreateLoreItemAIRequest {
    category: string;
    prompt: string;
}

export const createLoreItemAI = async (projectId: number, data: CreateLoreItemAIRequest): Promise<LoreItem> => {
    const response = await api.post(`/projects/${projectId}/lore/generate`, data);
    return response.data;
};

export const deleteLoreItem = async (id: number): Promise<void> => {
    await api.delete(`/lore/${id}`);
};

// AI Writing
export interface WritingResponse {
    content: string;
}

export const aiContinue = async (projectId: number, chapterId: number, context: string, instruction?: string): Promise<string> => {
    const response = await api.post<WritingResponse>('/writing/continue', {
        project_id: projectId,
        chapter_id: chapterId,
        context,
        instruction
    });
    return response.data.content;
};

export const aiContinueStream = async (
    projectId: number,
    chapterId: number,
    context: string,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: any) => void
): Promise<void> => {
    try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/writing/continue`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify({
                project_id: projectId,
                chapter_id: chapterId,
                context,
                instruction: "Advance the plot."
            })
        });

        if (!response.ok) throw new Error('Network response was not ok');
        if (!response.body) throw new Error('No response body');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const text = decoder.decode(value, { stream: true });
            onChunk(text);
        }

        onComplete();
    } catch (error) {
        onError(error);
    }
};

export const aiRewrite = async (projectId: number, text: string, instruction: string): Promise<string> => {
    const response = await api.post<WritingResponse>('/writing/rewrite', {
        project_id: projectId,
        text,
        instruction
    });
    return response.data.content;
};

// Consistency Check
export interface ConsistencyIssue {
    type: 'character' | 'plot' | 'setting' | 'other';
    description: string;
    quote?: string;
    suggestion?: string;
}

export interface ConsistencyCheckResponse {
    issues: ConsistencyIssue[];
}

export const checkConsistency = async (chapterId: number): Promise<ConsistencyIssue[]> => {
    const response = await api.post<ConsistencyCheckResponse>(`/consistency/${chapterId}/check`);
    return response.data.issues;
};

export interface ConsistencyFixResponse {
    original_text: string;
    fixed_text: string;
}

export const fixConsistencyIssue = async (
    chapterId: number,
    quote: string,
    description: string,
    suggestion: string,
): Promise<ConsistencyFixResponse> => {
    const response = await api.post<ConsistencyFixResponse>(
        `/consistency/${chapterId}/fix`,
        { quote, description, suggestion }
    );
    return response.data;
};

// Snapshots / Version Control
export interface Snapshot {
    id: number;
    chapter_id: number;
    content?: string;
    word_count: number;
    label?: string;
    created_at: string;
}

export const createSnapshot = async (chapterId: number, label?: string): Promise<Snapshot> => {
    const response = await api.post<Snapshot>(`/chapters/${chapterId}/snapshots`, { label });
    return response.data;
};

export const getSnapshots = async (chapterId: number): Promise<Snapshot[]> => {
    const response = await api.get<Snapshot[]>(`/chapters/${chapterId}/snapshots`);
    return response.data;
};

export const getSnapshot = async (snapshotId: number): Promise<Snapshot> => {
    const response = await api.get<Snapshot>(`/snapshots/${snapshotId}`);
    return response.data;
};

export const rollbackSnapshot = async (snapshotId: number): Promise<void> => {
    await api.post(`/snapshots/${snapshotId}/rollback`);
};

export const deleteSnapshot = async (snapshotId: number): Promise<void> => {
    await api.delete(`/snapshots/${snapshotId}`);
};

// Export
export const exportProjectTxt = async (projectId: number): Promise<void> => {
    const response = await api.get(`/projects/${projectId}/export/txt`, {
        responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'text/plain; charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const contentDisposition = response.headers['content-disposition'];
    const filename = contentDisposition
        ? decodeURIComponent(contentDisposition.split("filename*=UTF-8''")[1] || 'novel.txt')
        : 'novel.txt';
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
};

// Writing Stats
export interface WritingStats {
    total_projects: number;
    total_chapters: number;
    total_words: number;
    today_words: number;
}

export const getWritingStats = async (): Promise<WritingStats> => {
    const response = await api.get<WritingStats>('/stats/overview');
    return response.data;
};

// Reorder
export interface ReorderItem {
    id: number;
    order_no: number;
}

export const reorderVolumes = async (items: ReorderItem[]): Promise<void> => {
    await api.put('/reorder/volumes/reorder', { items });
};

export const reorderChapters = async (items: ReorderItem[]): Promise<void> => {
    await api.put('/reorder/chapters/reorder', { items });
};

export default api;
