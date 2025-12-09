"use client"

import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Loader2 } from "lucide-react"

type Deployment = {
  id: string;
  name: string;
  type: string;
  status: string;
  created_at: string;
  memory_mb: number;
  cpu_cores: number;
  host_port?: string | number;
}

interface DeploymentsListProps {
  deployments: Deployment[]
  onSelect: (deployment: Deployment) => void
  onUpdate: (deployments: Deployment[]) => void
}

const API_BASE_URL = "http://localhost:5000/api"

// 💡 Função auxiliar para buscar a lista atualizada do backend (usada após uma ação)
const fetchUpdatedDeployments = async () => {
  const response = await fetch(`${API_BASE_URL}/deployments`);
  if (!response.ok) {
    throw new Error("Falha ao recarregar lista após ação.");
  }
  const data = await response.json();
  return data.deployments;
};

export function DeploymentsList({ deployments, onSelect, onUpdate }: DeploymentsListProps) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null) // Para mostrar o carregamento em um item específico
  const [apiError, setApiError] = useState<string | null>(null)

  const getIcon = (type: string) => {
    switch (type) {
      case "minecraft":
        return <span className="text-xl">🎮</span>
      case "discord-bot":
        return <span className="text-xl">🤖</span>
      case "mini-app":
        return <span className="text-xl">⚡</span>
      default:
        return <span className="text-xl">🖥️</span>
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "running":
        return "default"
      case "stopped":
        return "secondary"
      case "pending":
        return "outline"
      case "failed":
        return "destructive"
      default:
        return "secondary"
    }
  }

  const handleStatusToggle = async (id: string, currentStatus: string) => {
    setLoadingId(id)
    setApiError(null)

    const action = currentStatus === "running" ? "stop" : "start"
    const endpoint = `${API_BASE_URL}/deployments/${id}/${action}`
    const actionText = action === 'stop' ? 'Parar' : 'Iniciar';

    try {
      const response = await fetch(endpoint, { method: 'POST' })
      const data = await response.json()

      if (!response.ok || data.status === 'error') {
        throw new Error(data.message || `Falha na API: Não foi possível ${actionText}.`)
      }

      // Sucesso: Recarrega a lista completa do backend para pegar o novo status
      const updatedList = await fetchUpdatedDeployments();
      onUpdate(updatedList);

    } catch (error) {
      setApiError(`Erro ao tentar ${actionText}: ${error instanceof Error ? error.message : 'Desconhecido'}`)
    } finally {
      setLoadingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta hospedagem?")) return

    setLoadingId(id)
    setApiError(null)
    const endpoint = `${API_BASE_URL}/deployments/${id}`

    try {
      const response = await fetch(endpoint, { method: 'DELETE' })
      const data = await response.json()

      if (!response.ok || data.status === 'error') {
        throw new Error(data.message || 'Falha na requisição DELETE.')
      }

      // Sucesso: Recarrega a lista do backend
      const updatedList = await fetchUpdatedDeployments();
      onUpdate(updatedList);

    } catch (error) {
      setApiError(`Erro ao excluir: ${error instanceof Error ? error.message : 'Desconhecido'}`)
    } finally {
      setLoadingId(null)
    }
  }

  if (deployments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Suas Hospedagens</CardTitle>
          <CardDescription>Você ainda não tem nenhuma hospedagem</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <span className="mb-4 text-6xl">🖥️</span>
          <p className="mb-4 text-center text-muted-foreground">
            Crie sua primeira hospedagem para começar com a CajuHost
          </p>
          <Button onClick={() => router.push("/dashboard/new")}>Criar Hospedagem</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Suas Hospedagens</CardTitle>
        <CardDescription>Gerencie e monitore todas as suas hospedagens</CardDescription>
      </CardHeader>
      <CardContent>
        {/* 💡 Exibir Erro da API na Lista */}
        {apiError && (
          <div className="mb-4 rounded-lg border border-destructive bg-destructive/10 p-2">
            <p className="text-sm text-destructive">{apiError}</p>
          </div>
        )}
        <div className="space-y-4">
          {deployments.map((deployment) => (
            <div key={deployment.id} className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {getIcon(deployment.type)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{deployment.name}</h3>
                    <Badge variant={getStatusColor(deployment.status)}>{deployment.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {deployment.type.replace("-", " ")} • {deployment.memory_mb}MB RAM • {deployment.cpu_cores} CPU
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleStatusToggle(deployment.id, deployment.status)}
                  // 💡 Desabilita o botão se esta linha estiver carregando
                  disabled={loadingId === deployment.id}
                >
                  {/* 💡 Exibir Loader ou Ícone */}
                  {loadingId === deployment.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    deployment.status === "running" ? <span>⏸️</span> : <span>▶️</span>
                  )}
                </Button>
                <Button variant="outline" size="sm" onClick={() => onSelect(deployment)}>
                  Ver Detalhes
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" disabled={loadingId === deployment.id}>
                      <span>⋮</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => handleDelete(deployment.id)}
                      className="cursor-pointer text-destructive"
                      disabled={loadingId === deployment.id}
                    >
                      <span className="mr-2">🗑️</span>
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
