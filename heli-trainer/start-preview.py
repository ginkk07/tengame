"""Local preview launcher, using only Python's standard library."""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
import webbrowser
import threading

root = Path(__file__).resolve().parent
handler = partial(SimpleHTTPRequestHandler, directory=str(root))
server = None
for port in range(8770, 8790):
    try:
        server = ThreadingHTTPServer(('127.0.0.1', port), handler)
        break
    except OSError:
        continue
if server is None:
    raise SystemExit('本機預覽連接埠已被使用，請稍後再試。')
url = f'http://127.0.0.1:{server.server_port}/'
print('Ozeti v98 本機預覽：' + url)
print('關閉此視窗即可停止預覽。')
threading.Timer(0.5, lambda: webbrowser.open(url)).start()
try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
finally:
    server.server_close()
