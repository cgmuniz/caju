"use client"

import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface Deployment {
  id: string
  name: string
  type: string
  status: string
  created_at: string
  memory_mb: number
  cpu_cores: number
}

interface DeploymentsListProps {
  deployments: Deployment[]
  onSelect: (deployment: Deployment) => void
  onUpdate: (deployments: Deployment[]) => void
}

export function DeploymentsList({ deployments, onSelect, onUpdate }: DeploymentsListProps) {
  const router = useRouter()

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

  const handleStatusToggle = (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "running" ? "stopped" : "running"
    onUpdate(deployments.map((d) => (d.id === id ? { ...d, status: newStatus } : d)))
  }

  const handleDelete = (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta hospedagem?")) return
    onUpdate(deployments.filter((d) => d.id !== id))
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
                >
                  {deployment.status === "running" ? <span>⏸️</span> : <span>▶️</span>}
                </Button>
                <Button variant="outline" size="sm" onClick={() => onSelect(deployment)}>
                  Ver Detalhes
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <span>⋮</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => handleDelete(deployment.id)}
                      className="cursor-pointer text-destructive"
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
