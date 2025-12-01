"use client"

import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DeploymentDetails } from "@/components/dashboard/deployment-details"
import { DeploymentsList } from "@/components/dashboard/deployments-list"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { useState } from "react"

const initialDeployments = [
  {
    id: "1",
    name: "Meu Servidor Minecraft",
    type: "minecraft",
    status: "running",
    created_at: new Date().toISOString(),
    memory_mb: 4096,
    cpu_cores: 2,
  },
  {
    id: "2",
    name: "Bot Discord",
    type: "discord-bot",
    status: "running",
    created_at: new Date().toISOString(),
    memory_mb: 512,
    cpu_cores: 1,
  },
]

export default function DashboardPage() {
  const [deployments, setDeployments] = useState(initialDeployments)
  const [selectedDeployment, setSelectedDeployment] = useState<(typeof initialDeployments)[0] | null>(null)

  const handleSelectDeployment = (deployment: (typeof initialDeployments)[0]) => {
    setSelectedDeployment(deployment)
  }

  const handleBack = () => {
    setSelectedDeployment(null)
  }

  const handleUpdateDeployment = (updated: (typeof initialDeployments)[0]) => {
    setDeployments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
    setSelectedDeployment(updated)
  }

  const handleDeleteDeployment = (id: string) => {
    setDeployments((prev) => prev.filter((d) => d.id !== id))
    setSelectedDeployment(null)
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
