import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Server, Activity, Clock, TrendingUp } from "lucide-react"

interface Deployment {
  id: string
  status: string
  created_at: string
  type: string
}

interface StatsCardsProps {
  deployments: Deployment[]
}

export function StatsCards({ deployments }: StatsCardsProps) {
  const totalDeployments = deployments.length
  const runningDeployments = deployments.filter((d) => d.status === "running").length
  const recentDeployments = deployments.filter((d) => {
    const createdAt = new Date(d.created_at)
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    return createdAt > dayAgo
  }).length

  const minecraftServers = deployments.filter((d) => d.type === "minecraft").length
  const discordBots = deployments.filter((d) => d.type === "discord-bot").length
  const miniApps = deployments.filter((d) => d.type === "mini-app").length

  return (
    <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Total de Hospedagens</CardTitle>
          <Server className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalDeployments}</div>
          <p className="text-xs text-muted-foreground">
            {minecraftServers} Minecraft • {discordBots} Discord • {miniApps} Apps
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Em Execução</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{runningDeployments}</div>
          <p className="text-xs text-muted-foreground">
            {totalDeployments > 0
              ? `${Math.round((runningDeployments / totalDeployments) * 100)}% ativas`
              : "Nenhuma ativa"}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Recentes</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{recentDeployments}</div>
          <p className="text-xs text-muted-foreground">Últimas 24 horas</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Crescimento</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">+{recentDeployments}</div>
          <p className="text-xs text-muted-foreground">
            {recentDeployments > 0 ? "Crescendo rapidamente" : "Crie sua primeira"}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
