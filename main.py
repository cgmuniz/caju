from flask import Flask, jsonify, request
from flask_cors import CORS
import docker
import threading
import os
import subprocess
import atexit
from upnpy.upnp import UPnP
from typing import Dict, Any
from collections import deque
import uuid

# --- CONFIGURATION ---
PYTHON_API_PORT = 5000
NEXTJS_PORT = 8000
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
NEXTJS_ROOT = os.path.join(BASE_DIR, "nextproject")
# Path to the node executable packaged with your app
NODE_PATH = os.path.join(BASE_DIR, "node_bin", "node.exe") 
NEXT_START_SCRIPT = os.path.join(BASE_DIR, "nextproject", "node_modules", "next", "dist", "bin", "next")
# ---------------------

app = Flask(__name__)
# Crucial: Enable CORS to allow Next.js (port 8000) to talk to Flask (port 5000)
CORS(app) 

# Global state
docker_client = None
nextjs_process = None
service_templates = {
    # Keep your SERVICE_TEMPLATES here for reference, or load from a config file
    "Minecraft Server": {
        "args": {
            "Nome do Container": "meu-minecraft",
            "Porta Local (Host)": 25565,
            "Memória RAM (ex: 2G)": "2G",
        },
        "image": "itzg/minecraft-server",
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

LAUNCH_RESULTS = {}

def connect_docker():
    """Tenta a conexão com o Docker Daemon."""
    global docker_client
    try:
        docker_client = docker.from_env()
        docker_client.version()
        print("INFO: Conectado ao Docker Daemon com sucesso.")
        return True
    except Exception as e:
        docker_client = None
        print(f"ERROR: Não foi possível conectar ao Docker. Detalhes: {e}")
        return False

def upnpy_port_forward(host_port: int, internal_port: int, description: str):
    """Tenta abrir a porta no roteador usando UPnPy."""
    print(f"INFO: Tentando encaminhar porta {host_port} via UPnPy...")
    try:
        upnp = UPnP.UPnP()
        # Discover gateway devices (this can take a few seconds)
        upnp.discover(delay=20) 
        
        if not hasattr(upnp, 'hosts') or not upnp.hosts:
             # Retorna AVISO se nenhum roteador for encontrado
             return False, "AVISO: Roteador compatível com UPnP não encontrado ou não respondeu."

        # Assumindo o primeiro dispositivo encontrado
        gateway = upnp.hosts[0].service['WANIPConnection']

        # Tenta adicionar o mapeamento (TCP)
        success = gateway.AddPortMapping(
            NewRemoteHost='0.0.0.0', # Empty string for any source IP
            NewExternalPort=host_port,
            NewProtocol='TCP',
            NewInternalPort=internal_port,
            NewInternalClient=gateway.GetExternalIPAddress()['NewExternalIPAddress'], # Use External IP as internal IP is complex in this context, but safer to use 0.0.0.0 if not strictly needed.
            NewEnabled=1,
            NewPortMappingDescription=description,
            NewLeaseDuration=0 # Permanent
        )
        
        if success:
            return True, f"SUCESSO: Porta {host_port} encaminhada via UPnPy."
        else:
            return False, f"AVISO: Falha ao adicionar mapeamento UPnPy para porta {host_port}."

    except Exception as e:
        return False, f"ERRO UPnPy: Falha na comunicação: {e}"

# The core Docker launching logic, now a regular Python function
def _launch_container(job_id: str, template: Dict[str, Any], user_inputs: Dict[str, Any]):
    """
    Função que executa o comando Docker real para o serviço.
    
    Recebe template e inputs e retorna um dicionário de status e mensagem.
    """
    
    global docker_client
    
    LAUNCH_RESULTS[job_id] = {"status": "running", "message": "Docker launch in progress..."}
    
    # 1. Preparação e Mapeamento de Variáveis
    try:
        container_name = user_inputs.get("Nome do Container")
        image_name = template["image"]
        # Usa o caminho relativo ao BASE_DIR para garantir que o volume seja criado corretamente
        container_volume = os.path.abspath(os.path.join(os.path.dirname(__file__), f'./{container_name}_data')) 
        
        # O valor da porta host (str) é obtido dos inputs do usuário
        host_port_str = user_inputs.get("Porta Local (Host)")
        host_port = int(host_port_str)
        
        placeholder_map = {
            "${PORT}": host_port_str,
            "${RAM}": user_inputs.get("Memória RAM (ex: 2G)"),
            "${VOLUME}": container_volume,
        }

        # 2. Configurar Portas (ports)
        ports_config = {}
        for placeholder_port, internal_port in template["ports"].items():
            internal_port_key = f'{internal_port}/tcp'
            ports_config[internal_port_key] = host_port

        # 3. Configurar Variáveis de Ambiente (environment)
        env_config = {}
        for key, value in template["environment"].items():
            if value.startswith("${") and value.endswith("}"):
                env_config[key] = placeholder_map.get(value, value)
            else:
                env_config[key] = value

        # 4. Configurar Volumes (volumes)
        volumes_config = {}
        for host_path_placeholder, container_path in template["volumes"].items():
            host_path_real = placeholder_map.get(host_path_placeholder, None)
            
            if host_path_real:
                # Cria a pasta do volume se ela não existir
                if not os.path.exists(host_path_real):
                    os.makedirs(host_path_real)
                    print(f"INFO: Criando diretório de volume: {host_path_real}")
                    
                volumes_config[host_path_real] = {'bind': container_path, 'mode': 'rw'}

        # --- Execução do Docker ---
        
        # 5. Lógica para Parar e Remover container existente
        try:
            container_to_remove = docker_client.containers.get(container_name)
            print(f"AVISO: Parando e removendo container {container_name} existente")
            container_to_remove.stop(timeout=5)
            container_to_remove.remove(force=True) # Use force=True para garantir a remoção
            print(f"AVISO: Container {container_name} removido com sucesso.")
            
        except docker.errors.NotFound:
            pass
        except Exception as e:
            # Captura qualquer outro erro na limpeza, incluindo o "Resource ID was not provided"
            print(f"AVISO: Não foi possível limpar o container antigo (erro ignorado): {e}")

        # 6. Port Forwarding (UPnPy)
        upnp_success, upnp_message = upnpy_port_forward(
            host_port=host_port,
            internal_port=25565, # A porta interna do container (Minecraft)
            description=f"Docker {container_name}"
        )
        print(f"INFO UPnP: {upnp_message}")

        # 7. Executa o Container
        container = docker_client.containers.run(
            image_name,
            detach=True,
            name=container_name,
            ports=ports_config,
            environment=env_config,
            volumes=volumes_config,
            restart_policy={"Name": "unless-stopped"}
        )
        
        # 8. Store Final Success Result
        result_payload = {
            "status": "success", 
            "message": f"Container '{container_name}' iniciado com sucesso. Porta Host: {host_port}. UPnP: {upnp_message}",
            "details": {
                "container_id": container.id,
                "host_port": host_port,
                "upnp_status": "Success" if upnp_success else "Failure"
            }
        }
        LAUNCH_RESULTS[job_id] = result_payload
        return 

    except docker.errors.ImageNotFound:
        # Store Error Result
        LAUNCH_RESULTS[job_id] = {"status": "error", "message": f"Imagem Docker '{image_name}' não encontrada."}
        return 
        
    except Exception as e:
        # Store Fatal Error Result
        LAUNCH_RESULTS[job_id] = {"status": "error", "message": f"ERRO FATAL ao iniciar o container: {str(e)}"}
        return

# --- API ENDPOINTS ---

@app.route('/api/status', methods=['GET'])
def get_status():
    """Retorna o status de conexão Docker e templates disponíveis."""
    docker_status = "Connected" if docker_client else "Disconnected"
    return jsonify({
        "docker_status": docker_status,
        "templates": service_templates
    })

@app.route('/api/launch', methods=['POST'])
def launch_container_endpoint():
    """Endpoint para iniciar um container."""
    data = request.json
    service_name = data.get('service_name')
    user_inputs = data.get('user_inputs')
    
    if not docker_client:
        return jsonify({"status": "error", "message": "Docker Daemon not connected."}), 400
        
    template = service_templates.get(service_name)
    if not template:
        return jsonify({"status": "error", "message": f"Service '{service_name}' not found."}), 404

    job_id = str(uuid.uuid4())
    
    LAUNCH_RESULTS[job_id] = {"status": "initiated", "message": "Job received and queued."}

    # Run the Docker logic in a separate thread, passing the job_id
    thread = threading.Thread(target=_launch_container, args=(job_id, template, user_inputs))
    thread.start()
    
    # Return the job ID immediately
    return jsonify({
        "status": "initiated", 
        "message": "Launch job started in background.", 
        "job_id": job_id
    })

@app.route('/api/job/status/<job_id>', methods=['GET'])
def get_job_status(job_id):
    """Endpoint para verificar o status de um Job ID de lançamento de container."""
    
    result = LAUNCH_RESULTS.get(job_id)
    
    if not result:
        return jsonify({"status": "error", "message": f"Job ID {job_id} not found."}), 404
    
    # If status is "success" or "error", the job is complete.
    if result["status"] in ["success", "error"]:
        LAUNCH_RESULTS.pop(job_id, None) 
        return jsonify(result)
        
    # If status is still "running" or "initiated"
    return jsonify({"status": "running", "message": result["message"]})

@app.route('/api/deployments', methods=['GET'])
def list_deployments():
    """Retorna uma lista de containers em execução formatada para o frontend."""
    global docker_client
    
    if not docker_client:
        return jsonify({"status": "error", "message": "Docker Daemon not connected. Cannot list containers.", "deployments": []}), 500

    deployments_list = []
    
    try:
        containers = docker_client.containers.list(all=True)
        
        for idx, container in enumerate(containers):
            # Tenta inferir o tipo ('minecraft', 'discord-bot') pelo nome da imagem ou rótulos
            
            # Exemplo de inferência de tipo (pode ser mais sofisticado)
            image_name = container.image.tags[0] if container.image.tags else container.image.id
            container_type = "mini-app"
            if "minecraft" in image_name:
                container_type = "minecraft"
            elif "discord" in image_name or "node" in image_name:
                container_type = "discord-bot"

            # Tenta encontrar a porta Host (útil para o frontend)
            host_port = "N/A"
            if container.ports:
                # Ports é um dicionário. Ex: {'25565/tcp': [{'HostIp': '0.0.0.0', 'HostPort': '25565'}]}
                for internal_port_key, mappings in container.ports.items():
                    if mappings:
                        host_port = mappings[0]['HostPort']
                        break
                        
            # Mapeamento para o formato do estado do Next.js
            deployments_list.append({
                "id": container.short_id,
                "name": container.name,
                "type": container_type, # Tipo inferido
                "status": container.status, # 'running', 'exited', etc.
                "created_at": container.attrs['Created'], # Data de criação
                "memory_mb": container.attrs['Config'].get('Memory') or 0, # Memória alocada (pode ser 0 se não limitado)
                "cpu_cores": container.attrs['Config'].get('NanoCpus') or 0, # Cores (também pode ser 0)
                "host_port": host_port, # Porta para acesso
            })

    except Exception as e:
        print(f"ERRO ao listar containers Docker: {e}")
        return jsonify({"status": "error", "message": f"Erro interno ao consultar Docker: {e}", "deployments": []}), 500
        
    return jsonify({"status": "success", "deployments": deployments_list})

@app.route('/api/deployments/<id>/metrics', methods=['GET'])
def get_deployment_metrics(id):
    global docker_client
    
    try:
        container = docker_client.containers.get(id)
        
        stats_result = container.stats(stream=False)
        
        try:
            stats = next(stats_result)
        except TypeError:
            stats = stats_result
            
        if not isinstance(stats, dict):
             raise TypeError(f"A API de stats retornou tipo inválido: {type(stats)}")
        
        # --- Cálculo do Uso de CPU ---
        cpu_percent = 0.0
        
        cpu_stats = stats.get('cpu_stats', {})
        precpu_stats = stats.get('precpu_stats', {})
        
        if cpu_stats and precpu_stats:
            # Uso total de CPU pelo container
            container_cpu_usage = cpu_stats.get('cpu_usage', {}).get('total_usage', 0)
            pre_container_cpu_usage = precpu_stats.get('cpu_usage', {}).get('total_usage', 0)
            
            # Uso total de CPU do sistema host
            system_cpu_usage = cpu_stats.get('system_cpu_usage', 0)
            pre_system_cpu_usage = precpu_stats.get('system_cpu_usage', 0)
            
            # Número de CPUs disponíveis online
            number_cpus = cpu_stats.get('online_cpus', 1) 
            
            # Calculando deltas
            cpu_delta = container_cpu_usage - pre_container_cpu_usage
            system_delta = system_cpu_usage - pre_system_cpu_usage
            
            if system_delta > 0:
                # Fórmula de cálculo de CPU em %
                # NOTA: O cálculo deve ser float
                cpu_percent = (cpu_delta / system_delta) * number_cpus * 100.0
        
        # --- Cálculo do Uso de RAM ---
        mem_stats = stats.get('memory_stats', {})
        mem_usage_bytes = mem_stats.get('usage', 0)
        
        # O limite deve ser obtido de forma segura (0 se não for encontrado)
        mem_limit_bytes = mem_stats.get('limit', 0) 
        
        ram_percent = 0.0
        if mem_limit_bytes > 0:
            ram_percent = (mem_usage_bytes / mem_limit_bytes) * 100.0
            
        return jsonify({
            "status": "success",
            "metrics": {
                "cpu_usage": cpu_percent,
                "ram_usage": ram_percent,
                "ram_used_mb": mem_usage_bytes / (1024 * 1024),
                "timestamp": stats.get('read') 
            }
        })
        
    except docker.errors.NotFound:
        return jsonify({"status": "error", "message": "Container não encontrado para métricas."}), 404
    except StopIteration:
        # Se o container não está rodando, não há estatísticas.
        return jsonify({"status": "error", "message": "Container não está ativo ou não produz estatísticas."}), 400
    except Exception as e:
        print(f"ERRO FATAL NA API DE MÉTRICAS ({id}): {str(e)}")
        # Retorna 500 para o frontend
        return jsonify({"status": "error", "message": f"Erro fatal no servidor ao buscar métricas: {str(e)}"}), 500

@app.route('/api/deployments/<id>/stop', methods=['POST'])
def stop_deployment(id):
    try:
        container = docker_client.containers.get(id)
        container.stop(timeout=5)
        return jsonify({"status": "success", "message": f"Container {id} parado."})
    except docker.errors.NotFound:
        return jsonify({"status": "error", "message": "Container não encontrado."}), 404
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/deployments/<id>/start', methods=['POST'])
def start_deployment(id):
    try:
        container = docker_client.containers.get(id)
        container.start()
        return jsonify({"status": "success", "message": f"Container {id} iniciado."})
    except docker.errors.NotFound:
        return jsonify({"status": "error", "message": "Container não encontrado."}), 404
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/deployments/<id>', methods=['DELETE'])
def delete_deployment(id):
    try:
        container = docker_client.containers.get(id)
        
        # 💡 NOVO: Garante que o container esteja parado antes de tentar remover.
        if container.status == 'running':
            container.stop(timeout=5)
            
        container.remove(force=True)
        
        return jsonify({"status": "success", "message": f"Container {id} excluído."})
    except docker.errors.NotFound:
        return jsonify({"status": "error", "message": "Container não encontrado."}), 404
    except Exception as e:
        # 💡 Dica: Imprima o erro para o terminal para depuração
        print(f"ERRO DELETANDO CONTAINER {id}: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

# --- Next.js Management Functions (Moved from App Class) ---

def start_nextjs_server():
    """Inicia o servidor Next.js como um subprocesso."""
    global nextjs_process
    
    if not os.path.exists(NODE_PATH) or not os.path.exists(NEXT_START_SCRIPT):
        print(f"ERRO: Binário Node.js ou script Next não encontrado! Verifique os caminhos:")
        print(f"Esperado NODE_PATH: {NODE_PATH}") # Print paths for debugging
        print(f"Esperado NEXT_SCRIPT: {NEXT_START_SCRIPT}")
        return

    print(f"INFO: Iniciando servidor Next.js em http://localhost:{NEXTJS_PORT}...")

    try:
        # Command: node [path/to/next-start-script] start -H 127.0.0.1 --port [PORT]
        nextjs_process = subprocess.Popen(
            [NODE_PATH, NEXT_START_SCRIPT, "start", "-H", "127.0.0.1", "--port", str(NEXTJS_PORT)],
            cwd=NEXTJS_ROOT,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == 'nt' else 0
        )
        print("INFO: Servidor Next.js iniciado com sucesso em segundo plano.")
        
        # 💡 Open the browser automatically 
        import webbrowser
        webbrowser.open_new_tab(f"http://localhost:{NEXTJS_PORT}")

    except Exception as e:
        print(f"ERRO ao iniciar Next.js: {e}")

def stop_nextjs_server():
    """Para o servidor Next.js quando o aplicativo Python é fechado."""
    global nextjs_process
    if nextjs_process:
        print("INFO: Encerrando servidor Next.js...")
        try:
            nextjs_process.terminate()
            nextjs_process.wait(timeout=5)
            print("INFO: Servidor Next.js encerrado.")
        except:
            nextjs_process.kill()
            print("INFO: Servidor Next.js encerrado (kill forçado).")

if __name__ == '__main__':
    # 1. Register cleanup function
    atexit.register(stop_nextjs_server)
    
    # 2. Connect to Docker
    connect_docker()
    
    # 3. Start the Next.js frontend (this opens the browser)
    start_nextjs_server()
    
    # 4. Start the Python API (This must run last and blocks the thread, serving the API)
    print(f"INFO: Servidor Python API rodando em http://localhost:{PYTHON_API_PORT}")
    app.run(port=PYTHON_API_PORT)