"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, Github, Gitlab as GitLab, Plus, Trash2, Eye, EyeOff } from "lucide-react"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"

interface DiscordConfigProps {
  config: {
    botName: string
    description: string
    mainFile: string
    startCommand: string
    runtime: string
    runtimeVersion: string
    sourceType: string
    sourceUrl: string
    envVars: Array<{ key: string; value: string; visible: boolean }>
    ramGB: number
    cpuCores: number
  }
  onChange: (config: any) => void
}

export function DiscordConfig({ config, onChange }: DiscordConfigProps) {
  const [showEnvValues, setShowEnvValues] = useState<{ [key: number]: boolean }>({})

  const updateConfig = (field: string, value: any) => {
    onChange({ ...config, [field]: value })
  }

  const addEnvVar = () => {
    const newEnvVars = [...config.envVars, { key: "", value: "", visible: false }]
    updateConfig("envVars", newEnvVars)
  }

  const removeEnvVar = (index: number) => {
    const newEnvVars = config.envVars.filter((_, i) => i !== index)
    updateConfig("envVars", newEnvVars)
  }

  const updateEnvVar = (index: number, field: "key" | "value", value: string) => {
    const newEnvVars = [...config.envVars]
    newEnvVars[index][field] = value
    updateConfig("envVars", newEnvVars)
  }

  const toggleEnvVisibility = (index: number) => {
    setShowEnvValues((prev) => ({ ...prev, [index]: !prev[index] }))
  }

  const runtimes = [
    { value: "nodejs", label: "Node.js", versions: ["20.x", "18.x", "16.x"] },
    { value: "python", label: "Python", versions: ["3.11", "3.10", "3.9"] },
    { value: "deno", label: "Deno", versions: ["1.x"] },
  ]

  const ramOptions = [
    { value: 1, label: "1 GB" },
    { value: 2, label: "2 GB" },
    { value: 4, label: "4 GB" },
    { value: 8, label: "8 GB" },
  ]

  const cpuOptions = [
    { value: 0.5, label: "0.5 vCPU" },
    { value: 1, label: "1 vCPU" },
    { value: 2, label: "2 vCPU" },
    { value: 4, label: "4 vCPU" },
  ]

  const selectedRuntime = runtimes.find((r) => r.value === config.runtime)

  return (
    <div className="space-y-6">
      {/* Seção 1: Informações Básicas */}
      <Card>
        <CardHeader>
          <CardTitle>Informações Básicas</CardTitle>
          <CardDescription>Configure os detalhes essenciais do seu bot Discord</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="botName">Nome da Instância *</Label>
              <Input
                id="botName"
                placeholder="MeuBotPrincipal"
                value={config.botName}
                onChange={(e) => updateConfig("botName", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mainFile">Arquivo Principal *</Label>
              <Input
                id="mainFile"
                placeholder="index.js, bot.py, main.py"
                value={config.mainFile}
                onChange={(e) => updateConfig("mainFile", e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              placeholder="Descreva o propósito do seu bot..."
              value={config.description}
              onChange={(e) => updateConfig("description", e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="runtime">Linguagem *</Label>
              <Select value={config.runtime} onValueChange={(value) => updateConfig("runtime", value)}>
                <SelectTrigger id="runtime">
                  <SelectValue placeholder="Selecione a linguagem" />
                </SelectTrigger>
                <SelectContent>
                  {runtimes.map((runtime) => (
                    <SelectItem key={runtime.value} value={runtime.value}>
                      {runtime.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="runtimeVersion">Versão *</Label>
              <Select
                value={config.runtimeVersion}
                onValueChange={(value) => updateConfig("runtimeVersion", value)}
                disabled={!config.runtime}
              >
                <SelectTrigger id="runtimeVersion">
                  <SelectValue placeholder="Selecione a versão" />
                </SelectTrigger>
                <SelectContent>
                  {selectedRuntime?.versions.map((version) => (
                    <SelectItem key={version} value={version}>
                      {version}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="startCommand">Comando de Inicialização *</Label>
            <Input
              id="startCommand"
              placeholder="node index.js, python main.py"
              value={config.startCommand}
              onChange={(e) => updateConfig("startCommand", e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">Comando usado para iniciar seu bot</p>
          </div>
        </CardContent>
      </Card>

      {/* Seção 2: Código-fonte */}
      <Card>
        <CardHeader>
          <CardTitle>Código-fonte</CardTitle>
          <CardDescription>Escolha como enviar o código do seu bot</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={config.sourceType} onValueChange={(value) => updateConfig("sourceType", value)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="upload">
                <Upload className="mr-2 h-4 w-4" />
                Upload
              </TabsTrigger>
              <TabsTrigger value="github">
                <Github className="mr-2 h-4 w-4" />
                GitHub
              </TabsTrigger>
              <TabsTrigger value="gitlab">
                <GitLab className="mr-2 h-4 w-4" />
                GitLab
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-4">
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8">
                <Upload className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="mb-2 text-sm font-medium">Arraste e solte seu arquivo .zip aqui</p>
                <p className="mb-4 text-xs text-muted-foreground">ou clique para selecionar</p>
                <Button variant="outline" size="sm">
                  Selecionar Arquivo
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Tamanho máximo: 100MB. Certifique-se de incluir todas as dependências necessárias.
              </p>
            </TabsContent>

            <TabsContent value="github" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="githubUrl">URL do Repositório GitHub</Label>
                <Input
                  id="githubUrl"
                  placeholder="https://github.com/usuario/repositorio"
                  value={config.sourceUrl}
                  onChange={(e) => updateConfig("sourceUrl", e.target.value)}
                />
              </div>
              <Button variant="outline" className="w-full bg-transparent">
                <Github className="mr-2 h-4 w-4" />
                Conectar com GitHub
              </Button>
              <p className="text-xs text-muted-foreground">
                Conecte sua conta GitHub para importar repositórios privados
              </p>
            </TabsContent>

            <TabsContent value="gitlab" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gitlabUrl">URL do Repositório GitLab</Label>
                <Input
                  id="gitlabUrl"
                  placeholder="https://gitlab.com/usuario/repositorio"
                  value={config.sourceUrl}
                  onChange={(e) => updateConfig("sourceUrl", e.target.value)}
                />
              </div>
              <Button variant="outline" className="w-full bg-transparent">
                <GitLab className="mr-2 h-4 w-4" />
                Conectar com GitLab
              </Button>
              <p className="text-xs text-muted-foreground">
                Conecte sua conta GitLab para importar repositórios privados
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Seção 3: Variáveis de Ambiente */}
      <Card>
        <CardHeader>
          <CardTitle>Variáveis de Ambiente</CardTitle>
          <CardDescription>Configure variáveis de ambiente seguras (criptografadas)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {config.envVars.map((envVar, index) => (
            <div key={index} className="flex gap-2">
              <div className="flex-1 space-y-2">
                <Input
                  placeholder="DISCORD_TOKEN"
                  value={envVar.key}
                  onChange={(e) => updateEnvVar(index, "key", e.target.value)}
                />
              </div>
              <div className="flex-1 space-y-2">
                <div className="relative">
                  <Input
                    type={showEnvValues[index] ? "text" : "password"}
                    placeholder="valor_secreto"
                    value={envVar.value}
                    onChange={(e) => updateEnvVar(index, "value", e.target.value)}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => toggleEnvVisibility(index)}
                  >
                    {showEnvValues[index] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => removeEnvVar(index)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <Button type="button" variant="outline" onClick={addEnvVar} className="w-full bg-transparent">
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Variável
          </Button>

          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm font-medium">Variáveis comuns:</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="secondary">DISCORD_TOKEN</Badge>
              <Badge variant="secondary">DATABASE_URL</Badge>
              <Badge variant="secondary">API_KEY</Badge>
              <Badge variant="secondary">CLIENT_ID</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seção 4: Recursos de Execução */}
      <Card>
        <CardHeader>
          <CardTitle>Recursos de Execução</CardTitle>
          <CardDescription>Aloque recursos computacionais para seu bot</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Label>Memória RAM</Label>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {ramOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateConfig("ramGB", option.value)}
                  className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors hover:border-primary ${
                    config.ramGB === option.value ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <span className="text-2xl font-bold">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <Label>CPU Virtual</Label>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {cpuOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateConfig("cpuCores", option.value)}
                  className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors hover:border-primary ${
                    config.cpuCores === option.value ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <span className="text-2xl font-bold">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Configuração Selecionada */}
          <div className="rounded-lg border-2 border-primary bg-primary/5 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Configuração Selecionada</h3>
                <p className="text-sm text-muted-foreground">
                  {config.ramGB}GB RAM + {config.cpuCores} vCPU
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
