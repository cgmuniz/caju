# api_server.py
from flask import Flask, jsonify, request
from flask_cors import CORS
import docker
import threading
import os
import subprocess
import atexit
from upnpy.upnp import UPnP
from typing import Dict, Any

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
        upnp = UPnP()
        # Discover gateway devices (this can take a few seconds)
        upnp.discover(delay=10) 
        
        if not upnp.hosts:
            return False, "AVISO: Roteador compatível com UPnP não encontrado."

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
def _launch_container(template: Dict[str, Any], user_inputs: Dict[str, Any]):
    """Função que executa o comando Docker real para o serviço."""
    # (Implementation omitted for brevity, but this is where your Docker SDK logic goes)
    # ⚠️ IMPORTANT: It must return a status message (success/error)
    # The logic from your previous file goes here, but uses 'print' instead of 'self.app_ui.after(0, self.app_ui.log_message, ...)'
    
    # Example placeholder for Docker logic outcome:
    try:
        # Simulate getting host_port and container_name from user_inputs and template
        host_port = int(user_inputs.get("Porta Local (Host)"))
        container_name = user_inputs.get("Nome do Container")
        
        # --- Port Forwarding ---
        upnp_success, upnp_message = upnpy_port_forward(
            host_port=host_port,
            internal_port=25565, # Minecraft port
            description=f"Docker {container_name}"
        )

        # ... Docker run logic ...
        
        return {"status": "success", "message": f"Container started. UPnP: {upnp_message}"}
    except Exception as e:
        return {"status": "error", "message": f"FATAL ERROR: {e}"}


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

    # Run the Docker logic in a separate thread to prevent blocking the API
    thread = threading.Thread(target=_launch_container, args=(template, user_inputs))
    thread.start()
    
    return jsonify({"status": "pending", "message": "Container launch initiated in background."})

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