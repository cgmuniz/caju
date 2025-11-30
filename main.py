import miniupnpc
import customtkinter as ctk
import docker
import threading
import os

SERVICE_TEMPLATES = {
    "Minecraft Server": {
        # Campos de entrada que a UI usará
        "args": {
            "Nome do Container": "meu-minecraft",
            "Porta Local (Host)": 25565, # Mapeia para ${PORT}
            "Memória RAM (ex: 2G)": "2G", # Mapeia para ${RAM}
        },
        "image": "itzg/minecraft-server",
        # Configurações reais do Docker, usando chaves ${...}
        "ports": {
            "${PORT}": "25565",
        },
        "environment": {
            "EULA": "TRUE",
            "MEMORY": "${RAM}",
        },
        "volumes": {
            "${VOLUME}": "/data",
        },
    },
}

class DockerLauncher:
    """Classe para encapsular a lógica de interação com o Docker."""

    def __init__(self, app_ui):
        self.app_ui = app_ui
        self.client = None # Inicializa o cliente como None

    def connect_docker(self):
        """Tenta a conexão com o Docker Daemon."""
        try:
            self.client = docker.from_env()
            # Tenta um comando simples para garantir que a conexão funciona
            self.client.version()
            self.app_ui.after(0, self.app_ui.log_message, "Conectado ao Docker Daemon com sucesso.", "green")
        except Exception as e:
            self.client = None
            self.app_ui.after(0, self.app_ui.log_message, f"ERRO: Não foi possível conectar ao Docker. O Docker Daemon pode estar desligado ou as permissões estão incorretas. Detalhes: {e}", "red")

    def run_service(self, service_name: str, template: Dict[str, Any], user_inputs: Dict[str, Any]):
        """Inicia a execução do container em uma thread."""

        if not self.client:
            self.app_ui.after(0, self.app_ui.log_message, "Docker não está conectado. Abortando 'Launch'.", "red")
            return

        thread = threading.Thread(target=self._launch_container,
                                  args=(service_name, template, user_inputs))
        thread.start()

    def _launch_container(self, service_name, template, user_inputs):
        """Função que executa o comando Docker real para o Minecraft."""

        self.app_ui.after(0, self.app_ui.log_message, f"Preparando para iniciar '{service_name}'...", "white")

        container_name = user_inputs.get("Nome do Container")
        container_volume = os.path.abspath(f'./{container_name}')
        image_name = template["image"]

        placeholder_map = {
            "${PORT}": user_inputs.get("Porta Local (Host)"),
            "${RAM}": user_inputs.get("Memória RAM (ex: 2G)"),
            "${VOLUME}": container_volume, # O valor do volume local será substituído
        }

        # 1. Configurar Portas (ports)
        # Formato esperado pelo SDK: {'<porta_interna>/tcp': <porta_host>}
        ports_config = {}
        for placeholder_port, internal_port in template["ports"].items():
            # A porta interna (Minecraft 25565) não muda
            internal_port_key = f'{internal_port}/tcp'

            # A porta externa (host) é obtida do placeholder_map (ex: ${PORT} -> 25565)
            host_port = placeholder_map.get(placeholder_port, None)

            if host_port:
                try:
                    ports_config[internal_port_key] = int(host_port)
                    self.app_ui.after(0, self.app_ui.log_message, f"Mapeamento: {internal_port} (Container) -> {host_port} (Host)", "white")
                except ValueError:
                    self.app_ui.after(0, self.app_ui.log_message, f"ERRO: Porta '{host_port}' inválida.", "red")
                    return # Aborta
            else:
                 self.app_ui.after(0, self.app_ui.log_message, f"AVISO: Placeholder de porta {placeholder_port} não mapeado.", "orange")


        # 2. Configurar Variáveis de Ambiente (environment)
        # Formato esperado pelo SDK: {'KEY': 'VALUE'}
        env_config = {}
        for key, value in template["environment"].items():
            # Verifica se o valor é um placeholder e substitui
            if value.startswith("${") and value.endswith("}"):
                env_config[key] = placeholder_map.get(value, value)
            else:
                env_config[key] = value

            self.app_ui.after(0, self.app_ui.log_message, f"ENV: {key}={env_config[key]}", "blue")


        # 3. Configurar Volumes (volumes)
        # Formato esperado pelo SDK: {'/caminho/host': {'bind': '/caminho/container', 'mode': 'rw'}}
        volumes_config = {}
        for host_path_placeholder, container_path in template["volumes"].items():
            # O host_path_placeholder é o "./data", que pegamos do placeholder_map
            host_path_real = placeholder_map.get(host_path_placeholder, None)

            if host_path_real:
                volumes_config[host_path_real] = {'bind': container_path, 'mode': 'rw'}
                self.app_ui.after(0, self.app_ui.log_message, f"Volume: {host_path_real} (Host) -> {container_path} (Container)", "blue")
            else:
                self.app_ui.after(0, self.app_ui.log_message, "AVISO: Caminho do volume local não fornecido.", "orange")


        # --- Execução do Docker ---
        try:
            # Lógica para parar e remover container existente (boa prática)
            try:
                container_to_remove = self.client.containers.get(container_name)
                self.app_ui.after(0, self.app_ui.log_message, f"Parando e removendo container existente: {container_name}", "orange")
                container_to_remove.stop(timeout=5)
                container_to_remove.remove()
            except docker.errors.NotFound:
                pass

            # Executa o Container com as configurações preparadas
            container = self.client.containers.run(
                image_name,
                detach=True,
                name=container_name,
                ports=ports_config,
                environment=env_config,
                volumes=volumes_config,
                restart_policy={"Name": "unless-stopped"} # Política de reinício
            )
            self.app_ui.after(0, self.app_ui.log_message, f"SUCESSO: Container '{container_name}' iniciado.", "green")
            self.app_ui.after(0, self.app_ui.log_message, f"Servidor Minecraft acessível em: localhost:{ports_config.get('25565/tcp')}", "green")

        except docker.errors.ImageNotFound:
            # Lógica de Pull da Imagem (mantida da versão anterior)
            self.app_ui.after(0, self.app_ui.log_message, f"ERRO: Imagem Docker '{image_name}' não encontrada. Tentando baixar...", "red")
            try:
                 self.client.images.pull(image_name)
                 self.app_ui.after(0, self.app_ui.log_message, f"SUCESSO: Imagem baixada. Tente o 'Launch' novamente.", "green")
            except Exception as e:
                self.app_ui.after(0, self.app_ui.log_message, f"ERRO ao baixar imagem. {e}", "red")

        except Exception as e:
            self.app_ui.after(0, self.app_ui.log_message, f"ERRO FATAL ao iniciar o container: {e}", "red")

