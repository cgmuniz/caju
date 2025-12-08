"use client"

import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DeploymentDetails } from "@/components/dashboard/deployment-details"
import { DeploymentsList } from "@/components/dashboard/deployments-list"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { useState, useEffect } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, AlertTriangle } from "lucide-react"

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

const API_DEPLOYMENTS_URL = "http://localhost:5000/api/deployments"

export default function DashboardPage() {
  const [deployments, setDeployments] = useState<Deployment[]>([]) 
  const [selectedDeployment, setSelectedDeployment] = useState<Deployment | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDeployments = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(API_DEPLOYMENTS_URL)
      if (!response.ok) {
        throw new Error(`Falha na API: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.status === 'error') {
         throw new Error(data.message);
      }
      
      setDeployments(data.deployments)

    } catch (err) {
      setError(`Não foi possível carregar os deployments. Certifique-se de que a API Python está rodando na porta 5000. Erro: ${err instanceof Error ? err.message : 'Desconhecido'}`)
      setDeployments([]) // Limpa a lista em caso de erro
    } finally {
      setIsLoading(false)
    }
  }

  // 💡 useEffect para buscar os dados na montagem do componente
  useEffect(() => {
    fetchDeployments()
    // Opcional: Implementar polling aqui para atualização em tempo real
    const interval = setInterval(fetchDeployments, 10000); // Atualiza a cada 10s
    return () => clearInterval(interval);
  }, [])

  const handleSelectDeployment = (deployment: Deployment) => {
    setSelectedDeployment(deployment)
  }

  const handleBack = () => {
    setSelectedDeployment(null)
  }

  const handleUpdateDeployment = (updated: Deployment) => {
    setDeployments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
    setSelectedDeployment(updated)
  }

  const handleDeleteDeployment = (id: string) => {
    setDeployments((prev) => prev.filter((d) => d.id !== id))
    setSelectedDeployment(null)
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-3 text-lg text-muted-foreground">Carregando dados do Docker...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col">
        <DashboardHeader />
        <main className="flex-1 container py-8">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Erro ao conectar</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </main>
      </div>
    )
  }

  if (selectedDeployment) {
    return (
      <div className="flex min-h-screen flex-col">
        <DashboardHeader />
        <main className="flex-1">
          <div className="container py-8">
            <DeploymentDetails
              deployment={selectedDeployment}
              onBack={handleBack}
              onUpdate={handleUpdateDeployment}
              onDelete={handleDeleteDeployment}
            />
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Painel</h1>
              <p className="text-muted-foreground">Gerencie suas hospedagens e monitore o desempenho</p>
            </div>
          </div>
          <StatsCards deployments={deployments} />
          <DeploymentsList deployments={deployments} onSelect={handleSelectDeployment} onUpdate={setDeployments} />
        </div>
      </main>
    </div>
  )
}