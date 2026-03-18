"use client";

import { GitFork, Loader2, Pencil, Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

// 获取模型显示名称
const getModelDisplayName = (model: AIModel) => {
    if (model.provider === "custom") {
        return model.modelId;
    }

    const suggestionNames: Record<string, string> = {
        "gpt-4o": "GPT-4o",
        "gpt-4-turbo": "GPT-4 Turbo",
        "gpt-3.5-turbo": "GPT-3.5 Turbo",
        "claude-3-5-sonnet-20241022": "Claude 3.5 Sonnet",
        "claude-3-haiku-20240307": "Claude 3 Haiku",
        "claude-3-opus-20240229": "Claude 3 Opus",
    };

    return suggestionNames[model.modelId] || model.modelId;
};

type GitLabProject = {
    id: number;
    name: string;
    path: string;
    path_with_namespace: string;
    description: string | null;
    default_branch: string;
    web_url: string;
};

type AIModel = {
    id: string;
    provider: string;
    modelId: string;
    isActive: boolean;
};

type Repository = {
    id: string;
    gitLabProjectId: number;
    name: string;
    path: string;
    description: string | null;
    isActive: boolean;
    autoReview: boolean;
    defaultAIModelId: string | null;
    defaultAIModel: AIModel | null;
    watchBranches: string | null;
    customPrompt: string | null;
    // 自定义 AI 模型配置
    customProvider: string | null;
    customModelId: string | null;
    customApiKey: string | null;
    customApiEndpoint: string | null;
    customMaxTokens: number | null;
    customTemperature: number | null;
    gitLabAccount: {
        id: string;
        url: string;
    } | null;
    _count: {
        reviewLogs: number;
    };
};

export default function RepositoriesPage() {
    const [repositories, setRepositories] = useState<Repository[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // 添加仓库对话框状态
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [gitlabProjects, setGitlabProjects] = useState<GitLabProject[]>([]);
    const [loadingProjects, setLoadingProjects] = useState(false);

    const loadRepositories = async () => {
        try {
            const response = await fetch("/api/repositories");
            const data = await response.json();
            // 确保返回的是数组
            if (Array.isArray(data)) {
                setRepositories(data);
            } else {
                console.error("Unexpected response format:", data);
                setRepositories([]);
            }
        } catch (error) {
            console.error("Failed to load repositories:", error);
            setRepositories([]);
        } finally {
            setLoading(false);
        }
    };

    // biome-ignore lint/correctness/useExhaustiveDependencies: only run on mount
    useEffect(() => {
        loadRepositories();
    }, []);

    // 加载 GitLab 项目列表
    const loadGitLabProjects = async (search?: string) => {
        // 加载 GitLab 项目列表，支持搜索条件
        setLoadingProjects(true); // 标记项目列表进入加载状态
        try {
            // 捕获网络或解析异常
            const url = new URL(
                "/api/settings/gitlab/projects",
                window.location.origin,
            ); // 构造请求 URL
            if (search) {
                // 当存在搜索条件时
                url.searchParams.set("search", search); // 写入查询参数
            } // 结束搜索条件处理
            const response = await fetch(url.toString()); // 发送请求获取项目列表
            if (!response.ok) {
                // 当接口返回非 2xx 状态
                const error = await response.json(); // 读取错误响应体
                throw new Error(error.error || "Failed to load projects"); // 抛出标准化错误信息
            } // 结束错误状态处理
            const projects = await response.json(); // 解析项目列表响应体
            if (Array.isArray(projects)) {
                // 校验响应是否为数组
                setGitlabProjects(projects); // 设置项目列表
            } else {
                // 处理非数组响应
                console.error(
                    "Unexpected GitLab projects response format:",
                    projects,
                ); // 输出格式异常日志
                setGitlabProjects([]); // 兜底为空数组避免渲染报错
                toast.error("加载项目失败: 响应格式不正确"); // 提示用户响应格式异常
            } // 结束响应格式校验
        } catch (error) {
            // 捕获请求或解析异常
            toast.error(
                `加载项目失败: ${error instanceof Error ? error.message : "未知错误"}`,
            ); // 弹出失败提示
            setGitlabProjects([]); // 兜底清空列表
        } finally {
            // 无论成功与否都执行
            setLoadingProjects(false); // 关闭加载状态
        } // 结束 finally
    }; // 结束 loadGitLabProjects

    // 打开添加对话框时加载项目
    const handleOpenAddDialog = () => {
        setShowAddDialog(true);
    };

    // biome-ignore lint/correctness/useExhaustiveDependencies: loadGitLabProjects is stable
    useEffect(() => {
        if (showAddDialog) {
            const timeoutId = setTimeout(() => {
                loadGitLabProjects(searchQuery);
            }, 300);
            return () => clearTimeout(timeoutId);
        }
    }, [searchQuery, showAddDialog]);

    // 添加仓库
    const handleAddRepository = async (project: GitLabProject) => {
        setSubmitting(true);
        try {
            const response = await fetch("/api/repositories", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    gitLabProjectId: project.id,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to add repository");
            }

            const newRepo = await response.json();
            setRepositories([...repositories, newRepo]);
            setShowAddDialog(false);
            setSearchQuery("");
            toast.success(`仓库 ${project.name} 已添加`);
        } catch (error) {
            toast.error(
                `添加失败: ${error instanceof Error ? error.message : "未知错误"}`,
            );
        } finally {
            setSubmitting(false);
        }
    };

    // 删除仓库
    const handleDeleteRepository = async (id: string) => {
        if (!confirm("确定要删除这个仓库吗？")) return;

        try {
            const response = await fetch(`/api/repositories?id=${id}`, {
                method: "DELETE",
            });

            if (!response.ok) throw new Error("Failed to delete repository");

            setRepositories(repositories.filter((r) => r.id !== id));
            toast.success("仓库已删除");
        } catch (error) {
            toast.error(
                `删除失败: ${error instanceof Error ? error.message : "未知错误"}`,
            );
        }
    };

    // 切换自动审查
    const handleToggleAutoReview = async (repo: Repository) => {
        try {
            const response = await fetch("/api/repositories", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: repo.id,
                    autoReview: !repo.autoReview,
                }),
            });

            if (!response.ok) throw new Error("Failed to update repository");

            const updated = await response.json();
            setRepositories(
                repositories.map((r) => (r.id === repo.id ? updated : r)),
            );
            toast.success(`自动审查已${repo.autoReview ? "禁用" : "启用"}`);
        } catch (error) {
            toast.error(
                `操作失败: ${error instanceof Error ? error.message : "未知错误"}`,
            );
        }
    };

    // 检查项目是否已添加
    const isProjectAdded = (projectId: number) => {
        return repositories.some((r) => r.gitLabProjectId === projectId);
    };

    return (
        <div className="p-8">
            {/* 页面标题 */}
            <div className="mb-8">
                <h1 className="mb-1 font-semibold text-2xl text-foreground">
                    仓库管理
                </h1>
                <p className="text-muted-foreground text-sm">
                    管理和配置 GitLab 仓库的代码审查
                </p>
            </div>

            {/* 操作栏 */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h2 className="font-semibold text-foreground text-lg">
                        仓库列表
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        已添加 {repositories.length} 个仓库
                    </p>
                </div>
                <Button onClick={handleOpenAddDialog}>
                    <Plus className="mr-2 h-4 w-4" />
                    添加仓库
                </Button>
            </div>

            {/* 仓库列表 */}
            <Card>
                <CardContent className="p-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                    ) : repositories.length === 0 ? (
                        <div className="py-12 text-center text-muted-foreground">
                            <GitFork className="mx-auto mb-4 h-12 w-12 opacity-50" />
                            <p>还没有添加任何仓库</p>
                            <p className="mt-2 text-xs">
                                点击上方按钮添加第一个仓库
                            </p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="border-b-2 hover:bg-transparent">
                                    <TableHead className="h-10 px-4 font-semibold text-muted-foreground text-xs">
                                        仓库名称
                                    </TableHead>
                                    <TableHead className="h-10 px-4 font-semibold text-muted-foreground text-xs">
                                        GitLab 账号
                                    </TableHead>
                                    <TableHead className="h-10 px-4 font-semibold text-muted-foreground text-xs">
                                        AI 模型
                                    </TableHead>
                                    <TableHead className="h-10 px-4 font-semibold text-muted-foreground text-xs">
                                        监听分支
                                    </TableHead>
                                    <TableHead className="h-10 px-4 font-semibold text-muted-foreground text-xs">
                                        自动审查
                                    </TableHead>
                                    <TableHead className="h-10 px-4 font-semibold text-muted-foreground text-xs">
                                        状态
                                    </TableHead>
                                    <TableHead className="h-10 px-4 text-right font-semibold text-muted-foreground text-xs">
                                        审查数
                                    </TableHead>
                                    <TableHead className="h-10 px-4 text-right font-semibold text-muted-foreground text-xs">
                                        操作
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {repositories.map((repo) => (
                                    <TableRow
                                        key={repo.id}
                                        className="hover:bg-muted/50"
                                    >
                                        <TableCell className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                                                    <GitFork className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-foreground text-sm">
                                                        {repo.name}
                                                    </p>
                                                    <p className="text-muted-foreground text-xs">
                                                        {repo.path}
                                                    </p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-4 py-3">
                                            <Badge variant="outline">
                                                {repo.gitLabAccount?.url || "-"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="px-4 py-3">
                                            {repo.defaultAIModel ? (
                                                <Badge
                                                    variant="default"
                                                    className="font-normal"
                                                >
                                                    {getModelDisplayName(
                                                        repo.defaultAIModel,
                                                    )}
                                                </Badge>
                                            ) : repo.customProvider ? (
                                                <Badge
                                                    variant="secondary"
                                                    className="font-normal"
                                                >
                                                    {repo.customModelId} (
                                                    {repo.customProvider})
                                                </Badge>
                                            ) : (
                                                <span className="text-muted-foreground text-xs">
                                                    未配置
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="px-4 py-3">
                                            {repo.watchBranches ? (
                                                <Badge
                                                    variant="outline"
                                                    className="text-xs"
                                                >
                                                    {repo.watchBranches}
                                                </Badge>
                                            ) : (
                                                <span className="text-muted-foreground text-xs">
                                                    所有分支
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="px-4 py-3">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                    handleToggleAutoReview(repo)
                                                }
                                            >
                                                <Badge
                                                    variant={
                                                        repo.autoReview
                                                            ? "default"
                                                            : "secondary"
                                                    }
                                                >
                                                    {repo.autoReview
                                                        ? "启用"
                                                        : "禁用"}
                                                </Badge>
                                            </Button>
                                        </TableCell>
                                        <TableCell className="px-4 py-3">
                                            <Badge
                                                variant={
                                                    repo.isActive
                                                        ? "default"
                                                        : "secondary"
                                                }
                                            >
                                                {repo.isActive
                                                    ? "活跃"
                                                    : "未激活"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-right text-muted-foreground text-sm">
                                            {repo._count?.reviewLogs || 0}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-right">
                                            <Link
                                                href={`/repositories/${repo.id}`}
                                            >
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                onClick={() =>
                                                    handleDeleteRepository(
                                                        repo.id,
                                                    )
                                                }
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* 添加仓库对话框 */}
            {showAddDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80">
                    <Card className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden">
                        <CardHeader className="border-b">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>添加仓库</CardTitle>
                                    <CardDescription>
                                        从您的 GitLab 账号中选择要添加的仓库
                                    </CardDescription>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                        setShowAddDialog(false);
                                        setSearchQuery("");
                                    }}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto p-6">
                            {/* 搜索框 */}
                            <div className="mb-4 space-y-2">
                                <Label>搜索仓库</Label>
                                <div className="relative">
                                    <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
                                    <Input
                                        placeholder="输入仓库名称搜索..."
                                        className="pl-9"
                                        value={searchQuery}
                                        onChange={(e) =>
                                            setSearchQuery(e.target.value)
                                        }
                                    />
                                </div>
                            </div>

                            {/* 项目列表 */}
                            <div className="space-y-2">
                                {loadingProjects ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="h-6 w-6 animate-spin" />
                                    </div>
                                ) : gitlabProjects.length === 0 ? (
                                    <div className="py-12 text-center text-muted-foreground">
                                        <GitFork className="mx-auto mb-4 h-12 w-12 opacity-50" />
                                        <p>没有找到仓库</p>
                                        <p className="mt-2 text-xs">
                                            请尝试其他搜索关键词
                                        </p>
                                    </div>
                                ) : (
                                    (Array.isArray(gitlabProjects)
                                        ? gitlabProjects
                                        : []
                                    ).map((project) => {
                                        // 渲染项目列表并兜底非数组情况
                                        const isAdded = isProjectAdded(
                                            project.id,
                                        );
                                        return (
                                            <div
                                                key={project.id}
                                                className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <GitFork className="h-4 w-4 shrink-0 text-muted-foreground" />
                                                        <p className="truncate font-medium text-foreground text-sm">
                                                            {project.name}
                                                        </p>
                                                        {isAdded && (
                                                            <Badge
                                                                variant="secondary"
                                                                className="shrink-0"
                                                            >
                                                                已添加
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="ml-6 truncate text-muted-foreground text-xs">
                                                        {
                                                            project.path_with_namespace
                                                        }
                                                    </p>
                                                    {project.description && (
                                                        <p className="mt-1 ml-6 truncate text-muted-foreground text-xs">
                                                            {
                                                                project.description
                                                            }
                                                        </p>
                                                    )}
                                                </div>
                                                <Button
                                                    size="sm"
                                                    onClick={() =>
                                                        handleAddRepository(
                                                            project,
                                                        )
                                                    }
                                                    disabled={
                                                        isAdded || submitting
                                                    }
                                                >
                                                    {isAdded
                                                        ? "已添加"
                                                        : "添加"}
                                                </Button>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