class App(ctk.CTk):

    def __init__(self):
        super().__init__()

        # Configuração da Janela
        self.title("Docker Service Launcher")
        self.geometry("800x600")
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(0, weight=1)

        # Inicializa o Docker Launcher
        self.docker_launcher = DockerLauncher(self)
        self.current_inputs = {} # Dicionário para armazenar os campos de entrada
        self.current_service_name = ""
        self.current_template = {}

        # Cria os Frames de navegação
        self.list_frame = self.create_list_services_frame()
        self.form_frame = self.create_service_form_frame()

        # Frame para exibir logs e mensagens
        self.log_frame = self.create_log_frame()
        self.log_frame.grid(row=1, column=0, sticky="nsew", padx=20, pady=(0, 20))
        self.grid_rowconfigure(1, weight=0) # Log frame não cresce muito

        self.show_frame(self.list_frame)
        self.docker_launcher.connect_docker()

    def show_frame(self, frame):
        """Alterna a visualização entre os frames."""
        # Esconde todos os frames
        for f in [self.list_frame, self.form_frame]:
            f.grid_forget()

        # Mostra o frame desejado
        frame.grid(row=0, column=0, sticky="nsew", padx=20, pady=20)
        self.grid_rowconfigure(0, weight=1) # O frame principal cresce


    ## --- Estrutura da Tela de LISTA ---
    def create_list_services_frame(self):
        """Cria o frame inicial com a lista de serviços."""
        frame = ctk.CTkFrame(self)

        ctk.CTkLabel(frame, text="✅ Selecione um Serviço",
                    font=ctk.CTkFont(size=24, weight="bold")).pack(pady=20, padx=20)

        # Adiciona um botão para cada serviço no dicionário SERVICE_TEMPLATES
        for service_name in SERVICE_TEMPLATES.keys():
            button = ctk.CTkButton(frame, text=service_name,
                                command=lambda name=service_name: self.show_service_form(name))
            button.pack(pady=10, padx=50, fill="x")

        return frame


    ## --- Estrutura da Tela de FORMULÁRIO ---
    def create_service_form_frame(self):
        """Cria o frame de formulário (escondido inicialmente)."""
        frame = ctk.CTkScrollableFrame(self) # Usar ScrollableFrame se houver muitos campos

        # Título do Formulário (será atualizado)
        self.form_title = ctk.CTkLabel(frame, text="",
                                    font=ctk.CTkFont(size=24, weight="bold"))
        self.form_title.pack(pady=(20, 10), padx=20)

        # Frame para os Inputs (onde os campos serão inseridos dinamicamente)
        self.input_container = ctk.CTkFrame(frame, fg_color="transparent")
        self.input_container.pack(fill="x", padx=50, pady=10)

        # Separador
        ctk.CTkFrame(frame, height=2, fg_color="gray").pack(fill="x", padx=50, pady=20)

        # Botões de Ação
        back_button = ctk.CTkButton(frame, text="< Voltar", width=150,
                                    command=lambda: self.show_frame(self.list_frame))
        back_button.pack(side="left", padx=(50, 10), pady=20)

        self.launch_button = ctk.CTkButton(frame, text="🚀 Launch", width=150,
                                        command=self.handle_launch_click,
                                        fg_color="green", hover_color="#006400")
        self.launch_button.pack(side="right", padx=(10, 50), pady=20)

        return frame


    def show_service_form(self, service_name: str):
        """Popula o formulário com os argumentos do serviço escolhido."""

        self.current_service_name = service_name
        self.current_template = SERVICE_TEMPLATES[service_name]
        self.current_inputs.clear()

        self.form_title.configure(text=service_name)

        # Limpa os widgets antigos do input_container
        for widget in self.input_container.winfo_children():
            widget.destroy()

        # Adiciona novos widgets baseados no template
        for i, (arg_name, default_value) in enumerate(self.current_template["args"].items()):
            label = ctk.CTkLabel(self.input_container, text=f"{arg_name}:")
            label.grid(row=i, column=0, sticky="w", padx=10, pady=5)

            entry = ctk.CTkEntry(self.input_container, width=300)
            entry.insert(0, str(default_value)) # Seta o valor padrão
            entry.grid(row=i, column=1, sticky="ew", padx=10, pady=5)

            self.current_inputs[arg_name] = entry # Armazena a referência do campo

        # Garante que o container de inputs se estique
        self.input_container.grid_columnconfigure(1, weight=1)

        self.show_frame(self.form_frame)
        self.log_message(f"Pronto para configurar: {service_name}", "blue")


    def handle_launch_click(self):
        """Ação do botão 'Launch': coleta os dados e chama o Docker."""

        user_data = {}
        valid = True

        # 1. Coletar e Validar Dados
        for arg_name, entry_widget in self.current_inputs.items():
            value = entry_widget.get().strip()

            # Validação simples de Porta (exige número)
            if "Porta Local" in arg_name and value:
                try:
                    int(value)
                except ValueError:
                    self.log_message(f"ERRO: A porta deve ser um número inteiro em '{arg_name}'.", "red")
                    valid = False

            # Validação simples de campo obrigatório (Nome do Container)
            if "Nome do Container" in arg_name and not value:
                self.log_message(f"ERRO: O campo '{arg_name}' é obrigatório.", "red")
                valid = False

            user_data[arg_name] = value

        if not valid:
            return

        self.log_message("Dados válidos. Executando 'Docker Launcher'...", "green")
        self.launch_button.configure(state="disabled", text="Lançando...")

        # 2. Chamar a lógica do Docker
        self.docker_launcher.run_service(
            service_name=self.current_service_name,
            template=self.current_template,
            user_inputs=user_data
        )

        # Habilita o botão após um pequeno delay ou na thread do Docker (melhor)
        # Neste exemplo, vamos reabilitar no fim da função do Docker.
        self.after(3000, lambda: self.launch_button.configure(state="normal", text="Launch"))


    ## --- Log/Mensagens ---
    def create_log_frame(self):
        """Cria a caixa de texto para exibir as mensagens de log."""
        frame = ctk.CTkFrame(self)

        ctk.CTkLabel(frame, text="Log de Atividades:",
                    font=ctk.CTkFont(size=16, weight="bold")).pack(padx=10, pady=(10, 5), anchor="w")

        self.log_text = ctk.CTkTextbox(frame, height=100, wrap="word", state="disabled")
        self.log_text.pack(fill="both", expand=True, padx=10, pady=(0, 10))

        return frame

    def log_message(self, message: str, color: str = "white"):
        """Adiciona uma mensagem ao log e rola para baixo."""
        self.log_text.configure(state="normal")

        # Cria uma tag de cor se não existir
        if color not in self.log_text.tag_names():
            self.log_text.tag_config(color, foreground=color)

        full_message = f"[{ctk.get_appearance_mode().upper()}] {message}\n"
        self.log_text.insert("end", full_message, color)
        self.log_text.see("end") # Rola para o final

        self.log_text.configure(state="disabled")

if __name__ == "__main__":
    app = App()
    app.mainloop()

#upnp = miniupnpc.UPnP()
#
#upnp.discoverdelay = 10
#upnp.discover()
#
#upnp.selectigd()
#
#port = 43210
#
## addportmapping(external-port, protocol, internal-host, internal-port, description, remote-host)
#upnp.addportmapping(port, 'TCP', upnp.lanaddr, port, 'testing', '')
#
