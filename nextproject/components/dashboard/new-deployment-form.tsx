"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Server, Bot, Zap } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { MinecraftConfig } from "./minecraft-config"
import { DiscordConfig } from "./discord-config"

const deploymentTypes = [
  {
    value: "minecraft",
    label: "Servidor Minecraft",
    description: "Hospede servidores Minecraft vanilla ou com mods",
    icon: Server,
  },
  {
    value: "discord-bot",
    label: "Bot Discord",
    description: "Implante bots Discord com uptime 24/7",
    icon: Bot,
  },
  {
    value: "mini-app",
    label: "Mini Aplicação",
    description: "Hospede web apps, APIs e microsserviços",
    icon: Zap,
  },
]

export function NewDeploymentForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState("")
  const [type, setType] = useState<string>("")
  const [memory, setMemory] = useState([512])
  const [cpu, setCpu] = useState([0.5])

  const [minecraftConfig, setMinecraftConfig] = useState({
    serverName: "",
    version: "1.21.1",
    gameMode: "survival",
    difficulty: "normal",
    maxPlayers: 20,
    worldSeed: "",
    ramGB: 4,
    storage: 10,
    plugins: [] as string[],
    whitelist: "",
  })

  const [discordConfig, setDiscordConfig] = useState({
    botName: "",
    description: "",
    mainFile: "index.js",
    startCommand: "node index.js",
    runtime: "nodejs",
    runtimeVersion: "20.x",
    sourceType: "upload",
    sourceUrl: "",
    envVars: [] as Array<{ key: string; value: string; visible: boolean }>,
    ramGB: 1,
    cpuCores: 0.5,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      router.push("/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar hospedagem")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Tipo de Hospedagem</CardTitle>
            <CardDescription>Escolha o que você deseja hospedar</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {deploymentTypes.map((deploymentType) => {
                const Icon = deploymentType.icon
                return (
                  <button
                    key={deploymentType.value}
                    type="button"
                    onClick={() => setType(deploymentType.value)}
                    className={`flex flex-col items-start gap-2 rounded-lg border-2 p-4 text-left transition-colors hover:border-primary ${
                      type === deploymentType.value ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <Icon className="h-8 w-8 text-primary" />
                    <div>
                      <h3 className="font-semibold">{deploymentType.label}</h3>
                      <p className="text-sm text-muted-foreground">{deploymentType.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Configuração</CardTitle>
            <CardDescription>Configure os detalhes da sua hospedagem</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Hospedagem</Label>
              <Input
                id="name"
                placeholder="meu-servidor-incrivel"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">Escolha um nome único para sua hospedagem</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="type">
                  <SelectValue placeholder="Selecione o tipo de hospedagem" />
                </SelectTrigger>
                <SelectContent>
                  {deploymentTypes.map((deploymentType) => (
                    <SelectItem key={deploymentType.value} value={deploymentType.value}>
                      {deploymentType.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {type === "minecraft" ? (
          <MinecraftConfig config={minecraftConfig} onChange={setMinecraftConfig} />
        ) : type === "discord-bot" ? (
          <DiscordConfig config={discordConfig} onChange={setDiscordConfig} />
        ) : type === "mini-app" ? (
          <Card>
            <CardHeader>
              <CardTitle>Recursos</CardTitle>
              <CardDescription>Aloque recursos computacionais para sua hospedagem</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Memória (RAM)</Label>
                  <span className="text-sm font-medium">{memory[0]} MB</span>
                </div>
                <Slider value={memory} onValueChange={setMemory} min={256} max={4096} step={256} />
                <p className="text-xs text-muted-foreground">Recomendado: 512MB para bots, 1GB+ para servidores</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Núcleos de CPU</Label>
                  <span className="text-sm font-medium">{cpu[0]} núcleos</span>
                </div>
                <Slider value={cpu} onValueChange={setCpu} min={0.5} max={4} step={0.5} />
                <p className="text-xs text-muted-foreground">
                  Mais núcleos = melhor desempenho para tarefas intensivas
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {error && (
          <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <div className="flex gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()} className="flex-1">
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading || !name || !type} className="flex-1">
            {isLoading ? "Criando..." : "Criar Hospedagem"}
          </Button>
        </div>
      </div>
    </form>
  )
}
