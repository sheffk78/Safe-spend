"""
Safe-Spend Backend - FastAPI Proxy to Node.js

This creates a FastAPI ASGI app that proxies all requests to a Node.js backend
running on an internal port.
"""
import os
import subprocess
import threading
import time
import atexit
import httpx
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

# Internal Node.js port (uvicorn uses 8001 externally)
NODE_INTERNAL_PORT = 8002

# Start Node.js server on internal port
def start_node_server():
    env = os.environ.copy()
    env['PORT'] = str(NODE_INTERNAL_PORT)
    
    process = subprocess.Popen(
        ['node', 'src/server.js'],
        cwd='/app/backend',
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT
    )
    
    # Log output in background
    def log_output():
        for line in iter(process.stdout.readline, b''):
            print(f"[Node] {line.decode().rstrip()}", flush=True)
    
    thread = threading.Thread(target=log_output, daemon=True)
    thread.start()
    
    # Cleanup on exit
    def cleanup():
        process.terminate()
        process.wait()
    
    atexit.register(cleanup)
    
    return process

# Start Node.js
print(f"Starting Node.js backend on internal port {NODE_INTERNAL_PORT}...", flush=True)
node_process = start_node_server()
time.sleep(2)  # Give Node time to start

# Create FastAPI app
app = FastAPI(title="Safe-Spend API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# HTTP client for proxying
http_client = httpx.AsyncClient(timeout=30.0)

@app.on_event("shutdown")
async def shutdown():
    await http_client.aclose()
    node_process.terminate()
    node_process.wait()

# Proxy all /api requests to Node.js
@app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"])
async def proxy_api(request: Request, path: str):
    try:
        # Build target URL
        target_url = f"http://127.0.0.1:{NODE_INTERNAL_PORT}/api/{path}"
        if request.query_params:
            target_url += f"?{request.query_params}"
        
        # Get request body
        body = await request.body()
        
        # Forward headers (excluding hop-by-hop headers)
        headers = {}
        for key, value in request.headers.items():
            if key.lower() not in ['host', 'content-length', 'transfer-encoding', 'connection']:
                headers[key] = value
        
        # Make request to Node.js
        response = await http_client.request(
            method=request.method,
            url=target_url,
            content=body,
            headers=headers,
        )
        
        # Return response
        return Response(
            content=response.content,
            status_code=response.status_code,
            headers={k: v for k, v in response.headers.items() 
                    if k.lower() not in ['content-length', 'content-encoding', 'transfer-encoding', 'connection']},
            media_type=response.headers.get('content-type', 'application/json')
        )
    
    except httpx.ConnectError:
        return Response(
            content='{"error": "Backend service unavailable"}',
            status_code=503,
            media_type="application/json"
        )
    except Exception as e:
        print(f"Proxy error: {e}", flush=True)
        return Response(
            content=f'{{"error": "Proxy error: {str(e)}"}}',
            status_code=500,
            media_type="application/json"
        )

# Root redirect
@app.get("/")
async def root():
    return {"message": "Safe-Spend API", "docs": "/docs"}
