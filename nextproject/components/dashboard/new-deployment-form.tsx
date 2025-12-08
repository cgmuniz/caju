"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

const API_BASE_URL = "http://localhost:5000/api"

const pollJobStatus = async (jobId: string) => {
  return new Promise<any>((resolve, reject) => {
    const checkStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/job/status/${jobId}`)
        if (!response.ok) {
          throw new Error(`API de Status falhou com código: ${response.status}`)
        }

        const result = await response.json()

        if (result.status === 'success' || result.status === 'error') {
          // Trabalho concluído (sucesso ou falha), resolve a Promise
          resolve(result)
        } else {
          // Trabalho em andamento, tenta novamente
          setTimeout(checkStatus, 2000) // Polling a cada 2 segundos
        }
      } catch (err) {
        // Erro de conexão ou parsing, rejeita
        reject(err)
      }
    }
    checkStatus()
  })
}

export function NewDeploymentForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null) // Novo estado para feedback de polling

  const [name, setName] = useState("")
  const [type, setType] = useState<string>("")
  const [memory, setMemory] = useState([512])
  const [cpu, setCpu] = useState([0.5])
  const [hostPort, setHostPort] = useState<number | string>(25565)

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
    setStatusMessage(null)

    // 1. Mapeamento de Dados Específicos do Serviço
    let serviceInputs: { [key: string]: any } = {}
    let serviceType: string;

    if (type === "minecraft") {
      serviceType = "Minecraft Server" // Nome do template na API Python
      serviceInputs = {
        "Nome do Container": name,
        "Porta Local (Host)": hostPort.toString(),
        // A memória deve ser uma string com 'G', conforme esperado pelo template Docker
        "Memória RAM (ex: 2G)": `${minecraftConfig.ramGB}G`,
      }
      // Adicionar outros campos que a API Python pode usar para o Docker (versão, seed, etc.)
      // ... (Omissão de mapeamento completo para simplificar o exemplo)

    } else if (type === "discord-bot") {
      serviceType = "Discord Bot" // Exemplo
      serviceInputs = {
        "Nome do Container": name,
        // ... (Mapear as configs do DiscordBot aqui)
      }
    } else {
      setError("Selecione um tipo de hospedagem válido.")
      setIsLoading(false)
      return
    }

    // Payload final para a API Python
    const payload = {
      service_name: serviceType,
      user_inputs: serviceInputs,
    }

    try {
      setStatusMessage("Iniciando o Job de lançamento na API Python...")

      // 2. POST para /api/launch
      const launchResponse = await fetch(`${API_BASE_URL}/launch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const launchData = await launchResponse.json()

      if (!launchResponse.ok || launchData.status === 'error') {
        throw new Error(launchData.message || "Falha na requisição de lançamento.")
      }

      const jobId = launchData.job_id
      setStatusMessage(`Job iniciado. ID: ${jobId}. Aguardando conclusão do Docker...`)

      // 3. Polling para /api/job/status/{jobId}
      const finalResult = await pollJobStatus(jobId)

      // 4. Tratamento do Resultado Final
      if (finalResult.status === 'success') {
        setStatusMessage(`✅ Sucesso! ${finalResult.message}`)
        // Redirecionar para o dashboard após o sucesso
        setTimeout(() => router.push("/dashboard"), 3000)
      } else {
        setError(`❌ Falha na Hospedagem: ${finalResult.message}`)
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha grave de conexão ou API.")
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
                    className={`flex flex-col items-start gap-2 rounded-lg border-2 p-4 text-left transition-colors hover:border-primary ${type === deploymentType.value ? "border-primary bg-primary/5" : "border-border"
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
              <Label htmlFor="host-port">Porta de Acesso (Host)</Label>
              <Input
                id="host-port"
                placeholder="25565"
                type="number"
                min={1024}
                max={65535}
                value={hostPort}
                onChange={(e) => setHostPort(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">A porta que você usará para conectar ao serviço (Ex: 25565 para Minecraft)</p>
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

        {(error || statusMessage) && (
          <div
            className={`rounded-lg border p-4 ${error ? "border-destructive bg-destructive/10" : "border-yellow-500 bg-yellow-500/10"
              }`}
          >
            <p className={`text-sm ${error ? "text-destructive" : "text-yellow-600"}`}>
              {error || statusMessage}
            </p>
          </div>
        )}

        <div className="flex gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()} className="flex-1">
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading || ((type === "mini-app") && !name) || !type} className="flex-1">
            {isLoading ? (statusMessage || "Criando...") : "Criar Hospedagem"}
          </Button>
        </div>
      </div>
    </form>
  )
}
