# Servidor local exclusivo da demonstracao. Sem vinculo com servidor corporativo.
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from ipaddress import ip_address
from pathlib import Path
import os
from socket import gethostbyname
import webbrowser

BASE = Path(__file__).resolve().parent

class DemoHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('X-Content-Type-Options', 'nosniff')
        super().end_headers()

def main():
    handler = partial(DemoHandler, directory=str(BASE))
    host = gethostbyname('localhost')
    if not ip_address(host).is_loopback:
        raise RuntimeError('localhost nao aponta para um endereco seguro de retorno.')
    with ThreadingHTTPServer((host, 0), handler) as server:
        url = f'http://localhost:{server.server_port}/'
        print(f'Demo ficticia isolada: {url}', flush=True)
        if os.environ.get('PRODPULSE_TEST_NO_BROWSER') != '1':
            webbrowser.open(url)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print('Servidor de demonstracao encerrado.')

if __name__ == '__main__':
    main()
