import importlib.util,json,tempfile,unittest
from datetime import datetime,timezone,timedelta
from pathlib import Path
source=Path(__file__).resolve().parents[1]/"server.py"
spec=importlib.util.spec_from_file_location("cowrie_api",source)
api=importlib.util.module_from_spec(spec)
spec.loader.exec_module(api)
class Tests(unittest.TestCase):
    def test_incremental_and_partial(self):
        with tempfile.TemporaryDirectory() as directory:
            d=Path(directory);log=d/"cowrie.json"
            now=datetime.now(timezone.utc).isoformat()
            def record(event,ip):
                return json.dumps({"eventid":event,"timestamp":now,"src_ip":ip})+"\n"
            log.write_text(record("cowrie.session.connect","1.2.3.4"))
            stats=api.Stats(d/"state.db",log)
            self.assertEqual(stats.summary()["lifetime"]["sessions"],1)
            self.assertEqual(stats.summary()["last24h"]["unique_ips"],1)
            with log.open("a") as f: f.write(record("cowrie.login.failed","1.2.3.4")[:-1])
            self.assertEqual(stats.summary()["lifetime"]["login_attempts"],0)
            with log.open("a") as f: f.write("\n")
            self.assertEqual(stats.summary()["lifetime"]["login_attempts"],1)
            self.assertEqual(stats.summary()["lifetime"]["login_attempts"],1)
            stats.conn.close()
            stats=api.Stats(d/"state.db",log)
            self.assertEqual(stats.summary()["lifetime"]["sessions"],1)
if __name__=="__main__":unittest.main()
