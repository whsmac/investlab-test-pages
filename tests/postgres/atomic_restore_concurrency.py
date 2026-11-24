#!/usr/bin/env python3
"""Independent psql connections to disposable Docker fixture. No external DB targets."""
import json
import queue
import subprocess
import threading
from contextlib import contextmanager

CMD = ["docker","exec","-i","investlab-restore-concurrency","psql","-X","-qAt","-U","postgres","-d","postgres","-v","ON_ERROR_STOP=1","-v","VERBOSITY=verbose"]
A="11111111-1111-4111-8111-111111111111"
B="22222222-2222-4222-8222-222222222222"
def quote(x):
    return "'" + x.replace("'","''") + "'"
def js(x):
    return "null::jsonb" if x is None else quote(json.dumps(x,separators=(",",":")))+"::jsonb"
def role(owner=A):
    return "set role authenticated; select set_config('restore_fixture.uid',"+quote(owner)+",false); set statement_timeout='5s';\n"
def run(sql,expected=None):
    p=subprocess.run(CMD,input=sql,text=True,capture_output=True,timeout=15)
    if expected:
        if p.returncode==0 or expected not in p.stderr:
            raise AssertionError("Expected SQLSTATE "+expected+": "+p.stderr[-1000:])
    elif p.returncode:
        raise AssertionError(p.stderr[-1500:])
    return p.stdout
def snapshot(owner=A):
    out=run(role(owner)+"""
select jsonb_build_object(
 'ledger',(select jsonb_build_object('payload',payload,'updated_at',updated_at) from restore_fixture.ledger),
 'strategies',(select coalesce(jsonb_object_agg(name,jsonb_build_object('strategies',strategies,'updated_at',updated_at)),'{}'::jsonb) from restore_fixture.strategies)
);
""")
    return json.loads(out.strip().splitlines()[-1])
def ledger(name):
    return {"version":1,"accounts":[{"id":"account","name":name}],"entries":[]}
def restore(s,payload,strategies=None,owner=A):
    return "select restore_fixture.restore_atomic("+",".join([quote(owner)+"::uuid",js(s["ledger"]),js(s["strategies"]),js(payload),js(strategies or {})])+");\n"

@contextmanager
def held_transaction(sql):
    # A live separate psql process holds its transaction open until explicitly released.
    p=subprocess.Popen(CMD,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,bufsize=1)
    lines=queue.Queue()
    def read():
        for line in p.stdout:
            lines.put(line.rstrip())
        lines.put(None)
    threading.Thread(target=read,daemon=True).start()
    try:
        p.stdin.write(role()+"begin;\n"+sql+"\n\\echo HOLDER_READY\n")
        p.stdin.flush()
        for _ in range(30):
            line=lines.get(timeout=10)
            if line=="HOLDER_READY":
                break
            if line is None:
                raise AssertionError("Holder ended before acquiring lock")
        else:
            raise AssertionError("Holder not ready")
        yield
        p.stdin.write("commit;\n\\q\n")
        p.stdin.flush()
        if p.wait(timeout=10):
            raise AssertionError("Holder commit failed")
    finally:
        if p.poll() is None:
            p.terminate()
            try: p.wait(timeout=5)
            except subprocess.TimeoutExpired: p.kill(); p.wait(timeout=5)
        p.stdin.close(); p.stdout.close()

def main():
    b_before=snapshot(B)
    # Case 1: ordinary ledger edit is uncommitted; restore must fail NOWAIT.
    before=snapshot()
    changed=ledger("PC edit")
    with held_transaction("update restore_fixture.ledger set payload="+js(changed)+",updated_at=clock_timestamp() where user_id="+quote(A)+";"):
        run(role()+restore(before,ledger("stale phone restore")),expected="55P03")
        assert snapshot()==before,"uncommitted data visible or rejected restore mutated data"
    after=snapshot()
    assert after["ledger"]["payload"]==changed and after["strategies"]==before["strategies"]
    run(role()+restore(before,ledger("stale phone restore")),expected="40001")
    assert snapshot()==after
    print("PASS: concurrent ledger edit, NOWAIT and stale snapshot rejection")
    # Case 2: ordinary strategy edit competes with a restore.
    before=snapshot()
    with held_transaction("update restore_fixture.strategies set strategies='[{\"name\":\"phone edit\",\"trades\":[]}]',updated_at=clock_timestamp() where user_id="+quote(A)+" and name='keep';"):
        run(role()+restore(before,ledger("blocked PC restore")),expected="55P03")
        assert snapshot()==before
    after=snapshot()
    assert after["ledger"]==before["ledger"] and after["strategies"]["keep"]["strategies"][0]["name"]=="phone edit"
    run(role()+restore(before,ledger("blocked PC restore")),expected="40001")
    assert snapshot()==after
    print("PASS: concurrent strategy edit cannot partially restore ledger")
    # Case 3: two restore requests begin from the same reviewed snapshot.
    before=snapshot()
    first=ledger("first restore")
    with held_transaction(restore(before,first,{"new":[{"name":"first","trades":[]}]})):
        run(role()+restore(before,ledger("second restore")),expected="55P03")
        assert snapshot()==before
    after=snapshot()
    assert after["ledger"]["payload"]==first and "new" in after["strategies"]
    run(role()+restore(before,ledger("second restore")),expected="40001")
    assert snapshot()==after
    print("PASS: first committed restore preserved; competing restore rejected")
    # Case 4: two normal ledger updates using existing optimistic timestamp predicate.
    before=snapshot()
    revision=quote(before["ledger"]["updated_at"])+"::timestamptz"
    run(role()+"update restore_fixture.ledger set payload="+js(ledger("winning edit"))+",updated_at=clock_timestamp() where user_id="+quote(A)+" and updated_at="+revision+";")
    result=run(role()+"with changed as (update restore_fixture.ledger set payload="+js(ledger("losing edit"))+",updated_at=clock_timestamp() where user_id="+quote(A)+" and updated_at="+revision+" returning 1) select count(*) from changed;")
    assert result.strip().splitlines()[-1]=="0"
    assert snapshot()["ledger"]["payload"]==ledger("winning edit")
    assert snapshot(B)==b_before
    print("PASS: optimistic ledger update rejects stale revision; B unchanged")
    # A new review is required before a legitimate retry; no blind retry.
    fresh=snapshot()
    run(role()+restore(fresh,ledger("reviewed retry")))
    assert snapshot()["ledger"]["payload"]==ledger("reviewed retry")
    assert snapshot(B)==b_before
    print("CONCURRENCY_FIXTURE_OK")
if __name__=="__main__":
    main()
