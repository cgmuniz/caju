import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { NewDeploymentForm } from "@/components/dashboard/new-deployment-form"

export default function NewDeploymentPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <DashboardHeader />
      <main className="flex-1">
        <div className="container py-8">
          <div className="mx-auto max-w-2xl">
            <div className="mb-8">
              <h1 className="text-3xl font-bold tracking-tight">Criar Nova Hospedagem</h1>
              <p className="text-muted-foreground">Configure e implante sua aplicação em segundos</p>
            </div>
            <NewDeploymentForm />
          </div>
        </div>
      </main>
    </div>
  )
}
