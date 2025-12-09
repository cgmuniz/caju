"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Server,
  Bot,
  Zap,
  Play,
  Square,
  Trash2,
  Settings,
  Activity,
  Cpu,
  MemoryStick,
  Clock,
  ArrowLeft,
} from "lucide-react"
import { useState, useEffect } from "react"
import { Progress } from "@/components/ui/progress"

interface Deployment {
  id: string
  name: string
  type: string
  status: string
  created_at: string
  memory_mb: number
  cpu_cores: number
  config?: any
  metrics?: {
    cpu_usage?: number
    ram_usage?: number
    uptime?: number
    requests?: number
  }
}

const API_BASE_URL = "http://localhost:5000/api"

interface DeploymentDetailsProps {
  deployment: Deployment
  onBack: () => void
  onUpdate: (deployment: Deployment) => void
  onDelete: (id: string) => void
}

export function DeploymentDetails({
  deployment: initialDeployment,
  onBack,
  onUpdate,
  onDelete,
}: DeploymentDetailsProps) {
  const [deployment, setDeployment] = useState(initialDeployment)
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        if (deployment.status !== 'running') {
          // Não busca métricas se o container estiver parado
          setDeployment(prev => ({ ...prev, metrics: { cpu_usage: 0, ram_usage: 0, uptime: prev.metrics?.uptime } }));
          return;
        }

        const response = await fetch(`${API_BASE_URL}/deployments/${deployment.id}/metrics`);
        const data = await response.json();

        if (response.ok && data.status === 'success') {
          setDeployment(prev => ({
            ...prev,
            metrics: {
              cpu_usage: data.metrics.cpu_usage,

              ram_usage: data.metrics.ram_usage,

              uptime: (prev.metrics?.uptime || 0) + 3,
              requests: prev.metrics?.requests
            },
          }));
        } else if (data.message.includes('Container não está ativo')) {
          // Se o container parou, zera as métricas
          setDeployment(prev => ({ ...prev, metrics: { cpu_usage: 0, ram_usage: 0, uptime: prev.metrics?.uptime } }));
        }

      } catch (error) {
        console.error("Falha ao buscar métricas:", error);
      }
    };

    const interval = setInterval(fetchMetrics, 3000); // Polling a cada 3 segundos
    fetchMetrics(); // Executa imediatamente

    return () => clearInterval(interval);
  }, [deployment.id, deployment.status]);

  const getIcon = (type: string) => {
    switch (type) {
      case "minecraft":
        return <Server className="h-6 w-6" />
      case "discord-bot":
        return <Bot className="h-6 w-6" />
      case "mini-app":
        return <Zap className="h-6 w-6" />
      default:
        return <Server className="h-6 w-6" />
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

  const handleStatusToggle = async () => {
    setLoading(true)
    setApiError(null)

    const isRunning = deployment.status === "running"
    const action = isRunning ? "stop" : "start"
    const endpoint = `${API_BASE_URL}/deployments/${deployment.id}/${action}`
    const newStatus = isRunning ? "stopped" : "running"

    try {
      const response = await fetch(endpoint, { method: 'POST' })
      const data = await response.json()

      if (!response.ok || data.status === 'error') {
        throw new Error(data.message || `Falha na API: Não foi possível ${action}.`)
      }

      // Sucesso: Atualiza o estado local e global
      const updated = { ...deployment, status: newStatus }
      setDeployment(updated)
      onUpdate(updated)

    } catch (error) {
      setApiError(`Erro ao tentar ${action}: ${error instanceof Error ? error.message : 'Desconhecido'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Tem certeza que deseja excluir esta hospedagem? Esta ação é irreversível e removerá o container Docker.")) return

    setLoading(true)
    setApiError(null)
    const endpoint = `${API_BASE_URL}/deployments/${deployment.id}`

    try {
      // DELETE: Rota mais comum para exclusão
      const response = await fetch(endpoint, { method: 'DELETE' })
      const data = await response.json()

      if (!response.ok || data.status === 'error') {
        throw new Error(data.message || 'Falha na requisição DELETE.')
      }

      // Sucesso: Chama a função global para remover do estado e volta para o painel
      onDelete(deployment.id)
      onBack() // Retorna ao Dashboard

    } catch (error) {
      setApiError(`Erro ao excluir: ${error instanceof Error ? error.message : 'Desconhecido'}`)
    } finally {
      setLoading(false)
    }
  }

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {getIcon(deployment.type)}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{deployment.name}</h1>
              <div className="flex items-center gap-2">
                <Badge variant={getStatusColor(deployment.status)}>{deployment.status}</Badge>
                <span className="text-sm text-muted-foreground">{deployment.type.replace("-", " ")}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleStatusToggle} disabled={loading}>
            {deployment.status === "running" ? (
              <>
                <Square className="mr-2 h-4 w-4" />
                Parar
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Iniciar
              </>
            )}
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            <Trash2 className="mr-2 h-4 w-4" />
            Excluir
          </Button>
        </div>
      </div>

      {apiError && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{apiError}</p>
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">
            <Activity className="mr-2 h-4 w-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="mr-2 h-4 w-4" />
            Configurações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Uso de CPU</CardTitle>
                <CardDescription>Utilização em tempo real</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{(deployment.metrics?.cpu_usage || 0).toFixed(1)}%</span>
                  <Cpu className="h-8 w-8 text-primary" />
                </div>
                <Progress value={deployment.metrics?.cpu_usage || 0} />
                <p className="text-xs text-muted-foreground">
                  {deployment.metrics?.cpu_usage && deployment.metrics.cpu_usage > 80
                    ? "Alto uso de CPU detectado"
                    : "Uso normal"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Uso de RAM</CardTitle>
                <CardDescription>Memória utilizada</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{(deployment.metrics?.ram_usage || 0).toFixed(1)}%</span>
                  <MemoryStick className="h-8 w-8 text-primary" />
                </div>
                <Progress value={deployment.metrics?.ram_usage || 0} />
                <p className="text-xs text-muted-foreground">
                  {deployment.memory_mb
                    ? `${(((deployment.metrics?.ram_usage || 0) * deployment.memory_mb) / 100).toFixed(0)} MB de ${deployment.memory_mb} MB`
                    : "Memória disponível"}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Informações da Hospedagem</CardTitle>
              <CardDescription>Detalhes e configurações da sua hospedagem</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">ID</p>
                  <p className="font-mono text-sm">{deployment.id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Criado em</p>
                  <p className="text-sm">{new Date(deployment.created_at).toLocaleString("pt-BR")}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tipo</p>
                  <p className="text-sm">{deployment.type.replace("-", " ")}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge variant={getStatusColor(deployment.status)}>{deployment.status}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configurações da Hospedagem</CardTitle>
              <CardDescription>Gerencie as configurações da sua aplicação</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Funcionalidade de edição em desenvolvimento. Em breve você poderá editar todas as configurações da sua
                hospedagem.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
