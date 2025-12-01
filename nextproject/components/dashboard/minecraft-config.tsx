"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Server, Zap, AlertCircle } from "lucide-react"

interface MinecraftConfig {
  serverName: string
  version: string
  gameMode: string
  difficulty: string
  maxPlayers: number
  worldSeed: string
  ramGB: number
  storage: number
  plugins: string[]
  whitelist: string
}

interface MinecraftConfigProps {
  config: MinecraftConfig
  onChange: (config: MinecraftConfig) => void
}

const MINECRAFT_VERSIONS = [
  { value: "1.21.1", label: "1.21.1", badge: "Atual" },
  { value: "1.20.1", label: "1.20.1", badge: "Popular" },
  { value: "1.19.4", label: "1.19.4", badge: "" },
  { value: "1.18.2", label: "1.18.2", badge: "" },
  { value: "1.16.5", label: "1.16.5", badge: "Clássica" },
  { value: "1.12.2", label: "1.12.2", badge: "Mods" },
]

const GAME_MODES = [
  { value: "survival", label: "Sobrevivência", description: "Colete recursos e sobreviva" },
  { value: "creative", label: "Criativo", description: "Construa sem limites" },
  { value: "adventure", label: "Aventura", description: "Explore mapas customizados" },
]

const DIFFICULTIES = [
  { value: "peaceful", label: "Pacífico" },
  { value: "easy", label: "Fácil" },
  { value: "normal", label: "Normal" },
  { value: "hard", label: "Difícil" },
  { value: "hardcore", label: "Hardcore" },
]

const POPULAR_PLUGINS = [
  { id: "essentialsx", name: "EssentialsX", description: "Comandos essenciais" },
  { id: "worldedit", name: "WorldEdit", description: "Edição de mundo" },
  { id: "vault", name: "Vault", description: "Sistema de economia" },
  { id: "luckperms", name: "LuckPerms", description: "Gerenciamento de permissões" },
]

const RAM_OPTIONS = [
  { value: 2, label: "2GB" },
  { value: 4, label: "4GB" },
  { value: 8, label: "8GB" },
  { value: 16, label: "16GB" },
]

