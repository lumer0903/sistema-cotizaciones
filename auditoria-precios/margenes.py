import ast,json
from decimal import Decimal,ROUND_HALF_UP
from pathlib import Path
module=ast.parse(Path('/app/app/main.py').read_text())
fn=next(n for n in module.body if isinstance(n,ast.FunctionDef) and n.name=='calcular_margen')
scope={};exec(compile(ast.Module(body=[fn],type_ignores=[]),'<source-calcular_margen>','exec'),scope)
cases=[]
for price,cost in [(100,80),(100,0),(0,0),(0,10),(10,15),(10,10),(0.03,0.02)]:
 actual=scope['calcular_margen'](price,cost)
 expected=float(((Decimal(str(price))-Decimal(str(cost)))/Decimal(str(price))*100).quantize(Decimal('0.01'),rounding=ROUND_HALF_UP)) if price>0 else None
 cases.append(dict(price=price,cost=cost,actual=actual,expected=expected,passed=actual==expected))
print(json.dumps(cases,indent=2))
