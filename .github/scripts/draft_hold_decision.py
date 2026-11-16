#!/usr/bin/env python3
"""Pure decision logic for the PRIMER semantic DRAFT/HOLD guard."""
from __future__ import annotations
import argparse

HOLD_PREFIXES=("[DRAFT]","[HOLD]")

def should_redraft(*,title:str,state:str,is_draft:bool)->bool:
    if state!="OPEN" or is_draft:
        return False
    return title.startswith(HOLD_PREFIXES)

def main()->int:
    p=argparse.ArgumentParser()
    p.add_argument("--title",required=True)
    p.add_argument("--state",required=True)
    p.add_argument("--is-draft",required=True,choices=["true","false"])
    a=p.parse_args()
    print("REDRAFT" if should_redraft(
        title=a.title,state=a.state,is_draft=a.is_draft=="true"
    ) else "NOOP")
    return 0

if __name__=="__main__":
    raise SystemExit(main())