export function MinecraftConfig({ config, onChange }: MinecraftConfigProps) {
  const updateConfig = (updates: Partial<MinecraftConfig>) => {
    onChange({ ...config, ...updates })
  }

  const togglePlugin = (pluginId: string) => {
    const plugins = config.plugins.includes(pluginId)
      ? config.plugins.filter((p) => p !== pluginId)
      : [...config.plugins, pluginId]
    updateConfig({ plugins })
  }

  const ramOption = RAM_OPTIONS.find((r) => r.value === config.ramGB) || RAM_OPTIONS[0]

  const getPerformanceStatus = () => {
    const playersPerGB = config.maxPlayers / config.ramGB
    if (playersPerGB <= 5) return { label: "Excelente", color: "text-green-600", icon: "🔋" }
    if (playersPerGB <= 10) return { label: "Bom", color: "text-blue-600", icon: "⚡" }
    return { label: "Alto uso de RAM", color: "text-orange-600", icon: "⚠️" }
  }

  const performance = getPerformanceStatus()

  return (
    <div className="space-y-6">
      {/* Basic Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações Básicas</CardTitle>
          <CardDescription>Configure as opções essenciais do seu servidor</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Server Name with Preview */}
          <div className="space-y-2">
            <Label htmlFor="serverName">Nome do Servidor</Label>
            <Input
              id="serverName"
              placeholder="Meu Servidor Incrível"
              value={config.serverName}
              onChange={(e) => updateConfig({ serverName: e.target.value })}
            />
            <div className="rounded-md border bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground mb-1">Preview no jogo:</p>
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-green-600" />
                <span className="font-medium">{config.serverName || "Meu Servidor Incrível"}</span>
                <Badge variant="secondary" className="text-xs">
                  {config.maxPlayers} jogadores
                </Badge>
              </div>
            </div>
          </div>

          {/* Minecraft Version */}
          <div className="space-y-2">
            <Label htmlFor="version">Versão do Minecraft</Label>
            <Select value={config.version} onValueChange={(value) => updateConfig({ version: value })}>
              <SelectTrigger id="version">
                <SelectValue placeholder="Selecione a versão" />
              </SelectTrigger>
              <SelectContent>
                {MINECRAFT_VERSIONS.map((version) => (
                  <SelectItem key={version.value} value={version.value}>
                    <div className="flex items-center gap-2">
                      <span>{version.label}</span>
                      {version.badge && (
                        <Badge variant="secondary" className="text-xs">
                          {version.badge}
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Game Mode */}
          <div className="space-y-2">
            <Label>Modo de Jogo</Label>
            <div className="grid gap-3 md:grid-cols-3">
              {GAME_MODES.map((mode) => (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => updateConfig({ gameMode: mode.value })}
                  className={`flex flex-col items-start gap-1 rounded-lg border-2 p-3 text-left transition-colors hover:border-primary ${
                    config.gameMode === mode.value ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <span className="font-semibold text-sm">{mode.label}</span>
                  <span className="text-xs text-muted-foreground">{mode.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div className="space-y-2">
            <Label htmlFor="difficulty">Dificuldade</Label>
            <Select value={config.difficulty} onValueChange={(value) => updateConfig({ difficulty: value })}>
              <SelectTrigger id="difficulty">
                <SelectValue placeholder="Selecione a dificuldade" />
              </SelectTrigger>
              <SelectContent>
                {DIFFICULTIES.map((diff) => (
                  <SelectItem key={diff.value} value={diff.value}>
                    {diff.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Max Players */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Número Máximo de Jogadores</Label>
              <span className="text-sm font-medium">{config.maxPlayers} jogadores</span>
            </div>
            <Slider
              value={[config.maxPlayers]}
              onValueChange={([value]) => updateConfig({ maxPlayers: value })}
              min={2}
              max={100}
              step={1}
            />
          </div>

          {/* World Seed */}
          <div className="space-y-2">
            <Label htmlFor="worldSeed">Seed do Mundo (opcional)</Label>
            <Input
              id="worldSeed"
              placeholder="Ex: 12345 ou deixe vazio para aleatório"
              value={config.worldSeed}
              onChange={(e) => updateConfig({ worldSeed: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">Use uma seed específica para gerar um mundo personalizado</p>
          </div>
        </CardContent>
      </Card>

      {/* Server Resources */}
      <Card>
        <CardHeader>
          <CardTitle>Recursos do Servidor</CardTitle>
          <CardDescription>Configure os recursos e plugins do servidor</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* RAM Allocation */}
          <div className="space-y-2">
            <Label>Memória RAM</Label>
            <div className="grid gap-3 md:grid-cols-4">
              {RAM_OPTIONS.map((ram) => (
                <button
                  key={ram.value}
                  type="button"
                  onClick={() => updateConfig({ ramGB: ram.value })}
                  className={`flex flex-col items-center gap-1 rounded-lg border-2 p-4 transition-colors hover:border-primary ${
                    config.ramGB === ram.value ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <span className="font-bold text-lg">{ram.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Storage */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Armazenamento</Label>
              <span className="text-sm font-medium">{config.storage} GB</span>
            </div>
            <Slider
              value={[config.storage]}
              onValueChange={([value]) => updateConfig({ storage: value })}
              min={5}
              max={50}
              step={5}
            />
            <p className="text-xs text-muted-foreground">Espaço para mundos, plugins e backups</p>
          </div>

          <Separator />

          {/* Popular Plugins */}
          <div className="space-y-3">
            <Label>Plugins Populares</Label>
            <div className="space-y-2">
              {POPULAR_PLUGINS.map((plugin) => (
                <div key={plugin.id} className="flex items-start space-x-3 rounded-lg border p-3">
                  <Checkbox
                    id={plugin.id}
                    checked={config.plugins.includes(plugin.id)}
                    onCheckedChange={() => togglePlugin(plugin.id)}
                  />
                  <div className="flex-1">
                    <label htmlFor={plugin.id} className="text-sm font-medium cursor-pointer">
                      {plugin.name}
                    </label>
                    <p className="text-xs text-muted-foreground">{plugin.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Whitelist */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Jogadores Autorizados</CardTitle>
          <CardDescription>Adicione nomes de jogadores que podem entrar no servidor</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="whitelist">Whitelist (um nome por linha)</Label>
            <textarea
              id="whitelist"
              className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Steve&#10;Alex&#10;Notch"
              value={config.whitelist}
              onChange={(e) => updateConfig({ whitelist: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">Deixe vazio para permitir qualquer jogador entrar</p>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Summary */}
      <Card className="border-primary/50 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Resumo da Configuração
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Configuration Summary */}
          <div className="rounded-lg border bg-background p-4 space-y-2">
            <p className="text-sm font-medium">Configuração Selecionada:</p>
            <p className="text-sm text-muted-foreground">
              Versão {config.version} — {config.maxPlayers} jogadores — {config.ramGB}GB RAM
              {config.plugins.length > 0 && ` — Plugins: ${config.plugins.length}`}
            </p>
          </div>

          {/* Performance Indicator */}
          <div className="flex items-center gap-2 rounded-lg border p-3">
            <span className="text-2xl">{performance.icon}</span>
            <div className="flex-1">
              <p className="text-sm font-medium">Desempenho Estimado</p>
              <p className={`text-sm ${performance.color}`}>{performance.label}</p>
            </div>
          </div>

          {/* Warning if needed */}
          {config.maxPlayers / config.ramGB > 10 && (
            <div className="flex items-start gap-2 rounded-lg border border-orange-200 bg-orange-50 p-3 text-orange-800">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p className="text-xs">
                Recomendamos aumentar a RAM para melhor desempenho com {config.maxPlayers} jogadores.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
