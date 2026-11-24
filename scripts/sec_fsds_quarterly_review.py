#!/usr/bin/env python3
"""SEC Financial Statement Data Sets, TEST review only; never publishes or writes a DB."""
import argparse
import calendar
import csv
import io
import json
import os
import re
import tempfile
import urllib.error
import urllib.request
import zipfile
from collections import defaultdict
from datetime import date
from decimal import Decimal, InvalidOperation
from pathlib import Path
from .sec_quarterly_financials_test import ISSUERS, FORMS, valid_sec_user_agent

BASE = "https://www.sec.gov/files/dera/data/financial-statement-data-sets/"
CIKS = {int(cik): ticker for ticker, (cik, _) in ISSUERS.items()}
REVENUE = {"RevenueFromContractWithCustomerExcludingAssessedTax", "SalesRevenueNet", "Revenues"}
TAGS = {**{t: ("revenue", "IS") for t in REVENUE},
        "OperatingIncomeLoss": ("operating", "IS"),
        "PaymentsToAcquirePropertyPlantAndEquipment": ("capex", "CF")}
FIELDS = {"revenue": "revenue_usd_bn", "operating": "operating_income_usd_bn", "capex": "capex_usd_bn"}
MAX_ZIP = 250 * 1024**2
MAX_MEMBER = 2 * 1024**3


def zip_url(quarter):
    if not re.fullmatch(r"20(?:2[1-9]|[3-9]\d)q[1-4]", quarter):
        raise ValueError("Invalid archive quarter (2021 onward)")
    return BASE + quarter + ".zip"


def compact_date(value):
    if not re.fullmatch(r"\d{8}", value or ""):
        raise ValueError("Invalid SEC date")
    return date(int(value[:4]), int(value[4:6]), int(value[6:]))


def quarter_end(d):
    return d.month in (3, 6, 9, 12) and d.day == calendar.monthrange(d.year, d.month)[1]


def fiscal(ticker, d):
    if ticker == "MSFT":
        return d.year + int(d.month >= 7), ((d.month - 7) % 12) // 3 + 1
    return d.year, (d.month - 1) // 3 + 1


def previous_end(d):
    month = (d.month - 4) % 12 + 1
    year = d.year - int(d.month <= 3)
    return date(year, month, calendar.monthrange(year, month)[1])


def read_table(z, name, required):
    matches = [x for x in z.infolist() if x.filename == name]
    if len(matches) != 1 or matches[0].file_size > MAX_MEMBER:
        raise ValueError("Missing, duplicate or oversized SEC table: " + name)
    with z.open(matches[0]) as raw, io.TextIOWrapper(raw, encoding="utf-8-sig", newline="") as stream:
        rows = csv.DictReader(stream, delimiter="\t", quoting=csv.QUOTE_NONE)
        if not required.issubset(rows.fieldnames or []) or len(set(rows.fieldnames)) != len(rows.fieldnames):
            raise ValueError("SEC schema mismatch: " + name)
        yield from rows


