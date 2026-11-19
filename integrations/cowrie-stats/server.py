#!/usr/bin/env python3
import hmac,json,os,sqlite3,threading,ssl
from datetime import datetime,timedelta,timezone
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
KINDS={"cowrie.session.connect":"sessions","cowrie.login.success":"login_success","cowrie.login.failed":"login_failed","cowrie.command.input":"commands","cowrie.session.file_download":"downloads"}

class Stats:
    def __init__(self,db,log):
        self.log=Path(log)
        self.lock=threading.Lock()
        self.conn=sqlite3.connect(db,check_same_thread=False)
        self.conn.execute("CREATE TABLE IF NOT EXISTS state (id INTEGER PRIMARY KEY, inode TEXT, pos INTEGER)")
        self.conn.execute("CREATE TABLE IF NOT EXISTS events (kind TEXT, time TEXT, ip TEXT)")
        self.conn.execute("CREATE INDEX IF NOT EXISTS events_time ON events(time)")
        self.conn.commit()

    def update(self):
        with self.lock:
            stat=self.log.stat()
            ident=str(stat.st_dev)+":"+str(stat.st_ino)
            saved=self.conn.execute("SELECT inode,pos FROM state WHERE id=1").fetchone()
            pos=saved[1] if saved and saved[0]==ident and stat.st_size>=saved[1] else 0
            batch=[]
            with self.log.open("rb") as stream:
                stream.seek(pos)
                while True:
                    raw=stream.readline()
                    if not raw or not raw.endswith(b"\n"): break
                    pos=stream.tell()
                    try:
                        event=json.loads(raw)
                        kind=KINDS.get(event.get("eventid"))
                        stamp=datetime.fromisoformat(event["timestamp"].replace("Z","+00:00"))
                        if kind and stamp.tzinfo:
                            batch.append((kind,stamp.astimezone(timezone.utc).isoformat(),event.get("src_ip")))
                    except (ValueError,KeyError,TypeError): pass
            with self.conn:
                self.conn.executemany("INSERT INTO events VALUES (?,?,?)",batch)
                self.conn.execute("INSERT OR REPLACE INTO state VALUES (1,?,?)",(ident,pos))

    def summary(self):
        self.update()
        cutoff=(datetime.now(timezone.utc)-timedelta(hours=24)).isoformat()
        with self.lock:
            result={}
            for name,where,args in [("lifetime","",()),("last24h","WHERE time >= ?",(cutoff,))]:
                counts=dict(self.conn.execute("SELECT kind,COUNT(*) FROM events "+where+" GROUP BY kind",args))
                unique=self.conn.execute("SELECT COUNT(DISTINCT ip) FROM events "+where+(" AND" if where else " WHERE")+" kind='sessions' AND ip IS NOT NULL",args).fetchone()[0]
                metrics={v:counts.get(v,0) for v in KINDS.values()}
                metrics["login_attempts"]=metrics["login_success"]+metrics["login_failed"]
                metrics["unique_ips"]=unique
                result[name]=metrics
            return result

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if urlsplit(self.path).path!="/api/summary":
            self.send_error(404);return
        if not hmac.compare_digest(self.headers.get("X-API-Key",""),TOKEN):
            self.send_error(401);return
        try:
            payload=json.dumps(STATS.summary(),separators=(",",":")).encode()
        except (OSError,sqlite3.Error):
            self.send_error(503);return
        self.send_response(200)
        self.send_header("Content-Type","application/json")
        self.send_header("Cache-Control","no-store")
        self.send_header("Content-Length",str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)
    def log_message(self,*args): pass

def main():
    global TOKEN,STATS
    TOKEN=os.environ.get("COWRIE_API_TOKEN","")
    if len(TOKEN)<32: raise SystemExit("COWRIE_API_TOKEN must be >=32 characters")
    STATS=Stats(os.environ.get("COWRIE_DB","/data/stats.sqlite3"),os.environ.get("COWRIE_LOG","/cowrie/var/log/cowrie/cowrie.json"))
    context=ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.minimum_version=ssl.TLSVersion.TLSv1_2
    context.load_cert_chain(
        certfile=os.environ.get("COWRIE_TLS_CERT","/certs/server.crt"),
        keyfile=os.environ.get("COWRIE_TLS_KEY","/certs/server.key"),
    )
    server=ThreadingHTTPServer(("0.0.0.0",8765),Handler)
    server.socket=context.wrap_socket(server.socket,server_side=True)
    server.serve_forever()
if __name__=="__main__": main()
