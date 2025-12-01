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

  // Simulate real-time metrics updates
  useEffect(() => {
    const interval = setInterval(() => {
      setDeployment((prev) => ({
        ...prev,
        metrics: {
          cpu_usage: Math.random() * 100,
          ram_usage: Math.random() * 100,
          uptime: (prev.metrics?.uptime || 0) + 1,
          requests: (prev.metrics?.requests || 0) + Math.floor(Math.random() * 10),
        },
      }))
    }, 3000)

    return () => clearInterval(interval)
  }, [])

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

  const handleStatusToggle = () => {
    setLoading(true)
    const newStatus = deployment.status === "running" ? "stopped" : "running"
    const updated = { ...deployment, status: newStatus }
    setDeployment(updated)
    onUpdate(updated)
    setLoading(false)
  }

  const handleDelete = () => {
    if (!confirm("Tem certeza que deseja excluir esta hospedagem?")) return
    onDelete(deployment.id)
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

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">
            <Activity className="mr-2 h-4 w-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="monitoring">
            <Activity className="mr-2 h-4 w-4" />
            Monitoramento
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="mr-2 h-4 w-4" />
            Configurações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">CPU</CardTitle>
                <Cpu className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{deployment.cpu_cores} vCPU</div>
                <p className="text-xs text-muted-foreground">Núcleos alocados</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">RAM</CardTitle>
                <MemoryStick className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{deployment.memory_mb} MB</div>
                <p className="text-xs text-muted-foreground">Memória alocada</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Uptime</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatUptime(deployment.metrics?.uptime || 0)}</div>
                <p className="text-xs text-muted-foreground">Tempo ativo</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Requisições</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{deployment.metrics?.requests || 0}</div>
                <p className="text-xs text-muted-foreground">Total de requisições</p>
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

        <TabsContent value="monitoring" className="space-y-6">
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
              <CardTitle>Logs em Tempo Real</CardTitle>
              <CardDescription>Últimas atividades da aplicação</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg bg-black p-4 font-mono text-sm text-green-400">
                <div>[{new Date().toLocaleTimeString()}] Aplicação iniciada com sucesso</div>
                <div>[{new Date().toLocaleTimeString()}] Conectado ao banco de dados</div>
                <div>[{new Date().toLocaleTimeString()}] Servidor rodando na porta 3000</div>
                <div>[{new Date().toLocaleTimeString()}] Requisição recebida: GET /api/health</div>
                <div>[{new Date().toLocaleTimeString()}] Status: 200 OK</div>
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