def scan_archive(path, as_of):
    """Only current reporting-period, consolidated, standard GAAP primary statement facts.
    Missing/conflicting observations are left missing; no entity/segment aggregation.
    """
    quarter = Path(path).stem
    url = zip_url(quarter)
    if Path(path).stat().st_size > MAX_ZIP:
        raise ValueError("Oversized archive")
    submissions, facts = {}, defaultdict(set)
    with zipfile.ZipFile(path) as z:
        for row in read_table(z, "sub.txt", {"adsh","cik","form","period","filed","fy","fp"}):
            if not (row["cik"] or "").isdigit():
                continue
            ticker = CIKS.get(int(row["cik"]))
            if not ticker or row["form"] not in FORMS:
                continue
            accession = row["adsh"]
            if not re.fullmatch(r"\d{10}-\d{2}-\d{6}", accession or ""):
                raise ValueError("Malformed SEC accession")
            try:
                end, filed = compact_date(row["period"]), compact_date(row["filed"])
            except ValueError:
                continue
            fy, fq = fiscal(ticker, end)
            expected_fp = "FY" if fq == 4 else f"Q{fq}"
            if not quarter_end(end) or end.year < 2021 or end > filed or filed > as_of:
                continue
            if row["fy"] != str(fy) or row["fp"] != expected_fp:
                continue
            if (row["form"].startswith("10-K")) != (fq == 4):
                continue
            if accession in submissions:
                raise ValueError("Duplicate SEC accession")
            submissions[accession] = (ticker, end, filed, fy, fq)
        presentation = set()
        for row in read_table(z, "pre.txt", {"adsh","tag","version","stmt","inpth"}):
            if row["adsh"] in submissions and row["tag"] in TAGS and row["stmt"] == TAGS[row["tag"]][1] and row["inpth"] == "0":
                presentation.add((row["adsh"], row["tag"], row["version"]))
        for row in read_table(z, "num.txt", {"adsh","tag","version","ddate","qtrs","uom","coreg","segments","value"}):
            accession, tag = row["adsh"], row["tag"]
            if (accession, tag, row["version"]) not in presentation:
                continue
            if not re.fullmatch(r"us-gaap/\d{4}", row["version"] or ""):
                continue
            if row["uom"] != "USD" or row["coreg"] or row["segments"]:
                continue
            ticker, end, filed, fy, fq = submissions[accession]
            if row["ddate"] != end.strftime("%Y%m%d") or row["qtrs"] not in {"1","2","3","4"}:
                continue
            qtrs = int(row["qtrs"])
            if qtrs not in {1, fq}:
                continue
            metric = TAGS[tag][0]
            try:
                value = Decimal(row["value"])
            except (InvalidOperation, TypeError):
                continue
            if not value.is_finite() or abs(value) >= Decimal("1e15"):
                continue
            if metric == "capex" and value < 0 or metric == "revenue" and value <= 0:
                continue
            facts[(ticker, end, filed, accession, fy, fq, metric, qtrs, tag)].add(value)
    # Provenance of every candidate includes archive and original filing.
    return [(key, values, url) for key, values in facts.items()]


def build_preview(paths, as_of):
    paths = list(paths)
    if not paths or len({Path(p).stem for p in paths}) != len(paths):
        raise ValueError("Supply unique SEC quarterly archives")
    candidates = defaultdict(list)
    for path in paths:
        for key, values, url in scan_archive(path, as_of):
            ticker,end,filed,accession,fy,fq,metric,qtrs,tag = key
            candidates[(ticker,end,metric,qtrs)].append((filed,accession,tag,values,url,fy,fq))
    def pick(ticker,end,metric,qtrs):
        group = candidates.get((ticker,end,metric,qtrs), [])
        if not group:
            return None
        latest = max(x[0] for x in group)
        group = [x for x in group if x[0] == latest]
        # Refuse conflicting facts or competing total tags on the latest filing.
        if len({(x[1],x[2]) for x in group}) != 1:
            return None
        vals = set().union(*(x[3] for x in group))
        if len(vals) != 1:
            return None
        filed,acc,tag,_,url,fy,fq = sorted(group,key=lambda x:x[4])[0]
        return next(iter(vals)), {"accession":acc,"tag":tag,"filed":filed.isoformat(),
            "archive_url":url,"period_end":end.isoformat(),"qtrs":qtrs,
            "filing_url":f"https://www.sec.gov/Archives/edgar/data/{int(ISSUERS[ticker][0])}/{acc.replace('-','')}/"}
    rows = []
    for ticker,end in sorted({(k[0],k[1]) for k in candidates}):
        fy,fq = fiscal(ticker,end)
        row = {"ticker":ticker,"period_end":end.isoformat(),"fiscal_period":f"{fy}-Q{fq}",
               "status":"SEC_FSDS_REVIEW_ONLY","provenance":{}}
        for metric,field in FIELDS.items():
            direct = pick(ticker,end,metric,1)
            current = pick(ticker,end,metric,fq) if fq > 1 else None
            prior_end = previous_end(end)
            previous = pick(ticker,prior_end,metric,fq-1) if fq > 1 else None
            value, evidence = None, None
            if direct:
                value, evidence = direct[0], {"mode":"direct","facts":[direct[1]]}
            elif (not candidates.get((ticker,end,metric,1)) and current and previous and fiscal(ticker,prior_end)==(fy,fq-1)
                  and current[1]["tag"]==previous[1]["tag"]
                  and previous[1]["filed"]<=current[1]["filed"]):
                value = current[0]-previous[0]
                evidence = {"mode":"ytd_delta_unreconciled","facts":[current[1],previous[1]]}
            if value is not None and (metric=="capex" and value<0 or metric=="revenue" and value<=0):
                value,evidence=None,None
            row[field]=float(value/Decimal("1000000000")) if value is not None else None
            if evidence:
                row["provenance"][field]=evidence
        if row["revenue_usd_bn"] is None:
            continue
        op,rev=row["operating_income_usd_bn"],row["revenue_usd_bn"]
        row["operating_margin_pct"]=round(op/rev*100,3) if op is not None and rev else None
        rows.append(row)
    # Coverage is per metric; actual filing quarter is distinct from archive quarter.
    coverage={t:{f:sum(r["ticker"]==t and r[f] is not None for r in rows)
                 for f in (*FIELDS.values(),"operating_margin_pct")} for t in ISSUERS}
    return {"format":"INVESTLAB_SEC_FSDS_REVIEW_V1","source":"SEC Financial Statement Data Sets",
            "as_of":as_of.isoformat(),"archives":sorted(Path(p).stem for p in paths),
            "status":"review_only_not_filing_reconciled","database_writes":0,
            "coverage":coverage,"rows":rows}


def download_one(quarter, directory):
    """One official archive request, no retries, no redirects, no contact logging."""
    agent=os.environ.get("INVESTLAB_SEC_USER_AGENT","").strip()
    if not valid_sec_user_agent(agent):
        raise ValueError("CONTACT_INVALID")
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self,*args,**kwargs):
            return None
    request=urllib.request.Request(zip_url(quarter),headers={"User-Agent":agent,"Accept":"application/zip, application/octet-stream"})
    dest=Path(directory)/(quarter+".zip")
    dest.parent.mkdir(parents=True,exist_ok=True)
    if dest.exists():
        raise ValueError("ARCHIVE_ALREADY_EXISTS")
    opener=urllib.request.build_opener(NoRedirect())
    temp=None
    try:
        with opener.open(request,timeout=90) as response, tempfile.NamedTemporaryFile(dir=dest.parent,delete=False) as f:
            temp=Path(f.name)
            if response.status!=200:
                raise ValueError("HTTP_"+str(response.status))
            size=0
            while True:
                chunk=response.read(1024*1024)
                if not chunk:
                    break
                size+=len(chunk)
                if size>MAX_ZIP:
                    raise ValueError("ARCHIVE_TOO_LARGE")
                f.write(chunk)
        if not zipfile.is_zipfile(temp):
            raise ValueError("NOT_A_ZIP")
        with zipfile.ZipFile(temp) as z:
            if not {"sub.txt","num.txt","pre.txt"}.issubset(z.namelist()):
                raise ValueError("INVALID_ARCHIVE")
        os.link(temp,dest)  # do not replace an existing archive
        return dest
    except urllib.error.HTTPError as exc:
        raise ValueError("HTTP_"+str(exc.code)) from None
    except (OSError,urllib.error.URLError):
        raise ValueError("NETWORK_OR_FILE_ERROR") from None
    finally:
        if temp is not None:
            temp.unlink(missing_ok=True)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archives",nargs="*",type=Path)
    parser.add_argument("--download",help="One official archive only, e.g. 2026q3")
    parser.add_argument("--directory",type=Path,default=Path("sec-fsds-downloads"))
    parser.add_argument("--output",type=Path,required=True,help="New review JSON; never a site asset")
    args=parser.parse_args()
    if args.output.exists() or args.output.name=="sec-quarterly-financials.json":
        parser.error("Use a new review filename; existing production/preview assets are protected")
    try:
        if args.download:
            if args.archives:
                parser.error("Download one archive OR review local archives")
            args.archives=[download_one(args.download,args.directory)]
        payload=build_preview(args.archives,date.today())
        with args.output.open("x",encoding="utf-8") as f:
            json.dump(payload,f,ensure_ascii=False,allow_nan=False)
        print(json.dumps({"status":payload["status"],"rows":len(payload["rows"]),"coverage":payload["coverage"]}))
        return 0 if payload["rows"] else 1
    except (ValueError,OSError,zipfile.BadZipFile,UnicodeError,csv.Error) as exc:
        # Only known safe error categories; never print URLs/headers from exceptions.
        code=str(exc) if re.fullmatch(r"(?:HTTP_\d{3}|CONTACT_INVALID|ARCHIVE_ALREADY_EXISTS|ARCHIVE_TOO_LARGE|NOT_A_ZIP|INVALID_ARCHIVE|NETWORK_OR_FILE_ERROR)",str(exc)) else "ARCHIVE_REVIEW_FAILED"
        print(code)
        return 1


if __name__=="__main__":
    raise SystemExit(main())
